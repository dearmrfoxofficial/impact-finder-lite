// Node 18+ required. Run: `node scripts/build-data.mjs`
// Placeholder scaffold that writes data/charities_us.json from a local array.
// Replace with your real fetch/transform from official registries when ready.
import fs from 'node:fs/promises';
import path from 'node:path';

const SAMPLE = [
  { name: 'Utah Food Bank', ein: '87-0212453', city: 'Salt Lake City', state: 'UT', website: 'https://www.utahfoodbank.org/', cause: 'Hunger Relief' }
];

async function main() {
  const out = path.join(process.cwd(), 'data', 'charities_us.json');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(SAMPLE, null, 2));
  console.log('Wrote', out, 'with', SAMPLE.length, 'records');
}
main().catch(err => { console.error(err); process.exit(1); });
