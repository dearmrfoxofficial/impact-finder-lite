import fs from 'node:fs/promises';
import fetch from 'node-fetch';
import { CONFIG } from './config.mjs';

(async () => {
  const { CN_API_KEY } = CONFIG;
  if (!CN_API_KEY) {
    console.log('CN_API_KEY not set. Skipping ratings enrichment.');
    return;
  }
  let list = JSON.parse(await fs.readFile('data/charities_us.json', 'utf8'));
  const ratings = {};
  const limited = list.slice(0, 500);
  for (const org of limited) {
    try {
      const url = `https://api.charitynavigator.org/v3/organizations/${encodeURIComponent(org.ein)}`; // Placeholder; check CN docs
      const res = await fetch(url, { headers: { 'Authorization': `apikey ${CN_API_KEY}` } });
      if (res.ok) {
        const data = await res.json();
        ratings[org.ein] = {
          rating: data?.currentRating?.score ?? null,
          ratingLabel: data?.currentRating?.rating ?? null
        };
      }
      await new Promise(r => setTimeout(r, 150));
    } catch {}
  }
  await fs.writeFile('data/ratings.json', JSON.stringify(ratings, null, 2));
  console.log('Wrote ratings for', Object.keys(ratings).length, 'orgs');
})().catch(err => { console.error(err); process.exit(1); });
