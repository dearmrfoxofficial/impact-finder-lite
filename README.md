# Impact Finder (Lite)

Free, static website to help people find verified nonprofits and click through to:
- Official website
- Charity Navigator profile (by EIN)
- GlobalGiving project search

## Quick Start
1. **Download this folder** (or the ZIP I provided) and upload to a new public GitHub repository.
2. Turn on **GitHub Pages**:
   - Repo **Settings** → **Pages** → Source = `Deploy from a branch`
   - Branch = `main` (or `master`), Folder = `/ (root)` → **Save**
3. Visit the URL GitHub shows (e.g., `https://<your-username>.github.io/impact-finder-lite/`).

## Customize
- Edit `data/charities_us.json` to add local/regional nonprofits. Keep entries accurate and verified.
- Update the page title and text in `index.html`.
- All search runs in the browser; no backend needed.

## Notes
- We don’t scrape. We link out to official sites, Charity Navigator (by EIN), and a GlobalGiving keyword search.
- The JSON path in `js/app.js` is **relative** (`data/charities_us.json`) so project pages work correctly.

## Optional: Netlify Deploy
- Drag-and-drop the folder at https://app.netlify.com/ to get an instant URL (no GitHub needed).
