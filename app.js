// Main app script (ES module)
import { el, truncate, debounce } from './src/utils.js';

const API_BASE = 'https://api.jikan.moe/v4';
const searchInput = document.getElementById('searchInput');
const resultsEl = document.getElementById('results');
const favoritesGrid = document.getElementById('favoritesGrid');
const favCount = document.getElementById('fav-count');
const emptySearch = document.getElementById('emptySearch');
const emptyFav = document.getElementById('emptyFav');
const tabSearch = document.getElementById('tab-search');
const tabFav = document.getElementById('tab-fav');
const searchView = document.getElementById('searchView');
const favView = document.getElementById('favView');
const clearBtn = document.getElementById('clearBtn');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalContent = document.getElementById('modalContent');

const suggestionsEl = document.getElementById('suggestions');
const filterType = document.getElementById('filterType');
const filterStatus = document.getElementById('filterStatus');
const autoRefreshToggle = document.getElementById('autoRefreshToggle');
const autoRefreshInterval = document.getElementById('autoRefreshInterval');
const scrollSentinel = document.getElementById('scrollSentinel');

const exportFavsBtn = document.getElementById('exportFavs');
const importFavsBtn = document.getElementById('importFavs');
const importFile = document.getElementById('importFile');

let favs = {}; // id => anime object
const STORAGE_KEY = 'anibuddy_favs_v1';

let lastController = null;
let currentQuery = '';
let currentPage = 1;
let isLoadingPage = false;
let lastResults = [];
let autoRefreshTimer = null;

// --- Favorites storage ---
export function loadFavs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    favs = raw ? JSON.parse(raw) : {};
  } catch (e) {
    favs = {};
  }
  updateFavCount();
}
export function saveFavs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  updateFavCount();
}
function updateFavCount() {
  const n = Object.keys(favs).length;
  favCount.textContent = n;
}

// --- Render helpers ---
function renderCard(anime, container, animate = true) {
  const id = anime.mal_id;
  const card = el('article','card');
  if (animate) card.classList.add('enter');

  const img = anime.images?.jpg?.image_url || anime.images?.webp?.large_image_url || '';
  const poster = el('img','poster',{src: img, alt: anime.title});
  poster.classList.add('poster');
  card.appendChild(poster);

  const content = el('div','content');
  const title = el('h3');
  title.textContent = anime.title;
  content.appendChild(title);

  const meta = el('div','meta');
  const type = el('div');
  type.textContent = anime.type ? `${anime.type}` : '';
  const score = el('div');
  score.textContent = anime.score ? `★ ${anime.score}` : '';
  meta.appendChild(type);
  meta.appendChild(score);
  content.appendChild(meta);

  const synopsis = el('p');
  synopsis.style.color = 'var(--muted)';
  synopsis.style.fontSize = '13px';
  synopsis.style.marginTop = '8px';
  synopsis.textContent = truncate(anime.synopsis || '', 120);
  content.appendChild(synopsis);

  const actions = el('div','actions');
  const detailsBtn = el('button','btn');
  detailsBtn.textContent = 'Details';
  detailsBtn.addEventListener('click', ()=>openModal(anime));
  actions.appendChild(detailsBtn);

  const moreLink = el('a','btn');
  moreLink.textContent = 'MAL';
  moreLink.href = anime.url;
  moreLink.target = '_blank';
  actions.appendChild(moreLink);

  const star = el('div','star');
  star.innerHTML = '☆';
  if (favs[id]) {
    star.classList.add('favorited');
    star.innerHTML = '★';
  }
  star.addEventListener('click', ()=>{
    toggleFav(anime, star);
  });
  actions.appendChild(star);

  content.appendChild(actions);
  card.appendChild(content);
  container.appendChild(card);
}

function clearResults() {
  resultsEl.innerHTML = '';
  currentPage = 1;
  lastResults = [];
}

// --- Favorites functions ---
function toggleFav(anime, starEl) {
  const id = anime.mal_id;
  if (favs[id]) {
    delete favs[id];
    starEl.classList.remove('favorited');
    starEl.innerHTML = '☆';
  } else {
    favs[id] = {
      mal_id: anime.mal_id,
      title: anime.title,
      images: anime.images,
      url: anime.url,
      score: anime.score,
      synopsis: anime.synopsis,
      type: anime.type
    };
    starEl.classList.add('favorited');
    starEl.innerHTML = '★';
  }
  saveFavs();
  renderFavorites();
}

function renderResults(items, append = false) {
  if (!append) resultsEl.innerHTML = '';
  if (!items || items.length === 0) {
    if (!append) emptySearch.style.display = 'block';
    return;
  }
  emptySearch.style.display = 'none';
  items.forEach((it, i) => {
    // small delay for stagger
    setTimeout(()=>renderCard(it, resultsEl, true), i * 25);
  });
}

function renderFavorites() {
  favoritesGrid.innerHTML = '';
  const arr = Object.values(favs);
  if (arr.length === 0) {
    emptyFav.style.display = 'block';
    return;
  }
  emptyFav.style.display = 'none';
  arr.forEach((it, i) => setTimeout(()=>renderCard(it, favoritesGrid, true), i*40));
}

// --- Modal ---
function openModal(anime) {
  modalContent.innerHTML = '';
  const title = el('h2');
  title.textContent = anime.title;
  const img = el('img','poster',{src: anime.images?.jpg?.image_url || '', alt: anime.title});
  img.style.width = '100%';
  img.style.maxHeight = '320px';
  img.style.objectFit = 'cover';
  const p = el('p');
  p.textContent = anime.synopsis || 'No synopsis available.';
  const meta = el('div','meta');
  meta.style.marginTop = '8px';
  meta.innerHTML = `<div>${anime.type || ''}</div><div>Score: ${anime.score || 'N/A'}</div>`;
  const link = el('a','btn');
  link.href = anime.url;
  link.target = '_blank';
  link.textContent = 'Open on MyAnimeList';

  modalContent.appendChild(title);
  modalContent.appendChild(img);
  modalContent.appendChild(meta);
  modalContent.appendChild(p);
  modalContent.appendChild(link);

  modal.setAttribute('aria-hidden','false');
}

modalClose.addEventListener('click', ()=>modal.setAttribute('aria-hidden','true')));
modal.addEventListener('click', (e)=>{ if (e.target === modal) modal.setAttribute('aria-hidden','true') });

// --- Autocomplete suggestions ---
const suggestFetch = debounce((q) => {
  if (!q) {
    suggestionsEl.setAttribute('aria-hidden','true');
    suggestionsEl.innerHTML = '';
    return;
  }
  const url = `${API_BASE}/anime?q=${encodeURIComponent(q)}&limit=6`;
  fetch(url).then(r => r.ok ? r.json() : Promise.reject('network')).then(data=>{
    const items = data.data || [];
    suggestionsEl.innerHTML = '';
    if (items.length === 0) {
      suggestionsEl.setAttribute('aria-hidden','true');
      return;
    }
    items.forEach(it => {
      const item = el('div','item');
      item.textContent = it.title;
      item.addEventListener('click', () => {
        searchInput.value = it.title;
        doSearch(it.title, false);
        suggestionsEl.setAttribute('aria-hidden','true');
      });
      suggestionsEl.appendChild(item);
    });
    suggestionsEl.setAttribute('aria-hidden','false');
  }).catch(()=>{
    suggestionsEl.setAttribute('aria-hidden','true');
  });
}, 240);

// --- Search / pagination / infinite scroll ---
function buildQueryUrl(q, page = 1) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('limit', '24');
  params.set('page', String(page));
  const type = filterType.value;
  if (type) params.set('type', type);
  const status = filterStatus.value;
  if (status) params.set('status', status);
  return `${API_BASE}/anime?${params.toString()}`;
}

function doSearch(q, reset = true) {
  q = (q||'').trim();
  // cancel previous
  if (lastController) {
    try { lastController.abort(); } catch(e){}
    lastController = null;
  }
  if (reset) {
    clearResults();
    currentPage = 1;
  }
  currentQuery = q;
  if (!q) {
    resultsEl.innerHTML = '';
    emptySearch.style.display = 'block';
    return;
  }
  emptySearch.style.display = 'none';
  if (!reset) {
    // append loading marker
    const loading = el('div','empty');
    loading.textContent = 'Loading more…';
    resultsEl.appendChild(loading);
  } else {
    resultsEl.innerHTML = '<div class="empty">Searching…</div>';
  }

  isLoadingPage = true;
  const ctrl = new AbortController();
  lastController = ctrl;

  const url = buildQueryUrl(q, currentPage);
  fetch(url, {signal: ctrl.signal})
    .then(r => { if (!r.ok) throw new Error('Network response not ok'); return r.json() })
    .then(data => {
      lastController = null;
      const items = data.data || [];
      if (reset) {
        resultsEl.innerHTML = '';
        lastResults = items;
        renderResults(items, false);
      } else {
        // append
        renderResults(items, true);
        lastResults = lastResults.concat(items);
      }
      // cache last results
      try { localStorage.setItem('anibuddy_last_results', JSON.stringify(lastResults)); } catch(e){}
      isLoadingPage = false;
    })
    .catch(err => {
      isLoadingPage = false;
      if (err.name === 'AbortError') return;
      const cached = localStorage.getItem('anibuddy_last_results');
      if (cached) {
        try {
          const items = JSON.parse(cached);
          resultsEl.innerHTML = '';
          renderResults(items, false);
        } catch(e){}
      } else {
        resultsEl.innerHTML = `<div class="empty">Search failed. Check your connection or try again later.</div>`;
      }
    });
}

// IntersectionObserver for infinite scroll
const sentinelObserver = new IntersectionObserver(entries => {
  for (const ent of entries) {
    if (ent.isIntersecting && currentQuery && !isLoadingPage) {
      currentPage += 1;
      doSearch(currentQuery, false);
    }
  }
}, {rootMargin: '200px'});
sentinelObserver.observe(scrollSentinel);

// --- Auto-refresh (polling) ---
function startAutoRefresh() {
  stopAutoRefresh();
  const sec = Math.max(10, parseInt(autoRefreshInterval.value, 10) || 60);
  autoRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    if (currentQuery) doSearch(currentQuery, true);
  }, sec * 1000);
}
function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// --- Export / import favorites ---
exportFavsBtn?.addEventListener('click', () => {
  const dataStr = JSON.stringify(favs, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'anibuddy_favorites.json';
  a.click();
  URL.revokeObjectURL(url);
});
importFavsBtn?.addEventListener('click', () => importFile.click());
importFile?.addEventListener('change', (e) => {
  const f = (e.target.files||[])[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      favs = {...favs, ...obj};
      saveFavs();
      renderFavorites();
      alert('Favorites imported.');
    } catch (err) {
      alert('Invalid file.');
    }
  };
  reader.readAsText(f);
});

// --- DOM events ---
searchInput.addEventListener('input', (e)=>{
  const q = e.target.value;
  suggestFetch(q);
  debouncedSearch(q);
});
const debouncedSearch = debounce((q) => doSearch(q, true), 420);
clearBtn.addEventListener('click', ()=>{
  searchInput.value = '';
  searchInput.focus();
  doSearch('');
  suggestionsEl.setAttribute('aria-hidden','true');
});

filterType.addEventListener('change', () => { if (currentQuery) doSearch(currentQuery, true); });
filterStatus.addEventListener('change', () => { if (currentQuery) doSearch(currentQuery, true); });

autoRefreshToggle.addEventListener('change', () => {
  if (autoRefreshToggle.checked) startAutoRefresh(); else stopAutoRefresh();
});
autoRefreshInterval.addEventListener('change', () => {
  if (autoRefreshToggle.checked) startAutoRefresh();
});

// Tabs
tabSearch.addEventListener('click', ()=>{
  tabSearch.classList.add('active'); tabFav.classList.remove('active');
  searchView.classList.add('active'); favView.classList.remove('active');
});
tabFav.addEventListener('click', ()=>{
  tabFav.classList.add('active'); tabSearch.classList.remove('active');
  favView.classList.add('active'); searchView.classList.remove('active');
  renderFavorites();
});

// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(()=>{/* ignore */});
}

// Startup
loadFavs();
renderFavorites();
const params = new URLSearchParams(location.search);
if (params.get('q')) {
  searchInput.value = params.get('q');
  doSearch(params.get('q'), true);
               }
