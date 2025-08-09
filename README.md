# Impact Finder (Lite) — IRS ZIP Flow
US nationwide, low-admin. The GitHub Action downloads IRS ZIPs, extracts CSVs, builds `data/charities_us.json`, and (optionally) enriches ratings.

## Deploy
1) Create a **public** GitHub repo and upload this folder.
2) Enable **GitHub Pages** (Settings → Pages → Deploy from branch → `main` → `/ (root)`).
3) Visit your site URL.

## Configure Variables (Settings → Secrets and variables → Actions → **Variables**)
- `IRS_ACTIVE_URL` = `https://apps.irs.gov/pub/epostcard/data-download-pub78.zip`
- `IRS_REVOC_URL`  = `https://apps.irs.gov/pub/epostcard/data-download-revocation.zip`
- `MAX_RECORDS`    = `20000` (or your preference)

## (Optional) Secret (Settings → Secrets and variables → Actions → **Secrets**)
- `CN_API_KEY` — Charity Navigator API key (if you want ratings enrichment in the future).

## Run it
- Go to **Actions** → “Refresh US Charities (IRS ZIP Flow)” → **Run workflow**.
- The workflow will:
  1. Download & unzip IRS files
  2. Parse CSVs and generate `data/charities_us.json` + `data/meta.json`
  3. (Optional) Enrich ratings if `CN_API_KEY` is set
  4. Commit changes
- GitHub Pages will republish automatically.

**No scraping.** Uses official IRS downloads.
