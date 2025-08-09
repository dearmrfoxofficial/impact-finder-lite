import fs from 'node:fs/promises';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';
import { CONFIG } from './config.mjs';

function normEin(e) { return (e || '').toString().replace(/[^0-9]/g, ''); }
function normalizeRow(row) {
  const name  = row.NAME || row.ORG_NAME || row.OrganizationName || row['Organization Name'];
  const ein   = normEin(row.EIN || row.Ein || row['EIN']);
  const city  = row.CITY || row.City || row['City'];
  const state = (row.STATE || row.State || row['State'] || '').toString().toUpperCase();
  const ntee  = (row.NTEE || row['NTEE Code'] || row.NTEE_CD || '').toString().toUpperCase().trim();
  return { name: (name||'').trim(), ein, city: (city||'').trim(), state, ntee };
}
async function fetchCsv(url) {
  if (!url) return [];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const text = await res.text();
  return parse(text, { columns: true, skip_empty_lines: true });
}
function nteeToCause(ntee) {
  if (!ntee) return '';
  const ch = ntee[0];
  const map = {
    'A':'Arts & Culture','B':'Education','C':'Environment','D':'Animal Related','E':'Health Care',
    'F':'Mental Health','G':'Voluntary Health Associations','H':'Medical Research','I':'Crime & Legal',
    'J':'Employment','K':'Food, Agriculture & Nutrition','L':'Housing & Shelter','M':'Public Safety',
    'N':'Recreation & Sports','O':'Youth Development','P':'Human Services','Q':'International, Foreign Affairs',
    'R':'Civil Rights & Advocacy','S':'Community Improvement','T':'Philanthropy, Grantmaking',
    'U':'Science & Technology','V':'Social Science','W':'Public & Societal Benefit','X':'Religion',
    'Y':'Mutual & Membership Benefit','Z':'Unknown/Unclassified'
  };
  return map[ch] || '';
}
(async () => {
  const { IRS_ACTIVE_URL, IRS_REVOC_URL, MAX_RECORDS } = CONFIG;
  if (!IRS_ACTIVE_URL) {
    console.warn('IRS_ACTIVE_URL not set. Skipping fetch.');
    process.exit(0);
  }
  const activeRows = await fetchCsv(IRS_ACTIVE_URL);
  let list = activeRows.map(normalizeRow).filter(x => x.name && x.ein && x.state);
  if (IRS_REVOC_URL) {
    const revocRows = await fetchCsv(IRS_REVOC_URL);
    const revoked = new Set(revocRows.map(r => normEin(r.EIN || r.Ein || r['EIN'])));
    list = list.filter(x => !revoked.has(x.ein));
  }
  const seen = new Set();
  list = list.filter(x => (seen.has(x.ein) ? false : (seen.add(x.ein), true)));
  list = list.map(x => ({ ...x, cause: nteeToCause(x.ntee) }));
  list.sort((a,b) => (a.state||'').localeCompare(b.state||'') || a.name.localeCompare(b.name));
  if (list.length > MAX_RECORDS) list = list.slice(0, MAX_RECORDS);
  await fs.mkdir('data', { recursive: true });
  await fs.writeFile('data/charities_us.json', JSON.stringify(list.map(({ntee, ...rest}) => rest), null, 2));
  await fs.writeFile('data/meta.json', JSON.stringify({
    lastRefreshed: new Date().toISOString(),
    count: list.length
  }, null, 2));
  console.log('Updated charities_us.json with', list.length, 'records');
})().catch(err => { console.error(err); process.exit(1); });
