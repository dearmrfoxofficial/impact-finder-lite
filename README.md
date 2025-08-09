# Impact Finder (Lite) — Build Script (downloads IRS ZIPs)
This version lets the **Node build script** download & unzip the IRS data directly (no shell unzip step needed).

## Deploy
1) Create a **public** GitHub repo and upload this folder.
2) Enable **GitHub Pages** (Settings → Pages → Deploy from branch → `main` → `/ (root)`).

## Configure Variables (Settings → Secrets and variables → Actions → **Variables**)
- `IRS_ACTIVE_URL` = `https://apps.irs.gov/pub/epostcard/data-download-pub78.zip`
- `IRS_REVOCATIONS_URL` = `https://apps.irs.gov/pub/epostcard/data-download-revocation.zip`
- `MAX_RECORDS` = `20000`

## Run it
- Actions → **Refresh Charity Data** → Run workflow.
- The workflow installs deps, runs `scripts/build-data.mjs`, and commits `data/charities_us.json` + `data/meta.json`.

**No scraping.** Uses official IRS downloads. You can add ratings enrichment later.
