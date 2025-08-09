import fs from 'node:fs/promises';
import { parse } from 'csv-parse/sync';

function normEin(e) { return (e || '').toString().replace(/[^0-9]/g, ''); }
function normalizeRow(row) {
  const name  = row.NAME || row.ORG_NAME || row.OrganizationName || row['Organization Name'];
  const ein   = normEin(row.EIN || row.Ein || row['EIN']);
  const city  = row.CITY || row.City || row['City'];
  const state = (row.STATE || row.State || row['State'] || '').toString().toUpperCase();
  const ntee  = (row.NTEE || row['NTEE Code'] || row.NTEE_CD || '').toString().toUpperCase().trim();
  return { name: (name||'').trim(), ein, city: (city||'').trim(), state, ntee };
}
function nteeToCause(ntee) {
  if (!ntee) return '';
  const map = {
    A:'Arts & Culture',B:'Education',C:'Environment',D:'Animal Related',E:'Health Care',
    F:'Mental Health',G:'Voluntary Health Associations',H:'Medical Research',I:'Crime & Legal',
    J:'Employment',K:'Food/Agriculture',L:'Housing & Shelter',M:'Public Safety',
    N:'Recreation & Sports',O:'Youth Development',P:'Human Services',Q:'International Affairs',
    R:'Civil Rights & Advocacy',S:'Community Improvement',T:'Philanthropy/Grantmaking',
    U:'Science & Technology',V:'Social Science',W:'Public & Societal Benefit',X:'Religion',
    Y:'Mutual & Membership Benefit',Z:'Unclassified'
  };
  return map[ntee[0]] || '';
}

(async () => {
  const activeCsv = await fs.readFile('data/irs_active.csv', 'utf8');
  const activeRows = parse(activeCsv, { columns: true, skip_empty_lines: true });
  let list = activeRows.map(normalizeRow).filter(x => x.name && x.ein && x.state);

  try {
    const revCsv = await fs.readFile('data/irs_revoked.csv', 'utf8');
    const revRows = parse(revCsv, { columns: true, skip_empty_lines: true });
    const revoked = new Set(revRows.map(r => normEin(r.EIN || r.Ein || r['EIN'])));
    list = list.filter(x => !revoked.has(x.ein));
  } catch {}

  const seen = new Set();
  list = list.filter(x => (seen.has(x.ein) ? false : (seen.add(x.ein), true)));

  list = list.map(x => ({ ...x, cause: nteeToCause(x.ntee) }));
  list.sort((a,b) => (a.state||'').localeCompare(b.state||'') || a.name.localeCompare(b.name));

  const max = parseInt(process.env.MAX_RECORDS || '20000', 10);
  if (list.length > max) list = list.slice(0, max);

  await fs.writeFile('data/charities_us.json', JSON.stringify(list.map(({ntee, ...rest}) => rest), null, 2));
  await fs.writeFile('data/meta.json', JSON.stringify({ lastRefreshed: new Date().toISOString(), count: list.length }, null, 2));
  console.log('Wrote data/charities_us.json with', list.length, 'records');
})().catch(err => { console.error(err); process.exit(1); });
