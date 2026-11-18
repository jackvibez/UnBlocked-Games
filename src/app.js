const STORAGE_KEYS = {
  favorites: 'arcadevault_favorites_v1',
  recent: 'arcadevault_recent_v1',
  customGames: 'arcadevault_custom_games_v1',
};

const state = {
  baseGames: [],
  customGames: loadStoredArray(STORAGE_KEYS.customGames),
  favorites: new Set(loadStoredArray(STORAGE_KEYS.favorites)),
  recentIds: loadStoredArray(STORAGE_KEYS.recent),
  activeView: 'browse',
  activeCategory: 'All',
  searchQuery: '',
  activeGameId: null,
  loading: true,
  loadError: '',
};

const els = {
  brandLink: document.getElementById('brandLink'),
  navButtons: Array.from(document.querySelectorAll('.nav-link[data-view]')),
  openJsonBtn: document.getElementById('openJsonBtn'),
  openAddGameBtn: document.getElementById('openAddGameBtn'),
  catalogView: document.getElementById('catalogView'),
  heroSection: document.getElementById('heroSection'),
  heroTitle: document.getElementById('heroTitle'),
  heroDescription: document.getElementById('heroDescription'),
  heroMeta: document.getElementById('heroMeta'),
  heroImage: document.getElementById('heroImage'),
  heroPlayBtn: document.getElementById('heroPlayBtn'),
  heroSurpriseBtn: document.getElementById('heroSurpriseBtn'),
  catalogHeading: document.getElementById('catalogHeading'),
  catalogCount: document.getElementById('catalogCount'),
  searchInput: document.getElementById('searchInput'),
  categoryTabs: Array.from(document.querySelectorAll('#categoryTabs .filter-tab')),
  catalogStatus: document.getElementById('catalogStatus'),
  gamesGrid: document.getElementById('gamesGrid'),
  playerSection: document.getElementById('playerSection'),
  backToCatalogBtn: document.getElementById('backToCatalogBtn'),
  playerTitle: document.getElementById('playerTitle'),
  playerMeta: document.getElementById('playerMeta'),
  playerFavoriteBtn: document.getElementById('playerFavoriteBtn'),
  playerFavoriteLabel: document.getElementById('playerFavoriteLabel'),
  reloadGameBtn: document.getElementById('reloadGameBtn'),
  inspectIframeBtn: document.getElementById('inspectIframeBtn'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  iframeStage: document.getElementById('iframeStage'),
  iframeMount: document.getElementById('iframeMount'),
  iframeInspector: document.getElementById('iframeInspector'),
  iframeInspectorCode: document.getElementById('iframeInspectorCode'),
  copyEntryJsonBtn: document.getElementById('copyEntryJsonBtn'),
  jsonModal: document.getElementById('jsonModal'),
  jsonCatalogPreview: document.getElementById('jsonCatalogPreview'),
  copyAllJsonBtn: document.getElementById('copyAllJsonBtn'),
  downloadJsonBtn: document.getElementById('downloadJsonBtn'),
  addGameModal: document.getElementById('addGameModal'),
  addGameForm: document.getElementById('addGameForm'),
  gameTitleInput: document.getElementById('gameTitleInput'),
  gameCategoryInput: document.getElementById('gameCategoryInput'),
  gameControlsInput: document.getElementById('gameControlsInput'),
  gameIframeInput: document.getElementById('gameIframeInput'),
  gameDescInput: document.getElementById('gameDescInput'),
  addGameError: document.getElementById('addGameError'),
};

function loadStoredArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredArray(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota issues cleanly
  }
}

function getAllGames() {
  return [...state.baseGames, ...state.customGames];
}

function findGameById(id) {
  return getAllGames().find((game) => game.id === id) || null;
}

function getFilteredGames() {
  const all = getAllGames();
  let list = all;

  if (state.activeView === 'favorites') {
    list = all.filter((g) => state.favorites.has(g.id));
  } else if (state.activeView === 'recent') {
    const map = new Map(all.map((g) => [g.id, g]));
    list = state.recentIds.map((id) => map.get(id)).filter(Boolean);
  }

  if (state.activeCategory !== 'All') {
    list = list.filter((g) => g.category === state.activeCategory);
  }

  const q = state.searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
    );
  }

  return list;
}

function updateHero() {
  const all = getAllGames();
  const featured = all.find((g) => g.featured) || all[0];
  if (!featured) {
    els.heroSection.hidden = true;
    return;
  }

  els.heroSection.hidden = state.activeView !== 'browse';
  els.heroTitle.textContent = featured.title;
  els.heroDescription.textContent = featured.description;
  els.heroMeta.textContent = `${featured.category} · ${featured.controls}`;
  els.heroImage.src = featured.thumbnail || '';
  els.heroImage.alt = `${featured.title} cover art`;
  els.heroImage.style.display = featured.thumbnail ? 'block' : 'none';
  els.heroImage.onerror = () => {
    els.heroImage.style.display = 'none';
  };
  els.heroPlayBtn.dataset.gameId = featured.id;
}

function renderCatalog() {
  const games = getFilteredGames();
  const viewHeadingMap = {
    browse: 'All Games',
    favorites: 'Favorite Games',
    recent: 'Recently Played',
  };

  els.catalogHeading.textContent =
    state.activeCategory === 'All'
      ? viewHeadingMap[state.activeView] || 'All Games'
      : `${state.activeCategory} Games`;

  els.catalogCount.textContent = `${games.length} ${games.length === 1 ? 'game' : 'games'}`;
  els.gamesGrid.innerHTML = '';

  if (state.loading) {
    els.catalogStatus.hidden = false;
    els.catalogStatus.innerHTML = '<h3>Loading games catalog</h3><p>Reading iframe definitions from games.json...</p>';
    return;
  }

  if (state.loadError) {
    els.catalogStatus.hidden = false;
    els.catalogStatus.innerHTML = `<h3>Unable to load games.json</h3><p>${escapeHtml(state.loadError)}</p>`;
    return;
  }

  if (games.length === 0) {
    els.catalogStatus.hidden = false;
    const emptyMessage =
      state.activeView === 'favorites'
        ? 'Mark any game with the heart button to save it here.'
        : state.activeView === 'recent'
          ? 'Launch a game from the catalog to build your recent history.'
          : 'Try clearing your search filter or choosing another category.';

    els.catalogStatus.innerHTML = `
      <h3>No matching games</h3>
      <p>${emptyMessage}</p>
      <button type="button" class="btn-secondary" id="resetFiltersBtn">Show All Games</button>
    `;
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.activeView = 'browse';
        state.activeCategory = 'All';
        state.searchQuery = '';
        els.searchInput.value = '';
        syncNavAndTabs();
        renderCatalog();
        updateHero();
      });
    }
    return;
  }

  els.catalogStatus.hidden = true;
  const fragment = document.createDocumentFragment();

  for (const game of games) {
    const card = document.createElement('article');
    card.className = 'game-card';

    const isFav = state.favorites.has(game.id);
    const isCustom = Boolean(game.custom);

    const thumbBtn = document.createElement('button');
    thumbBtn.type = 'button';
    thumbBtn.className = 'card-thumb-btn';
    thumbBtn.setAttribute('aria-label', `Play ${game.title}`);
    thumbBtn.addEventListener('click', () => openGame(game.id));

    const fallback = document.createElement('div');
    fallback.className = 'media-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.innerHTML = `
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="2" y="6" width="20" height="12" rx="2"></rect>
        <path d="M6 12h4"></path>
        <path d="M8 10v4"></path>
        <circle cx="15" cy="11" r="1"></circle>
        <circle cx="17" cy="13" r="1"></circle>
      </svg>
    `;
    thumbBtn.appendChild(fallback);

    if (game.thumbnail) {
      const img = document.createElement('img');
      img.src = game.thumbnail;
      img.alt = `${game.title} cover`;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        img.remove();
      });
      thumbBtn.appendChild(img);
    }

    const scrim = document.createElement('div');
    scrim.className = 'card-play-scrim';
    scrim.innerHTML = '<span class="card-play-label">Play Game</span>';
    thumbBtn.appendChild(scrim);

    const body = document.createElement('div');
    body.className = 'card-body';

    const titleRow = document.createElement('div');
    titleRow.className = 'card-title-row';

    const h3 = document.createElement('h3');
    h3.className = 'card-title';
    const titleBtn = document.createElement('button');
    titleBtn.type = 'button';
    titleBtn.className = 'card-title-btn';
    titleBtn.textContent = game.title;
    titleBtn.addEventListener('click', () => openGame(game.id));
    h3.appendChild(titleBtn);
    titleRow.appendChild(h3);

    const meta = document.createElement('p');
    meta.className = 'card-meta';
    meta.textContent = `${game.category} · ${game.controls}${isCustom ? ' · Custom' : ''}`;

    const desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = game.description;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'btn-secondary btn-sm';
    playBtn.textContent = 'Play';
    playBtn.addEventListener('click', () => openGame(game.id));

    const actionsRight = document.createElement('div');
    actionsRight.className = 'card-actions-right';

    if (isCustom) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-btn';
      removeBtn.setAttribute('aria-label', `Remove ${game.title}`);
      removeBtn.title = 'Remove custom game';
      removeBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      `;
      removeBtn.addEventListener('click', () => removeCustomGame(game.id));
      actionsRight.appendChild(removeBtn);
    }

    const favBtn = document.createElement('button');
    favBtn.type = 'button';
    favBtn.className = `fav-btn${isFav ? ' is-favorited' : ''}`;
    favBtn.setAttribute('aria-label', isFav ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`);
    favBtn.setAttribute('aria-pressed', String(isFav));
    favBtn.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
      </svg>
    `;
    favBtn.addEventListener('click', () => toggleFavorite(game.id));
    actionsRight.appendChild(favBtn);

    actions.appendChild(playBtn);
    actions.appendChild(actionsRight);

    body.appendChild(titleRow);
    body.appendChild(meta);
    body.appendChild(desc);
    body.appendChild(actions);

    card.appendChild(thumbBtn);
    card.appendChild(body);
    fragment.appendChild(card);
  }

  els.gamesGrid.appendChild(fragment);
}

function buildIframeElement(game) {
  const cfg = game.iframe || {};
  const iframe = document.createElement('iframe');
  iframe.title = cfg.title || game.title;
  iframe.width = cfg.width || '100%';
  iframe.height = cfg.height || '100%';
  iframe.loading = 'eager';
  if (cfg.allow) {
    iframe.setAttribute('allow', cfg.allow);
  }
  if (cfg.sandbox) {
    iframe.setAttribute('sandbox', cfg.sandbox);
  }
  iframe.setAttribute('allowfullscreen', '');

  if (cfg.srcdoc) {
    iframe.srcdoc = cfg.srcdoc;
  } else if (cfg.src) {
    iframe.src = cfg.src;
  }

  return iframe;
}

function openGame(gameId, updateHash = true) {
  const game = findGameById(gameId);
  if (!game) return;

  state.activeGameId = game.id;
  recordRecent(game.id);

  els.catalogView.hidden = true;
  els.playerSection.hidden = false;
  els.iframeInspector.hidden = true;

  els.playerTitle.textContent = game.title;
  els.playerMeta.textContent = `${game.category} · ${game.controls}`;
  syncPlayerFavoriteButton(game.id);

  els.iframeMount.innerHTML = '';
  const iframeEl = buildIframeElement(game);
  els.iframeMount.appendChild(iframeEl);

  const markupPreview = `<iframe\n  src="${escapeHtml(game.iframe?.src || '')}"\n  title="${escapeHtml(game.iframe?.title || game.title)}"\n  width="${escapeHtml(game.iframe?.width || '100%')}"\n  height="${escapeHtml(game.iframe?.height || '100%')}"\n  sandbox="${escapeHtml(game.iframe?.sandbox || 'allow-scripts allow-same-origin')}"\n  allowfullscreen\n></iframe>`;

  els.iframeInspectorCode.textContent = `${JSON.stringify(game, null, 2)}\n\n<!-- Rendered HTML Iframe -->\n${markupPreview}`;

  if (updateHash) {
    history.replaceState(null, '', `#play=${encodeURIComponent(game.id)}`);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  iframeEl.focus();
}

function closeGame(updateHash = true) {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  state.activeGameId = null;
  els.iframeMount.innerHTML = '';
  els.playerSection.hidden = true;
  els.catalogView.hidden = false;
  if (updateHash) {
    history.replaceState(null, '', '#browse');
  }
  renderCatalog();
}

function syncPlayerFavoriteButton(gameId) {
  const isFav = state.favorites.has(gameId);
  els.playerFavoriteBtn.setAttribute('aria-pressed', String(isFav));
  els.playerFavoriteLabel.textContent = isFav ? 'Favorited' : 'Favorite';
  const svg = els.playerFavoriteBtn.querySelector('svg');
  if (svg) {
    svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
  }
}

function toggleFavorite(gameId) {
  if (state.favorites.has(gameId)) {
    state.favorites.delete(gameId);
  } else {
    state.favorites.add(gameId);
  }
  saveStoredArray(STORAGE_KEYS.favorites, Array.from(state.favorites));

  if (state.activeGameId === gameId) {
    syncPlayerFavoriteButton(gameId);
  }
  renderCatalog();
}

function recordRecent(gameId) {
  state.recentIds = [gameId, ...state.recentIds.filter((id) => id !== gameId)].slice(0, 12);
  saveStoredArray(STORAGE_KEYS.recent, state.recentIds);
}

function removeCustomGame(gameId) {
  state.customGames = state.customGames.filter((g) => g.id !== gameId);
  saveStoredArray(STORAGE_KEYS.customGames, state.customGames);
  state.favorites.delete(gameId);
  saveStoredArray(STORAGE_KEYS.favorites, Array.from(state.favorites));
  state.recentIds = state.recentIds.filter((id) => id !== gameId);
  saveStoredArray(STORAGE_KEYS.recent, state.recentIds);
  renderCatalog();
  updateHero();
}

function syncNavAndTabs() {
  for (const btn of els.navButtons) {
    btn.classList.toggle('is-active', btn.dataset.view === state.activeView);
  }
  for (const tab of els.categoryTabs) {
    const active = tab.dataset.category === state.activeCategory;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  }
}

function parseIframeInput(rawInput) {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { error: 'Enter a valid game URL or <iframe> embed tag.' };
  }

  let src = trimmed;
  let title = '';
  let sandbox = 'allow-scripts allow-same-origin';
  let allow = 'fullscreen';

  if (trimmed.toLowerCase().includes('<iframe')) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');
    const parsedIframe = doc.querySelector('iframe');
    if (!parsedIframe) {
      return { error: 'Could not find a valid <iframe> element.' };
    }
    src = parsedIframe.getAttribute('src') || '';
    title = parsedIframe.getAttribute('title') || '';
    sandbox = parsedIframe.getAttribute('sandbox') || sandbox;
    allow = parsedIframe.getAttribute('allow') || allow;

    const srcdoc = parsedIframe.getAttribute('srcdoc');
    if (!src && srcdoc) {
      return { src: '', srcdoc, title, sandbox, allow };
    }
  }

  if (!src) {
    return { error: 'The iframe must include a src URL.' };
  }

  const isRelative = src.startsWith('/');
  if (!isRelative) {
    try {
      const url = new URL(src);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return { error: 'Iframe URL must start with https://, http://, or /.' };
      }
    } catch {
      return { error: 'Iframe URL is not valid. Use https://... or /games/...' };
    }
  }

  return { src, title, sandbox, allow };
}

function openModal(modalEl) {
  modalEl.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  modalEl.hidden = true;
  document.body.style.overflow = '';
}

function flashButtonLabel(button, temporaryLabel) {
  const original = button.textContent;
  button.textContent = temporaryLabel;
  window.setTimeout(() => {
    button.textContent = original;
  }, 1500);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function bindEvents() {
  els.brandLink.addEventListener('click', (e) => {
    e.preventDefault();
    state.activeView = 'browse';
    state.activeCategory = 'All';
    closeGame();
    syncNavAndTabs();
    updateHero();
    renderCatalog();
  });

  for (const btn of els.navButtons) {
    btn.addEventListener('click', () => {
      state.activeView = btn.dataset.view || 'browse';
      if (state.activeGameId) {
        closeGame();
      }
      syncNavAndTabs();
      updateHero();
      renderCatalog();
    });
  }

  for (const tab of els.categoryTabs) {
    tab.addEventListener('click', () => {
      state.activeCategory = tab.dataset.category || 'All';
      syncNavAndTabs();
      renderCatalog();
    });
  }

  els.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderCatalog();
  });

  els.heroPlayBtn.addEventListener('click', () => {
    const id = els.heroPlayBtn.dataset.gameId;
    if (id) openGame(id);
  });

  els.heroSurpriseBtn.addEventListener('click', () => {
    const all = getAllGames();
    if (all.length === 0) return;
    const pick = all[Math.floor(Math.random() * all.length)];
    openGame(pick.id);
  });

  els.backToCatalogBtn.addEventListener('click', () => closeGame());

  els.playerFavoriteBtn.addEventListener('click', () => {
    if (state.activeGameId) {
      toggleFavorite(state.activeGameId);
    }
  });

  els.reloadGameBtn.addEventListener('click', () => {
    const game = findGameById(state.activeGameId);
    if (!game) return;
    els.iframeMount.innerHTML = '';
    const freshIframe = buildIframeElement(game);
    els.iframeMount.appendChild(freshIframe);
    freshIframe.focus();
  });

  els.inspectIframeBtn.addEventListener('click', () => {
    els.iframeInspector.hidden = !els.iframeInspector.hidden;
  });

  els.fullscreenBtn.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (els.iframeStage.requestFullscreen) {
      els.iframeStage.requestFullscreen().catch(() => {});
    }
  });

  els.copyEntryJsonBtn.addEventListener('click', async () => {
    const game = findGameById(state.activeGameId);
    if (!game) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(game, null, 2));
      flashButtonLabel(els.copyEntryJsonBtn, 'Copied');
    } catch {
      // Clipboard blocked
    }
  });

  els.openJsonBtn.addEventListener('click', () => {
    const formatted = JSON.stringify(getAllGames(), null, 2);
    els.jsonCatalogPreview.textContent = formatted;
    openModal(els.jsonModal);
  });

  els.copyAllJsonBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(getAllGames(), null, 2));
      flashButtonLabel(els.copyAllJsonBtn, 'Copied');
    } catch {
      // Clipboard blocked
    }
  });

  els.downloadJsonBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(getAllGames(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'games.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  els.openAddGameBtn.addEventListener('click', () => {
    els.addGameError.hidden = true;
    els.addGameForm.reset();
    openModal(els.addGameModal);
    els.gameTitleInput.focus();
  });

  els.addGameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    els.addGameError.hidden = true;

    const title = els.gameTitleInput.value.trim();
    const category = els.gameCategoryInput.value;
    const controls = els.gameControlsInput.value.trim() || 'Keyboard / Mouse';
    const description =
      els.gameDescInput.value.trim() || 'Custom iframe game added to your local ArcadeVault catalog.';

    if (!title) {
      els.addGameError.textContent = 'Please provide a game title.';
      els.addGameError.hidden = false;
      return;
    }

    const parsedIframe = parseIframeInput(els.gameIframeInput.value);
    if (parsedIframe.error) {
      els.addGameError.textContent = parsedIframe.error;
      els.addGameError.hidden = false;
      return;
    }

    const slug = `${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'custom-game'}-${Date.now().toString().slice(-4)}`;

    const newEntry = {
      id: slug,
      title,
      category,
      controls,
      description,
      thumbnail: '',
      featured: false,
      custom: true,
      iframe: {
        src: parsedIframe.src,
        ...(parsedIframe.srcdoc ? { srcdoc: parsedIframe.srcdoc } : {}),
        title: parsedIframe.title || `${title} — Iframe Game`,
        width: '100%',
        height: '100%',
        allow: parsedIframe.allow,
        sandbox: parsedIframe.sandbox,
      },
    };

    state.customGames.push(newEntry);
    saveStoredArray(STORAGE_KEYS.customGames, state.customGames);
    closeModal(els.addGameModal);
    state.activeView = 'browse';
    state.activeCategory = 'All';
    syncNavAndTabs();
    updateHero();
    renderCatalog();
    openGame(newEntry.id);
  });

  for (const closeBtn of document.querySelectorAll('[data-close-modal]')) {
    closeBtn.addEventListener('click', () => {
      const targetId = closeBtn.getAttribute('data-close-modal');
      const modal = targetId ? document.getElementById(targetId) : null;
      if (modal) closeModal(modal);
    });
  }

  for (const backdrop of [els.jsonModal, els.addGameModal]) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop);
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!els.jsonModal.hidden) closeModal(els.jsonModal);
      if (!els.addGameModal.hidden) closeModal(els.addGameModal);
    }
  });

  window.addEventListener('hashchange', handleInitialHash);
}

function handleInitialHash() {
  const hash = window.location.hash;
  if (hash.startsWith('#play=')) {
    const id = decodeURIComponent(hash.slice(6));
    if (findGameById(id)) {
      openGame(id, false);
      return;
    }
  }
  if (state.activeGameId && (!hash || hash === '#browse')) {
    closeGame(false);
  }
}

async function init() {
  bindEvents();
  renderCatalog();

  try {
    const res = await fetch('/games.json');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} while fetching /games.json`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('games.json must contain a JSON array of game objects.');
    }
    state.baseGames = data;
    state.loading = false;
    state.loadError = '';
  } catch (err) {
    state.loading = false;
    state.loadError = err instanceof Error ? err.message : 'Failed to load games.json';
  }

  updateHero();
  renderCatalog();
  handleInitialHash();
}

init();
