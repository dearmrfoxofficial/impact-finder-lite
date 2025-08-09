// scripts/build-data.mjs
// Node 18+
// Env: IRS_ACTIVE_URL, IRS_REVOCATIONS_URL (or IRS_REVOC_URL), MAX_RECORDS
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

function nteeToCause(ntee) {
  if (!ntee) return "";
  const m = {
    A:"Arts & Culture",B:"Education",C:"Environment",D:"Animal Related",E:"Health Care",
    F:"Mental Health",G:"Voluntary Health Associations",H:"Medical Research",I:"Crime & Legal",
    J:"Employment",K:"Food/Agriculture",L:"Housing & Shelter",M:"Public Safety",
    N:"Recreation & Sports",O:"Youth Development",P:"Human Services",Q:"International Affairs",
    R:"Civil Rights & Advocacy",S:"Community Improvement",T:"Philanthropy/Grantmaking",
    U:"Science & Technology",V:"Social Science",W:"Public & Societal Benefit",X:"Religion",
    Y:"Mutual & Membership Benefit",Z:"Unclassified"
  };
  return m[ntee[0]] || "";
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
  // grab the first CSV inside
  const entry = zip.files.find(f => f.path.toLowerCase().endsWith(".csv")) || zip.files[0];
  if (!entry) throw new Error("ZIP did not contain any files.");
  const content = await entry.buffer();
  return content.toString("utf8");
}

// robust parser: prefers '|' if present, no header, relax column counts
function parseDelimited(text, preferPipe = true) {
  const sample = text.slice(0, 2000);
  const usePipe = preferPipe || (sample.includes("|") && !sample.includes(","));
  const delimiter = usePipe ? "|" : ",";
  // For Pub78-style files (no header). Define minimal columns we care about.
  const cols = ["EIN","NAME","CITY","STATE","COUNTRY","EXTRA1","EXTRA2","EXTRA3"];
  return parse(text, {
    delimiter,
    columns: cols,       // assign positions to names
    relax_column_count: true,
    trim: true,
    skip_empty_lines: true
  });
}

function normalizeRow(row) {
  // Some datasets won’t have NTEE; that’s fine. We enrich cause only if present.
  const name  = (row.NAME || "").trim();
  const ein   = normEin(row.EIN);
  const city  = (row.CITY || "").trim();
  const state = (row.STATE || "").toString().trim().toUpperCase();
  // If your active file includes NTEE in a different feed, you can carry it via EXTRA fields.
  const ntee  = (row.NTEE || row.EXTRA1 || "").toString().trim().toUpperCase();
  return { name, ein, city, state, ntee };
}

async function main() {
  console.log("Downloading IRS active file…");
  const activeCsv = await csvTextFromUrl(ACTIVE_URL);
  const activeRows = parseDelimited(activeCsv, true); // IRS pub78 is pipe-delimited

  console.log("Normalizing active records…");
  let list = activeRows
    .map(normalizeRow)
    .filter(x => x.name && x.ein && x.state && x.state.length === 2);

  // Exclude revoked if provided
  if (REVOC_URL) {
    console.log("Downloading IRS revocations file…");
    const revCsv = await csvTextFromUrl(REVOC_URL);
    const revRows = parseDelimited(revCsv, true);
    const revoked = new Set(revRows.map(r => normEin(r.EIN)));
    const before = list.length;
    list = list.filter(x => !revoked.has(x.ein));
    console.log(`Excluded revoked: ${before - list.length}`);
  }

  // Deduplicate by EIN
  const seen = new Set();
  list = list.filter(x => (seen.has(x.ein) ? false : (seen.add(x.ein), true)));

  // Enrich cause from first letter of NTEE if present
  list = list.map(x => ({ ...x, cause: nteeToCause(x.ntee) }));

  // Sort & cap
  list.sort((a, b) => (a.state || "").localeCompare(b.state || "") || a.name.localeCompare(b.name));
  if (list.length > MAX) list = list.slice(0, MAX);

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile("data/charities_us.json", JSON.stringify(list.map(({ ntee, ...rest }) => rest), null, 2));
  await fs.writeFile("data/meta.json", JSON.stringify({
    lastRefreshed: new Date().toISOString(),
    count: list.length
  }, null, 2));

  console.log(`Wrote data/charities_us.json with ${list.length} records`);
}

main().catch(err => { console.error(err); process.exit(1); });
