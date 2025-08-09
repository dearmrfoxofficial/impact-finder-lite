# Impact Finder (Lite) — Automated (US Nationwide)
Free, static website to help people find verified nonprofits. Includes a **GitHub Actions** pipeline to refresh US data from official registries and enrich it (taxonomy + optional ratings).

## Deploy (GitHub Pages)
1. Create a new **public** repo, upload all files, and commit.
2. Repo **Settings → Pages** → Source: `Deploy from a branch`, Branch: `main`, Folder: `/ (root)`.
3. Visit the published URL (e.g., `https://<user>.github.io/impact-finder-lite/`).

## Configure automation
- Repo **Settings → Secrets and variables → Actions**:
  - Variables:
    - `IRS_ACTIVE_URL` — CSV/JSON for *active* exempt orgs (US)
    - `IRS_REVOC_URL`  — CSV/JSON for *revocations* (optional)
    - `MAX_RECORDS`    — cap results (default 20000)
  - Secrets (optional):
    - `CN_API_KEY` — Charity Navigator API key (skip if you don’t have one)
- Go to **Actions** tab → run “Refresh US Charities” once to test.
- The workflow also runs nightly (06:00 UTC).

## Files
- Frontend: `index.html`, `js/app.js`, `data/charities_us.json`, `data/meta.json`
- Scripts: `scripts/config.mjs`, `scripts/fetch-us-irs.mjs`, `scripts/enrich.mjs`
- Workflow: `.github/workflows/refresh.yml`

**No scraping.** Uses official registries and outbound links. Keep the site fast and simple.
