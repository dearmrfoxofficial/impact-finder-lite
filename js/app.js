const grid = document.getElementById('grid');
const q = document.getElementById('q');
const stateSel = document.getElementById('state');
const resultMeta = document.getElementById('resultMeta');
const clearBtn = document.getElementById('clearBtn');
const lastRef = document.getElementById('lastRef');

let DATA = [];
let fuse;

function fmtState(s) { return s || '—'; }
function cnUrlFromEIN(ein) { return `https://www.charitynavigator.org/ein/${encodeURIComponent(ein)}`; }
function ggSearchUrl(name) { return `https://www.globalgiving.org/search/?size=10&nextPage=1&sortField=sortorder&keywords=${encodeURIComponent(name)}`; }

function render(items) {
  grid.innerHTML = '';
  if (!items || items.length === 0) {
    resultMeta.textContent = 'No results.';
    return;
  }
  resultMeta.textContent = `${items.length} result${items.length !== 1 ? 's' : ''}`;
  for (const org of items) {
    const card = document.createElement('div');
    card.className = 'card';
    const h3 = document.createElement('h3');
    h3.textContent = org.name;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${org.city || ''}${org.city && org.state ? ', ' : ''}${fmtState(org.state)} • EIN: ${org.ein || '—'}`;
    const links = document.createElement('div');
    links.className = 'links';
    if (org.website) { const a = document.createElement('a'); a.href = org.website; a.target = '_blank'; a.rel = 'noopener'; a.className = 'link'; a.textContent = 'Official Site'; links.appendChild(a); }
    if (org.ein) { const a = document.createElement('a'); a.href = cnUrlFromEIN(org.ein); a.target = '_blank'; a.rel = 'noopener'; a.className = 'link'; a.textContent = 'Charity Navigator'; links.appendChild(a); }
    const gg = document.createElement('a'); gg.href = ggSearchUrl(org.name); gg.target = '_blank'; gg.rel = 'noopener'; gg.className = 'link'; gg.textContent = 'Find Projects on GlobalGiving'; links.appendChild(gg);
    card.appendChild(h3);
    if (org.cause) { const cause = document.createElement('div'); cause.className = 'pill'; cause.textContent = org.cause; card.appendChild(cause); }
    card.appendChild(meta);
    card.appendChild(links);
    grid.appendChild(card);
  }
}

function applyFilters() {
  const text = q.value.trim();
  const st = stateSel.value;
  let list = DATA;
  if (text) list = new Fuse(DATA, { keys: ['name','city','state','ein','cause'], threshold: 0.3 }).search(text).map(r=>r.item);
  if (st) list = list.filter(x => (x.state || '').toUpperCase() === st);
  render(list);
}

async function init() {
  try {
    const [dataRes, metaRes] = await Promise.all([ fetch('data/charities_us.json?v=' + Date.now())
, fetch('data/meta.json?v=' + Date.now()) ]);
    DATA = await dataRes.json();
    const meta = await metaRes.json().catch(()=>({}));
    lastRef.textContent = meta?.lastRefreshed || '—';
    const states = Array.from(new Set(DATA.map(x => (x.state || '').toUpperCase()).filter(Boolean))).sort();
    for (const s of states) { const opt = document.createElement('option'); opt.value = s; opt.textContent = s; stateSel.appendChild(opt); }
    fuse = new Fuse(DATA, { keys: ['name','city','state','ein','cause'], threshold: 0.3 });
    render(DATA);
  } catch (e) { console.error(e); resultMeta.textContent = 'Failed to load data.'; }
}

q.addEventListener('input', applyFilters);
stateSel.addEventListener('change', applyFilters);
clearBtn.addEventListener('click', () => { q.value = ''; stateSel.value = ''; applyFilters(); });
init();
