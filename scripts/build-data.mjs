// scripts/build-data.mjs
// Node 18+
// Env from workflow: IRS_ACTIVE_URL, IRS_REVOCATIONS_URL (or IRS_REVOC_URL), MAX_RECORDS
import fs from "node:fs/promises";
import fetch from "node-fetch";
import { parse } from "csv-parse/sync";
import unzipper from "unzipper";

const ACTIVE_URL = process.env.IRS_ACTIVE_URL || "";
const REVOC_URL  = process.env.IRS_REVOCATIONS_URL || process.env.IRS_REVOC_URL || "";
const MAX        = parseInt(process.env.MAX_RECORDS || "20000", 10);

if (!ACTIVE_URL) {
  console.error("IRS_ACTIVE_URL not set.");
  process.exit(1);
}

function normEin(e) { return (e || "").toString().replace(/[^0-9]/g, ""); }

function normalizeRow(row) {
  const name  = row.NAME || row.ORG_NAME || row.OrganizationName || row["Organization Name"];
  const ein   = normEin(row.EIN || row.Ein || row["EIN"]);
  const city  = row.CITY || row.City || row["City"];
  const state = (row.STATE || row.State || row["State"] || "").toString().toUpperCase();
  const ntee  = (row.NTEE || row["NTEE Code"] || row.NTEE_CD || "").toString().toUpperCase().trim();
  return { name: (name || "").trim(), ein, city: (city || "").trim(), state, ntee };
}

function nteeToCause(ntee) {
  if (!ntee) return "";
  const map = {
    A:"Arts & Culture",B:"Education",C:"Environment",D:"Animal Related",E:"Health Care",
    F:"Mental Health",G:"Voluntary Health Associations",H:"Medical Research",I:"Crime & Legal",
    J:"Employment",K:"Food/Agriculture",L:"Housing & Shelter",M:"Public Safety",
    N:"Recreation & Sports",O:"Youth Development",P:"Human Services",Q:"International Affairs",
    R:"Civil Rights & Advocacy",S:"Community Improvement",T:"Philanthropy/Grantmaking",
    U:"Science & Technology",V:"Social Science",W:"Public & Societal Benefit",X:"Religion",
    Y:"Mutual & Membership Benefit",Z:"Unclassified"
  };
  return map[ntee[0]] || "";
}

async function downloadToBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function csvTextFromUrl(url) {
  const buf = await downloadToBuffer(url);
  const looksZip = url.toLowerCase().endsWith(".zip") || (buf[0] === 0x50 && buf[1] === 0x4b); // PK
  if (!looksZip) return buf.toString("utf8");
  const zip = await unzipper.Open.buffer(buf);
  const csvEntry = zip.files.find(f => f.path.toLowerCase().endsWith(".csv")) || zip.files[0];
  if (!csvEntry) throw new Error("ZIP did not contain any files.");
  const content = await csvEntry.buffer();
  return content.toString("utf8");
}

async function main() {
  console.log("Downloading IRS active file…");
  const activeCsv = await csvTextFromUrl(ACTIVE_URL);
  const activeRows = parse(activeCsv, { columns: true, skip_empty_lines: true });

  console.log("Normalizing active records…");
  let list = activeRows.map(normalizeRow).filter(x => x.name && x.ein && x.state);

  if (REVOC_URL) {
    console.log("Downloading IRS revocations file…");
    const revCsv = await csvTextFromUrl(REVOC_URL);
    const revRows = parse(revCsv, { columns: true, skip_empty_lines: true });
    const revoked = new Set(revRows.map(r => normEin(r.EIN || r.Ein || r["EIN"])));
    const before = list.length;
    list = list.filter(x => !revoked.has(x.ein));
    console.log(`Excluded revoked: ${before - list.length}`);
  }

  const seen = new Set();
  list = list.filter(x => (seen.has(x.ein) ? false : (seen.add(x.ein), true)));

  list = list.map(x => ({ ...x, cause: nteeToCause(x.ntee) }));
  list.sort((a,b) => (a.state||"").localeCompare(b.state||"") || a.name.localeCompare(b.name));
  if (list.length > MAX) list = list.slice(0, MAX);

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile("data/charities_us.json", JSON.stringify(list.map(({ ntee, ...rest }) => rest), null, 2));
  await fs.writeFile("data/meta.json", JSON.stringify({ lastRefreshed: new Date().toISOString(), count: list.length }, null, 2));
  console.log(`Wrote data/charities_us.json with ${list.length} records`);
}

main().catch(err => { console.error(err); process.exit(1); });
