// Aggregator – Oberfläche (ohne Build-Schritt, reines JavaScript)

// ================================================================ Hilfsfunktionen
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 4v5h-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  magazine: '<rect x="3" y="4" width="7" height="6" rx="1"/><path d="M14 5h7M14 9h7"/><rect x="3" y="14" width="7" height="6" rx="1"/><path d="M14 15h7M14 19h7"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  'check-all': '<path d="m2 12 5 5L18 6"/><path d="m12 16 1 1L22 8"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  dot: '<circle cx="12" cy="12" r="5"/>',
  type: '<path d="M4 7V5h11v2M9.5 5v14M7 19h5M14 12v-1h7v1M17.5 11v8M16 19h3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  warn: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  arrows: '<path d="m8 9 4-4 4 4M16 15l-4 4-4-4"/>',
};
const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
function applyIcons(root = document) {
  for (const el of $$('[data-icon]', root)) {
    if (!el.dataset.iconDone) {
      el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
      el.dataset.iconDone = '1';
    }
  }
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function api(path, { method = 'GET', body, raw } = {}) {
  const opts = { method, headers: { 'X-Requested-With': 'aggregator' } };
  if (body !== undefined) {
    if (raw) {
      opts.body = body;
      opts.headers['Content-Type'] = 'text/plain';
    } else {
      opts.body = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
    }
  }
  const res = await fetch('/api' + path, opts);
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (res.status === 401 && path !== '/login' && path !== '/session') {
    showAuth(data?.setup);
    throw new Error('Nicht angemeldet');
  }
  if (!res.ok) throw new Error(data?.error || `Fehler ${res.status}`);
  return data;
}

function toast(msg, err = false) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.textContent = msg;
  box.append(el);
  // Neu öffnen, damit die Meldung über einem gerade geöffneten Dialog liegt
  try {
    if (box.matches(':popover-open')) box.hidePopover();
    box.showPopover();
  } catch {}
  setTimeout(() => {
    el.remove();
    if (!box.children.length) {
      try {
        box.hidePopover();
      } catch {}
    }
  }, err ? 6000 : 3500);
}

const langNames = new Intl.DisplayNames(['de'], { type: 'language' });
const langName = (c) => {
  if (!c) return 'Unbekannt';
  try {
    return langNames.of(c) || c;
  } catch {
    return c;
  }
};

const DAY = 86400000;
const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const startOfWeek = (d = new Date()) => startOfDay(d) - ((d.getDay() + 6) % 7) * DAY;
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).getTime();

function periodRange(p) {
  const now = Date.now();
  switch (p) {
    case 'today': return [startOfDay(), null];
    case 'yesterday': return [startOfDay() - DAY, startOfDay()];
    case 'week': return [startOfWeek(), null];
    case 'days7': return [now - 7 * DAY, null];
    case 'month': return [startOfMonth(), null];
    case 'days30': return [now - 30 * DAY, null];
    default: return [null, null];
  }
}
const COUNT_MODES = {
  all: 'Neue Artikel insgesamt',
  today: 'Neue Artikel heute',
  week: 'Neue Artikel diese Woche',
  days7: 'Neue Artikel der letzten 7 Tage',
  month: 'Neue Artikel diesen Monat',
  days30: 'Neue Artikel der letzten 30 Tage',
};
const countSince = (mode) => (mode === 'all' ? 0 : periodRange(mode)[0] || 0);

const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });
function fmtDate(ts, long = false) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = Date.now() - ts;
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (long) return d.toLocaleString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  if (diff < 60_000) return 'gerade eben';
  if (diff < 3600_000) return rtf.format(-Math.round(diff / 60_000), 'minute');
  if (ts >= startOfDay()) return `heute, ${time}`;
  if (ts >= startOfDay() - DAY) return `gestern, ${time}`;
  if (diff < 6 * DAY) return d.toLocaleDateString('de-DE', { weekday: 'long' }) + `, ${time}`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function colorFor(s) {
  let h = 0;
  for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 48%)`;
}
function favicon(src, title) {
  const letter = esc((title || '?').trim().charAt(0).toUpperCase());
  const ph = `<span class="favicon" style="background:${colorFor(title)}">${letter}</span>`;
  if (!src) return ph;
  return `<img class="favicon" src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback="${esc(title || '?')}">`;
}
// Fehlende Bilder durch Platzhalter ersetzen
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.dataset.fallback !== undefined) {
    const t = img.dataset.fallback;
    img.outerHTML = `<span class="favicon" style="background:${colorFor(t)}">${esc(t.charAt(0).toUpperCase())}</span>`;
  } else if (img.closest('.thumb')) {
    img.remove();
  } else if (img.classList.contains('r-hero')) {
    img.remove();
  }
}, true);

let debounceTimers = {};
function debounce(key, fn, ms = 400) {
  clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(fn, ms);
}

// ================================================================ Zustand
const state = {
  user: null,
  search: null,
  settings: {},
  categories: [],
  subs: [],
  counts: { sources: {}, categories: {} },
  languages: [],
  view: 'all', // all | favorites | history
  filters: { category: '', subscription: '', lang: '', period: '', from: '', to: '', q: '' },
  articles: [],
  cursor: null,
  loading: false,
  done: false,
  selected: -1,
  reader: null, // aktueller Artikel in der Leseansicht
  loadToken: 0,
};

const READER_FONTS = {
  serif: { name: 'Serif', hint: 'Charter, Georgia', css: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif' },
  sans: { name: 'Sans', hint: 'Systemschrift', css: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  palatino: { name: 'Palatino', hint: 'klassisch', css: '"Iowan Old Style", "Palatino Linotype", "URW Palladio L", P052, Palatino, serif' },
  humanist: { name: 'Humanist', hint: 'Optima, Calibri', css: 'Seravek, "Gill Sans Nova", Optima, Candara, Calibri, Ubuntu, "DejaVu Sans", sans-serif' },
  times: { name: 'Times', hint: 'Zeitungsschrift', css: '"Times New Roman", Times, "Liberation Serif", serif' },
  legible: { name: 'Gut lesbar', hint: 'Verdana, Atkinson', css: '"Atkinson Hyperlegible", Verdana, Tahoma, "DejaVu Sans", sans-serif' },
  rounded: { name: 'Rund', hint: 'freundlich', css: 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, Manjari, "Arial Rounded MT", sans-serif' },
  mono: { name: 'Monospace', hint: 'Schreibmaschine', css: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace' },
};
const READER_THEMES = {
  light: ['Hell', '#ffffff', '#1d1d1f'],
  paper: ['Papier', '#faf8f3', '#2a2a28'],
  sepia: ['Sepia', '#f4ecd8', '#5b4636'],
  mint: ['Mint', '#e9f3ea', '#23352a'],
  gray: ['Grau', '#4a4d52', '#ececec'],
  dark: ['Dunkel', '#1e1f22', '#d8d8d8'],
  night: ['Nacht', '#000000', '#b5b5b5'],
  contrast: ['Kontrast', '#000000', '#ffeb3b'],
};
const READER_WIDTHS = { narrow: '600px', medium: '720px', wide: '900px', full: '100%' };

// ================================================================ Anmeldung
function showAuth(setup) {
  $('#app').hidden = true;
  $('#auth').hidden = false;
  $('#auth-intro').textContent = setup
    ? 'Willkommen! Lege jetzt Dein Konto an. Den Einrichtungscode findest Du im Server-Log.'
    : 'Bitte melde Dich an.';
  $('#auth-code-row').hidden = !setup;
  $('#auth-submit').textContent = setup ? 'Konto anlegen' : 'Anmelden';
  $('#auth-form').dataset.mode = setup ? 'setup' : 'login';
  $('#auth-form [name=password]').autocomplete = setup ? 'new-password' : 'current-password';
}

$('#auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = { username: f.username.value, password: f.password.value, code: f.code.value };
  $('#auth-error').hidden = true;
  try {
    await api(f.dataset.mode === 'setup' ? '/setup' : '/login', { method: 'POST', body });
    f.password.value = '';
    await boot();
  } catch (err) {
    $('#auth-error').textContent = err.message;
    $('#auth-error').hidden = false;
  }
});

// ================================================================ Start
async function boot() {
  const s = await api('/session');
  if (!s.user) return showAuth(s.setup);
  state.user = s.user;
  state.search = s.search;
  state.logoutUrl = s.logoutUrl;
  $('#auth').hidden = true;
  $('#app').hidden = false;
  const [settings, categories, subs] = await Promise.all([api('/settings'), api('/categories'), api('/subscriptions')]);
  state.settings = settings;
  state.categories = categories;
  state.subs = subs;
  applyAppTheme();
  readHash();
  await Promise.all([loadCounts(), loadLanguages()]);
  renderAll();
  reloadArticles();
}

function applyAppTheme() {
  const t = state.settings.appTheme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

let pendingSettings = {};
async function saveSettings(patch) {
  Object.assign(state.settings, patch);
  Object.assign(pendingSettings, patch);
  debounce('settings', () => {
    const body = pendingSettings;
    pendingSettings = {};
    api('/settings', { method: 'PUT', body }).catch((e) => toast(e.message, true));
  }, 300);
}
// Ausstehende Einstellungen beim Verlassen der Seite noch speichern
addEventListener('pagehide', () => {
  if (!Object.keys(pendingSettings).length) return;
  fetch('/api/settings', {
    method: 'PUT',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aggregator' },
    body: JSON.stringify(pendingSettings),
  });
});

async function loadCounts() {
  state.counts = await api(`/counts?since=${countSince(state.settings.countMode)}`);
}
async function loadLanguages() {
  state.languages = await api('/languages');
}
async function reloadMeta() {
  [state.categories, state.subs] = await Promise.all([api('/categories'), api('/subscriptions')]);
  await Promise.all([loadCounts(), loadLanguages()]);
  renderAll();
}

// ================================================================ Navigation über die Adresse (#…)
function writeHash() {
  const f = state.filters;
  const p = new URLSearchParams();
  if (state.view !== 'all') p.set('view', state.view);
  for (const k of ['category', 'subscription', 'lang', 'period', 'from', 'to', 'q']) if (f[k]) p.set(k, f[k]);
  const h = p.toString();
  history.replaceState(null, '', h ? '#' + h : location.pathname);
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  state.view = ['favorites', 'history'].includes(p.get('view')) ? p.get('view') : 'all';
  for (const k of Object.keys(state.filters)) state.filters[k] = p.get(k) || '';
}

function select({ view = 'all', category = '', subscription = '' }) {
  if (!$('#reader').hidden) closeReader();
  state.view = view;
  // Ein Klick in der Seitenleiste zeigt wirklich alles aus dieser Auswahl
  Object.assign(state.filters, {
    category: category ? String(category) : '',
    subscription: subscription ? String(subscription) : '',
    lang: '', period: '', from: '', to: '', q: '',
  });
  $('#app').classList.remove('nav-open');
  renderAll();
  reloadArticles();
}

// ================================================================ Seitenleiste
function countBadge(n) {
  return `<span class="count ${n ? 'has' : ''}">${n ? n : ''}</span>`;
}

function renderSidebar() {
  const c = state.counts;
  const f = state.filters;
  const collapsed = new Set(state.settings.collapsedCategories || []);
  const isActive = (v, cat = '', sub = '') => state.view === v && f.category === String(cat) && f.subscription === String(sub);
  const subItem = (s, flat = false) => `
    <div class="nav-item sub ${flat ? 'flat' : ''} ${isActive('all', '', s.id) ? 'active' : ''}" data-sub="${s.id}" title="${esc(s.title)}${s.lastError ? '\nFehler: ' + esc(s.lastError) : ''}">
      ${favicon(s.icon, s.title)}
      <span class="label">${esc(s.title)}</span>
      ${s.lastError ? `<span class="warn" title="${esc(s.lastError)}">${icon('warn')}</span>` : ''}
      ${countBadge(c.sources?.[s.id])}
      <button class="icon-btn more" data-sub-menu="${s.id}" title="Optionen">${icon('more')}</button>
    </div>`;

  let html = `
    <div class="nav-item ${isActive('all') ? 'active' : ''}" data-nav="all">${icon('inbox')}<span class="label">Alle Artikel</span>${countBadge(c.all)}</div>
    <div class="nav-item ${state.view === 'favorites' ? 'active' : ''}" data-nav="favorites">${icon('star')}<span class="label">Favoriten</span><span class="count">${c.favorites || ''}</span></div>
    <div class="nav-item ${state.view === 'history' ? 'active' : ''}" data-nav="history">${icon('history')}<span class="label">Verlauf</span><span class="count">${c.history || ''}</span></div>
    <div class="nav-section"><span>Kategorien</span><button class="btn link" id="btn-new-cat">+ Neu</button></div>
    <div class="count-hint">Zähler: ${esc(COUNT_MODES[state.settings.countMode] || '')}</div>
  `;
  for (const cat of state.categories) {
    const subs = state.subs.filter((s) => s.categoryIds.includes(cat.id));
    const closed = collapsed.has(cat.id);
    html += `
      <div class="nav-item ${isActive('all', cat.id) ? 'active' : ''}" data-cat="${cat.id}">
        <span class="twisty ${closed ? 'closed' : ''}" data-toggle="${cat.id}">${icon('chevron')}</span>
        <span class="label">${esc(cat.name)}</span>
        ${countBadge(c.categories?.[cat.id])}
        <button class="icon-btn more" data-cat-menu="${cat.id}" title="Optionen">${icon('more')}</button>
      </div>
      ${closed ? '' : subs.map((s) => subItem(s)).join('')}`;
  }
  const uncategorized = state.subs.filter((s) => !s.categoryIds.length);
  if (uncategorized.length) {
    const closed = collapsed.has('none');
    html += `
      <div class="nav-item ${isActive('all', 'none') ? 'active' : ''}" data-cat="none">
        <span class="twisty ${closed ? 'closed' : ''}" data-toggle="none">${icon('chevron')}</span>
        <span class="label"><em>Ohne Kategorie</em></span>
        ${countBadge(c.uncategorized)}
      </div>
      ${closed ? '' : uncategorized.map((s) => subItem(s)).join('')}`;
  }
  if (!state.subs.length) {
    html += `<p class="muted small" style="padding:8px">Noch keine Quellen abonniert. Klicke oben auf <b>Hinzufügen</b>.</p>`;
  }
  html += `
    <div class="nav-section"><span>Alle Quellen (${state.subs.length})</span></div>
    ${state.subs.map((s) => subItem(s, true)).join('')}`;
  $('#nav').innerHTML = html;
}

$('#nav').addEventListener('click', (e) => {
  const t = e.target;
  const toggle = t.closest('[data-toggle]');
  if (toggle) {
    e.stopPropagation();
    const id = toggle.dataset.toggle === 'none' ? 'none' : Number(toggle.dataset.toggle);
    const set = new Set(state.settings.collapsedCategories || []);
    set.has(id) ? set.delete(id) : set.add(id);
    saveSettings({ collapsedCategories: [...set] });
    renderSidebar();
    return;
  }
  const subMenu = t.closest('[data-sub-menu]');
  if (subMenu) return openSubMenu(Number(subMenu.dataset.subMenu), subMenu);
  const catMenu = t.closest('[data-cat-menu]');
  if (catMenu) return openCatMenu(Number(catMenu.dataset.catMenu), catMenu);
  if (t.closest('#btn-new-cat')) return newCategory();
  const item = t.closest('.nav-item');
  if (!item) return;
  if (item.dataset.nav) select({ view: item.dataset.nav });
  else if (item.dataset.cat) select({ category: item.dataset.cat });
  else if (item.dataset.sub) select({ subscription: item.dataset.sub });
});

// ---------------------------------------------------------------- Kontextmenü
function openMenu(anchor, items) {
  const m = $('#menu');
  m.innerHTML = items
    .map((it) => (it === '-' ? '<hr>' : `<button class="${it.danger ? 'danger' : ''}">${icon(it.icon)}<span>${esc(it.label)}</span></button>`))
    .join('');
  const buttons = $$('button', m);
  items.filter((it) => it !== '-').forEach((it, i) => buttons[i].addEventListener('click', () => {
    closeMenu();
    it.action();
  }));
  m.hidden = false;
  const r = anchor.getBoundingClientRect();
  const mw = m.offsetWidth;
  const mh = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(r.right - mw, innerWidth - mw - 8)) + 'px';
  m.style.top = (r.bottom + mh + 8 > innerHeight ? Math.max(8, r.top - mh - 4) : r.bottom + 4) + 'px';
}
function closeMenu() {
  $('#menu').hidden = true;
}
document.addEventListener('click', (e) => {
  if (!$('#menu').hidden && !e.target.closest('#menu') && !e.target.closest('.more')) closeMenu();
});

function openSubMenu(id, anchor) {
  const s = state.subs.find((x) => x.id === id);
  openMenu(anchor, [
    { icon: 'edit', label: 'Bearbeiten & Kategorien', action: () => editSubscription(id) },
    { icon: 'refresh', label: 'Jetzt aktualisieren', action: () => refreshSub(id) },
    { icon: 'check-all', label: 'Alle als gelesen markieren', action: () => markAllRead({ subscription: id }) },
    { icon: 'external', label: 'Webseite öffnen', action: () => window.open(s.siteUrl || s.url, '_blank', 'noopener') },
    '-',
    { icon: 'trash', label: 'Abo entfernen', danger: true, action: () => removeSub(id) },
  ]);
}

function openCatMenu(id, anchor) {
  const idx = state.categories.findIndex((c) => c.id === id);
  openMenu(anchor, [
    { icon: 'check-all', label: 'Alle als gelesen markieren', action: () => markAllRead({ category: id }) },
    { icon: 'edit', label: 'Umbenennen', action: () => renameCategory(id) },
    ...(idx > 0 ? [{ icon: 'up', label: 'Nach oben', action: () => moveCategory(idx, -1) }] : []),
    ...(idx < state.categories.length - 1 ? [{ icon: 'down', label: 'Nach unten', action: () => moveCategory(idx, 1) }] : []),
    '-',
    { icon: 'trash', label: 'Kategorie löschen', danger: true, action: () => deleteCategory(id) },
  ]);
}

// ---------------------------------------------------------------- Eingabe-/Bestätigungsdialog
function promptDialog(text, { input = false, value = '', ok = 'OK', danger = false } = {}) {
  return new Promise((resolve) => {
    const d = $('#dlg-prompt');
    $('#prompt-text').textContent = text;
    const inp = $('#prompt-input');
    inp.hidden = !input;
    inp.value = value;
    $('#prompt-ok').textContent = ok;
    $('#prompt-ok').className = 'btn ' + (danger ? 'danger' : 'primary');
    d.returnValue = '';
    d.onclose = () => resolve(d.returnValue === 'ok' ? (input ? inp.value.trim() : true) : null);
    // Enter im Eingabefeld bestätigt (sonst würde der erste Knopf im Formular – „Abbrechen“ – auslösen)
    inp.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        d.close('ok');
      }
    };
    d.showModal();
    if (input) inp.select();
    else $('#prompt-ok').focus();
  });
}

async function newCategory() {
  const name = await promptDialog('Name der neuen Kategorie:', { input: true, ok: 'Anlegen' });
  if (!name) return null;
  try {
    const c = await api('/categories', { method: 'POST', body: { name } });
    await reloadMeta();
    return c;
  } catch (e) {
    toast(e.message, true);
    return null;
  }
}
async function renameCategory(id) {
  const c = state.categories.find((x) => x.id === id);
  const name = await promptDialog('Neuer Name der Kategorie:', { input: true, value: c.name, ok: 'Umbenennen' });
  if (!name) return;
  try {
    await api(`/categories/${id}`, { method: 'PATCH', body: { name } });
    await reloadMeta();
  } catch (e) {
    toast(e.message, true);
  }
}
async function deleteCategory(id) {
  const c = state.categories.find((x) => x.id === id);
  if (!(await promptDialog(`Kategorie „${c.name}“ löschen? Die Abos selbst bleiben erhalten.`, { ok: 'Löschen', danger: true }))) return;
  await api(`/categories/${id}`, { method: 'DELETE' });
  if (state.filters.category === String(id)) state.filters.category = '';
  await reloadMeta();
  reloadArticles();
}
async function moveCategory(idx, dir) {
  const arr = [...state.categories];
  [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
  await api('/categories/order', { method: 'POST', body: { ids: arr.map((c) => c.id) } });
  await reloadMeta();
}

async function refreshSub(id) {
  toast('Wird aktualisiert …');
  try {
    const r = await api(`/subscriptions/${id}/refresh`, { method: 'POST', body: {} });
    if (r.error) toast(`Fehler: ${r.error}`, true);
    else toast(r.added ? `${r.added} neue Artikel` : 'Keine neuen Artikel');
    await reloadMeta();
    if (r.added) reloadArticles();
  } catch (e) {
    toast(e.message, true);
  }
}

async function removeSub(id) {
  const s = state.subs.find((x) => x.id === id);
  if (!(await promptDialog(`Abo „${s.title}“ entfernen? Favoriten bleiben erhalten.`, { ok: 'Entfernen', danger: true }))) return;
  await api(`/subscriptions/${id}`, { method: 'DELETE' });
  if (state.filters.subscription === String(id)) state.filters.subscription = '';
  $('#dlg-sub').close();
  await reloadMeta();
  reloadArticles();
  toast('Abo entfernt');
}

async function markAllRead(scope) {
  const f = state.filters;
  const [from, to] = currentRange();
  const body = scope || {
    view: state.view, category: f.category, subscription: f.subscription, lang: f.lang, q: f.q, from, to,
  };
  body.before = Date.now();
  const r = await api('/articles/mark-read', { method: 'POST', body });
  toast(r.marked ? `${r.marked} Artikel als gelesen markiert` : 'Keine ungelesenen Artikel');
  await loadCounts();
  renderSidebar();
  reloadArticles();
}

// ================================================================ Kopfbereich & Filter
function currentTitle() {
  const f = state.filters;
  if (state.view === 'favorites') return 'Favoriten';
  if (state.view === 'history') return 'Verlauf';
  if (f.subscription) return state.subs.find((s) => String(s.id) === f.subscription)?.title || 'Quelle';
  if (f.category === 'none') return 'Ohne Kategorie';
  if (f.category) return state.categories.find((c) => String(c.id) === f.category)?.name || 'Kategorie';
  return 'Alle Artikel';
}

function currentRange() {
  const f = state.filters;
  if (f.period === 'custom') {
    const from = f.from ? new Date(f.from + 'T00:00').getTime() : null;
    const to = f.to ? new Date(f.to + 'T00:00').getTime() + DAY : null;
    return [from, to];
  }
  return periodRange(f.period);
}

function renderHead() {
  const f = state.filters;
  $('#list-title').textContent = currentTitle();
  document.title = `${currentTitle()} – Aggregator`;
  const mode = state.settings.viewMode;
  $$('#view-modes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  const unreadOnly = state.settings.unreadOnly && state.view === 'all';
  const ub = $('#btn-unread');
  ub.textContent = unreadOnly ? 'Nur ungelesene' : 'Alle';
  ub.classList.toggle('active', unreadOnly);
  ub.hidden = state.view !== 'all';
  $('#btn-markall').hidden = state.view !== 'all';
  $('#btn-clear-history').hidden = state.view !== 'history';

  const activeFilters = [f.lang, f.period, state.view !== 'all' && f.category, state.view !== 'all' && f.subscription].filter(Boolean).length;
  $('#btn-filter').classList.toggle('on', !$('#filterbar').hidden || activeFilters > 0);

  // Filterauswahl befüllen
  $('#f-category').innerHTML =
    `<option value="">Alle Kategorien</option>` +
    state.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('') +
    `<option value="none">Ohne Kategorie</option>`;
  $('#f-category').value = f.category;
  $('#f-subscription').innerHTML =
    `<option value="">Alle Seiten</option>` + state.subs.map((s) => `<option value="${s.id}">${esc(s.title)}</option>`).join('');
  $('#f-subscription').value = f.subscription;
  $('#f-lang').innerHTML =
    `<option value="">Alle Sprachen</option>` +
    state.languages.map((l) => `<option value="${esc(l.code)}">${esc(langName(l.code))} (${l.n})</option>`).join('') +
    `<option value="unknown">Unbekannt</option>`;
  $('#f-lang').value = f.lang;
  $('#f-period').value = f.period;
  $$('.f-custom').forEach((el) => (el.hidden = f.period !== 'custom'));
  $('#f-from').value = f.from;
  $('#f-to').value = f.to;
  if ($('#search').value !== f.q) $('#search').value = f.q;
  updateSearchClear();
}

function renderAll() {
  renderSidebar();
  renderHead();
  writeHash();
}

$('#view-modes').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-mode]');
  if (!b) return;
  setViewMode(b.dataset.mode);
});
function setViewMode(mode) {
  saveSettings({ viewMode: mode });
  renderHead();
  renderArticles();
}
$('#btn-unread').addEventListener('click', () => {
  saveSettings({ unreadOnly: !state.settings.unreadOnly });
  renderHead();
  reloadArticles();
});
$('#btn-markall').addEventListener('click', () => markAllRead());
$('#btn-clear-history').addEventListener('click', clearHistory);
$('#btn-filter').addEventListener('click', () => {
  $('#filterbar').hidden = !$('#filterbar').hidden;
  renderHead();
});
for (const [id, key] of [['#f-category', 'category'], ['#f-subscription', 'subscription'], ['#f-lang', 'lang'], ['#f-period', 'period'], ['#f-from', 'from'], ['#f-to', 'to']]) {
  $(id).addEventListener('change', (e) => {
    state.filters[key] = e.target.value;
    renderAll();
    reloadArticles();
  });
}
$('#f-reset').addEventListener('click', () => {
  Object.assign(state.filters, { category: '', subscription: '', lang: '', period: '', from: '', to: '', q: '' });
  renderAll();
  reloadArticles();
});
$('#search').addEventListener('input', (e) => {
  if (!$('#reader').hidden) closeReader();
  updateSearchClear();
  debounce('search', () => {
    state.filters.q = e.target.value.trim();
    writeHash();
    reloadArticles();
  }, 350);
});
$('#btn-menu').addEventListener('click', () => $('#app').classList.toggle('nav-open'));
$('#sidebar-backdrop').addEventListener('click', () => $('#app').classList.remove('nav-open'));

const filtersActive = () => {
  const f = state.filters;
  return !!($('#search').value || f.q || f.lang || f.period || f.from || f.to);
};
function updateSearchClear() {
  $('#search-clear').hidden = !filtersActive();
}
$('#search-clear').addEventListener('click', () => {
  // Suchbegriff und Filter löschen, die Auswahl in der Seitenleiste bleibt
  Object.assign(state.filters, { q: '', lang: '', period: '', from: '', to: '' });
  $('#search').value = '';
  if (!$('#reader').hidden) closeReader();
  renderAll();
  reloadArticles();
  $('#search').focus();
});
$('#search').addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && e.target.value) {
    e.preventDefault();
    e.stopPropagation();
    $('#search-clear').click();
  }
});

// Allgemeine Löschen-Knöpfe in Eingabefeldern (data-clear="<id des Felds>")
for (const btn of $$('[data-clear]')) {
  const input = document.getElementById(btn.dataset.clear);
  const sync = () => (btn.hidden = !input.value);
  input.addEventListener('input', sync);
  btn.addEventListener('click', () => {
    input.value = '';
    sync();
    if (input.id === 'add-search') $('#search-results').innerHTML = '';
    input.focus();
  });
}

async function clearHistory() {
  if (!(await promptDialog('Den gesamten Leseverlauf löschen? Favoriten und der Gelesen-Status bleiben erhalten.', { ok: 'Verlauf löschen', danger: true }))) return;
  await api('/history', { method: 'DELETE' });
  toast('Verlauf gelöscht');
  await loadCounts();
  renderSidebar();
  reloadArticles();
}

// ================================================================ Artikelliste
function articleQuery() {
  const f = state.filters;
  const p = new URLSearchParams();
  p.set('view', state.view);
  if (f.category) p.set('category', f.category);
  if (f.subscription) p.set('subscription', f.subscription);
  if (f.lang) p.set('lang', f.lang);
  if (f.q) p.set('q', f.q);
  const [from, to] = currentRange();
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  if (state.view === 'all' && state.settings.unreadOnly) p.set('unread', '1');
  p.set('limit', '40');
  return p;
}

async function reloadArticles() {
  state.articles = [];
  state.cursor = null;
  state.done = false;
  state.selected = -1;
  state.loading = false;
  state.loadToken++;
  $('#articles').innerHTML = '';
  $('#content').scrollTop = 0;
  await loadMore();
}

async function loadMore() {
  if (!state.user || state.loading || state.done) return;
  state.loading = true;
  const token = state.loadToken;
  const p = articleQuery();
  if (state.cursor) p.set('cursor', state.cursor);
  $('#list-empty').hidden = true;
  $('#list-sentinel').innerHTML = '<div class="loading-row">Lade Artikel …</div>';
  try {
    const r = await api('/articles?' + p);
    if (token !== state.loadToken) return;
    state.articles.push(...r.items);
    state.cursor = r.cursor;
    state.done = !r.cursor;
    renderArticles(r.items.length && state.articles.length > r.items.length ? r.items : null);
  } catch (e) {
    if (token === state.loadToken) {
      state.done = true;
      if (e.message !== 'Nicht angemeldet') toast(e.message, true);
    }
  } finally {
    if (token === state.loadToken) {
      state.loading = false;
      $('#list-sentinel').innerHTML = '';
      // Falls die Liste den Bildschirm noch nicht füllt, weiterladen
      requestAnimationFrame(() => {
        if (!state.done && $('#list-sentinel').getBoundingClientRect().top < innerHeight + 300) loadMore();
      });
    }
  }
}

new IntersectionObserver((entries) => {
  if (entries.some((e) => e.isIntersecting)) loadMore();
}, { root: $('#content'), rootMargin: '400px' }).observe($('#list-sentinel'));

function catNames(ids) {
  return ids.map((id) => state.categories.find((c) => c.id === id)?.name).filter(Boolean);
}

function articleHtml(a, idx) {
  const mode = state.settings.viewMode;
  const cats = catNames(a.categoryIds || []);
  const date = state.view === 'history' ? '' : fmtDate(a.publishedAt);
  const meta = `
    <div class="meta">
      <span class="src">${favicon(a.sourceIcon, a.sourceTitle)}${esc(a.sourceTitle || '')}</span>
      ${date ? `<span title="${esc(fmtDate(a.publishedAt, true))}">${esc(date)}</span>` : `<span>${esc(fmtDate(a.publishedAt))}</span>`}
      ${mode === 'details' ? cats.map((c) => `<span class="chip">${esc(c)}</span>`).join('') : ''}
      ${a.language ? `<span class="chip lang" title="${esc(langName(a.language))}">${esc(a.language)}</span>` : ''}
    </div>`;
  const thumb = mode === 'details'
    ? ''
    : `<div class="thumb" style="${a.image ? '' : `background:${colorFor(a.sourceTitle)}`}">
         ${a.image ? `<img src="${esc(a.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="ph">${esc((a.sourceTitle || '?').charAt(0))}</span>`}
       </div>`;
  const acts = `
    <div class="acts">
      <button class="icon-btn star ${a.favoriteAt ? 'on' : ''}" data-act="fav" title="${a.favoriteAt ? 'Aus Favoriten entfernen' : 'Als Favorit speichern'}">${icon('star')}</button>
      ${state.view === 'history'
        ? `<button class="icon-btn" data-act="unhistory" title="Aus dem Verlauf entfernen">${icon('close')}</button>`
        : `<button class="icon-btn" data-act="read" title="${a.readAt ? 'Als ungelesen markieren' : 'Als gelesen markieren'}">${icon(a.readAt ? 'dot' : 'check')}</button>`}
    </div>`;
  const summary = `<p class="summary">${esc(a.summary || '')}</p>`;
  const cls = `art ${a.readAt ? 'read' : 'unread'} ${idx === state.selected ? 'selected' : ''}`;
  if (mode === 'details') {
    return `<div class="${cls}" data-idx="${idx}"><span class="unread-dot"></span><h3 class="title">${esc(a.title)}</h3>${acts}${meta}</div>`;
  }
  return `<div class="${cls}" data-idx="${idx}"><span class="unread-dot"></span>${thumb}<div class="body"><h3 class="title">${esc(a.title)}</h3>${meta}${summary}</div>${acts}</div>`;
}

function renderArticles(appendItems = null) {
  const list = $('#articles');
  list.className = `articles view-${state.settings.viewMode}`;
  if (appendItems) {
    const start = state.articles.length - appendItems.length;
    list.insertAdjacentHTML('beforeend', appendItems.map((a, i) => articleHtml(a, start + i)).join(''));
  } else {
    list.innerHTML = state.articles.map(articleHtml).join('');
  }
  list.hidden = !state.articles.length;
  const empty = $('#list-empty');
  if (!state.articles.length && state.done) {
    empty.hidden = false;
    const msg = !state.subs.length && state.view === 'all'
      ? 'Noch keine Quellen abonniert. Füge über <b>Hinzufügen</b> Deinen ersten Feed hinzu.'
      : state.view === 'favorites'
        ? 'Noch keine Favoriten gespeichert. Klicke beim Artikel auf den Stern.'
        : state.view === 'history'
          ? 'Der Verlauf ist leer.'
          : state.settings.unreadOnly
            ? 'Alles gelesen. 🎉 Hier gibt es gerade keine ungelesenen Artikel.'
            : 'Keine Artikel gefunden.';
    empty.innerHTML = `${icon('inbox')}<p>${msg}</p>`;
  } else empty.hidden = true;
}

function updateArticleEl(idx) {
  const el = $(`#articles .art[data-idx="${idx}"]`);
  if (el) el.outerHTML = articleHtml(state.articles[idx], idx);
}

$('#articles').addEventListener('click', async (e) => {
  const artEl = e.target.closest('.art');
  if (!artEl) return;
  const idx = Number(artEl.dataset.idx);
  const a = state.articles[idx];
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'fav') return toggleFavorite(a, idx);
  if (act === 'read') return setRead(a, idx, !a.readAt);
  if (act === 'unhistory') {
    await api(`/history/${a.id}`, { method: 'DELETE' });
    state.articles.splice(idx, 1);
    renderArticles();
    loadCounts().then(renderSidebar);
    return;
  }
  openReader(idx);
});

async function toggleFavorite(a, idx) {
  const r = await api(`/articles/${a.id}/state`, { method: 'POST', body: { favorite: !a.favoriteAt } });
  a.favoriteAt = r.favoriteAt;
  if (idx >= 0) updateArticleEl(idx);
  if (state.reader?.id === a.id) {
    state.reader.favoriteAt = r.favoriteAt;
    renderReaderBar();
  }
  state.counts.favorites += r.favoriteAt ? 1 : -1;
  renderSidebar();
  toast(r.favoriteAt ? 'Als Favorit gespeichert ⭐' : 'Aus den Favoriten entfernt');
}

function adjustCounts(a, delta) {
  // Zähler lokal anpassen, wenn der Artikel im Zählzeitraum liegt
  if (a.publishedAt < countSince(state.settings.countMode)) return;
  const c = state.counts;
  c.all = Math.max(0, (c.all || 0) + delta);
  if (a.subscriptionId) {
    c.sources[a.subscriptionId] = Math.max(0, (c.sources[a.subscriptionId] || 0) + delta);
    const sub = state.subs.find((s) => s.id === a.subscriptionId);
    if (sub && !sub.categoryIds.length) c.uncategorized = Math.max(0, (c.uncategorized || 0) + delta);
    for (const cid of sub?.categoryIds || []) c.categories[cid] = Math.max(0, (c.categories[cid] || 0) + delta);
  }
}

async function setRead(a, idx, read) {
  const r = await api(`/articles/${a.id}/state`, { method: 'POST', body: { read } });
  if (!!a.readAt !== !!r.readAt) adjustCounts(a, r.readAt ? -1 : 1);
  a.readAt = r.readAt;
  if (idx >= 0) updateArticleEl(idx);
  if (state.reader?.id === a.id) {
    state.reader.readAt = r.readAt;
    renderReaderBar();
  }
  renderSidebar();
}

// ================================================================ Leseansicht
let readerContentMode = 'full'; // full | feed

function applyReaderStyle() {
  const s = state.settings;
  const art = $('#reader-article');
  art.style.setProperty('--r-size', `${s.readerFontSize}px`);
  art.style.setProperty('--r-lh', s.readerLineHeight);
  art.style.setProperty('--r-font', (READER_FONTS[s.readerFont] || READER_FONTS.serif).css);
  art.style.setProperty('--r-width', READER_WIDTHS[s.readerWidth] || READER_WIDTHS.medium);
  $('#reader').dataset.rtheme = READER_THEMES[s.readerTheme] ? s.readerTheme : 'light';
  // Bedienfeld
  $('#t-size').value = s.readerFontSize;
  $('#t-size-num').value = s.readerFontSize;
  $('#t-lh').value = s.readerLineHeight;
  $$('#t-width button').forEach((b) => b.classList.toggle('active', b.dataset.v === s.readerWidth));
  $$('#t-fonts button').forEach((b) => b.classList.toggle('active', b.dataset.v === s.readerFont));
  $$('#t-themes button').forEach((b) => b.classList.toggle('active', b.dataset.v === s.readerTheme));
}

function buildTypoPanel() {
  $('#t-fonts').innerHTML = Object.entries(READER_FONTS)
    .map(([k, f]) => `<button data-v="${k}" style="font-family:${esc(f.css)}">${esc(f.name)}<small>${esc(f.hint)}</small></button>`)
    .join('');
  $('#t-themes').innerHTML = Object.entries(READER_THEMES)
    .map(([k, [name, bg, fg]]) => `<button data-v="${k}" style="background:${bg};color:${fg}">${esc(name)}</button>`)
    .join('');
}
buildTypoPanel();

function setReaderSetting(patch) {
  saveSettings(patch);
  applyReaderStyle();
}
const clampSize = (v) => Math.max(8, Math.min(96, Math.round(Number(v) || 19)));
$('#t-size').addEventListener('input', (e) => setReaderSetting({ readerFontSize: clampSize(e.target.value) }));
$('#t-size-num').addEventListener('change', (e) => setReaderSetting({ readerFontSize: clampSize(e.target.value) }));
$('#t-size-dec').addEventListener('click', () => setReaderSetting({ readerFontSize: clampSize(state.settings.readerFontSize - 1) }));
$('#t-size-inc').addEventListener('click', () => setReaderSetting({ readerFontSize: clampSize(state.settings.readerFontSize + 1) }));
$('#t-lh').addEventListener('input', (e) => setReaderSetting({ readerLineHeight: Number(e.target.value) }));
$('#t-width').addEventListener('click', (e) => e.target.dataset.v && setReaderSetting({ readerWidth: e.target.dataset.v }));
$('#t-fonts').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) setReaderSetting({ readerFont: b.dataset.v });
});
$('#t-themes').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) setReaderSetting({ readerTheme: b.dataset.v });
});
$('#r-type').addEventListener('click', (e) => {
  e.stopPropagation();
  $('#typo-panel').hidden = !$('#typo-panel').hidden;
});
document.addEventListener('click', (e) => {
  if (!$('#typo-panel').hidden && !e.target.closest('#typo-panel') && !e.target.closest('#r-type')) $('#typo-panel').hidden = true;
});

function renderReaderBar() {
  const a = state.reader;
  if (!a) return;
  $('#r-fav').classList.toggle('on', !!a.favoriteAt);
  $('#r-fav').title = a.favoriteAt ? 'Aus Favoriten entfernen (s)' : 'Als Favorit speichern (s)';
  $('#r-read').innerHTML = icon(a.readAt ? 'dot' : 'check');
  $('#r-read').title = a.readAt ? 'Als ungelesen markieren (m)' : 'Als gelesen markieren (m)';
  $('#r-open').href = a.url || a.siteUrl || '#';
  $('#r-open').hidden = !a.url;
  $('#r-bar-title').textContent = a.sourceTitle || '';
  const ft = $('#r-fulltext');
  ft.hidden = !a.url;
  ft.textContent = readerContentMode === 'full' ? 'Feed-Inhalt' : 'Volltext';
  ft.title = readerContentMode === 'full' ? 'Nur den Inhalt aus dem Feed anzeigen' : 'Den vollständigen Artikel von der Webseite laden';
  $('#r-prev').disabled = state.readerIdx <= 0;
  $('#r-next').disabled = state.readerIdx < 0 || (state.readerIdx >= state.articles.length - 1 && state.done);
}

function readerBody(a, status) {
  const feedHtml = a.content || (a.summary ? `<p>${esc(a.summary)}</p>` : '');
  const plainLen = (html) => html.replace(/<[^>]+>/g, '').length;
  let body = feedHtml;
  let note = '';
  if (readerContentMode === 'full' && a.url) {
    if (status === 'loading') note = 'Der vollständige Artikel wird geladen …';
    else if (status === 'ok' && a.fulltext) body = plainLen(a.fulltext) >= plainLen(feedHtml) * 0.8 ? a.fulltext : feedHtml;
    else if (status === 'failed' || status === 'unavailable') {
      note = 'Der vollständige Artikel konnte nicht geladen werden – angezeigt wird der Inhalt aus dem Feed. <a href="#" data-retry>Erneut versuchen</a>';
    }
  }
  if (!body) body = '<p><em>Für diesen Artikel liegt kein Text vor. Über den Link unten kommst Du zur Originalseite.</em></p>';
  // Titelbild nur zeigen, wenn es nicht schon im Text vorkommt
  const imgKey = a.image ? a.image.split('?')[0].split('/').pop() : '';
  const hero = a.image && !(imgKey && body.includes(imgKey))
    ? `<img class="r-hero" src="${esc(a.image)}" alt="" referrerpolicy="no-referrer">` : '';
  return { body, note, hero };
}

function renderReader(status) {
  const a = state.reader;
  const { body, note, hero } = readerBody(a, status);
  const cats = catNames(a.categoryIds || []);
  let host = '';
  try {
    host = new URL(a.url || a.siteUrl).hostname.replace(/^www\./, '');
  } catch {}
  $('#reader-article').innerHTML = `
    <div class="r-meta">
      <span class="src">${favicon(a.sourceIcon, a.sourceTitle)} ${esc(a.sourceTitle || '')}</span>
      <span>${esc(fmtDate(a.publishedAt, true))}</span>
      ${cats.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}
      ${a.language ? `<span class="chip">${esc(langName(a.language))}</span>` : ''}
    </div>
    <h1 class="r-title">${esc(a.title)}</h1>
    ${a.author ? `<div class="r-author">von ${esc(a.author)}</div>` : ''}
    ${note ? `<div class="r-status">${note}</div>` : ''}
    ${hero}
    <div class="r-body">${body}</div>
    ${a.url ? `<div class="r-foot"><a class="btn" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${icon('external')} Artikel auf ${esc(host)} lesen</a></div>` : ''}
  `;
  // Inhalte kommen bereinigt vom Server; Links sicherheitshalber in neuem Tab öffnen
  for (const l of $$('.r-body a', $('#reader-article'))) {
    l.target = '_blank';
    l.rel = 'noopener noreferrer';
  }
  renderReaderBar();
}

async function openReader(idx) {
  const item = state.articles[idx];
  if (!item) return;
  state.selected = idx;
  state.readerIdx = idx;
  $$('#articles .art.selected').forEach((el) => el.classList.remove('selected'));
  $(`#articles .art[data-idx="${idx}"]`)?.classList.add('selected');
  $('#reader').hidden = false;
  $('#typo-panel').hidden = true;
  applyReaderStyle();
  readerContentMode = state.settings.autoFulltext ? 'full' : 'feed';
  state.reader = { ...item, content: null };
  renderReader(readerContentMode === 'full' ? 'loading' : null);
  $('#reader-scroll').scrollTop = 0;

  const myId = item.id;
  const [full] = await Promise.all([
    api(`/articles/${item.id}`).catch(() => null),
    api(`/articles/${item.id}/opened`, { method: 'POST', body: { markRead: state.settings.markReadOnOpen } }).catch(() => null),
  ]);
  if (state.reader?.id !== myId) return;
  if (full) Object.assign(state.reader, full);
  if (state.settings.markReadOnOpen && !item.readAt) {
    item.readAt = Date.now();
    state.reader.readAt = item.readAt;
    adjustCounts(item, -1);
    renderSidebar();
    updateArticleEl(idx);
    state.counts.history = (state.counts.history || 0) + 1;
  }
  if (readerContentMode === 'full' && state.reader.url) await loadReaderFulltext();
  else renderReader(null);
}

async function loadReaderFulltext(force = false) {
  const a = state.reader;
  if (!a?.url) return renderReader(null);
  renderReader('loading');
  try {
    const r = await api(`/articles/${a.id}/fulltext${force ? '?force=1' : ''}`);
    if (state.reader?.id !== a.id) return;
    a.fulltext = r.html;
    renderReader(r.status);
  } catch {
    if (state.reader?.id === a.id) renderReader('failed');
  }
}

$('#reader-article').addEventListener('click', (e) => {
  if (e.target.closest('[data-retry]')) {
    e.preventDefault();
    loadReaderFulltext(true);
  }
});

function closeReader() {
  $('#reader').hidden = true;
  state.reader = null;
  state.readerIdx = -1;
  const el = $(`#articles .art[data-idx="${state.selected}"]`);
  el?.scrollIntoView({ block: 'nearest' });
}

async function readerStep(dir) {
  let idx = (state.readerIdx ?? state.selected) + dir;
  if (idx >= state.articles.length && !state.done) {
    await loadMore();
  }
  if (idx < 0 || idx >= state.articles.length) return;
  openReader(idx);
  $(`#articles .art[data-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' });
}

$('#r-close').addEventListener('click', closeReader);
$('#r-prev').addEventListener('click', () => readerStep(-1));
$('#r-next').addEventListener('click', () => readerStep(1));
$('#r-fav').addEventListener('click', () => {
  const idx = state.articles.findIndex((x) => x.id === state.reader.id);
  toggleFavorite(idx >= 0 ? state.articles[idx] : state.reader, idx);
});
$('#r-read').addEventListener('click', () => {
  const idx = state.articles.findIndex((x) => x.id === state.reader.id);
  setRead(idx >= 0 ? state.articles[idx] : state.reader, idx, !state.reader.readAt);
});
$('#r-fulltext').addEventListener('click', () => {
  readerContentMode = readerContentMode === 'full' ? 'feed' : 'full';
  if (readerContentMode === 'full' && !state.reader.fulltext) loadReaderFulltext();
  else renderReader(state.reader.fulltext ? 'ok' : null);
});

// ================================================================ Quelle hinzufügen
const addDlg = $('#dlg-add');
const subDlg = $('#dlg-subscribe');
$('#btn-add').addEventListener('click', () => openAddDialog());

function openAddDialog(tab = 'url') {
  switchTab(tab);
  const web = state.search?.web;
  $('#search-hint').innerHTML =
    'Gesucht wird nach passenden Feeds' +
    (web === 'brave' ? ' und Webseiten (über Brave Search).' : web === 'duckduckgo' ? ' und Webseiten (über DuckDuckGo – ohne API-Schlüssel, daher nicht immer zuverlässig).' : '.') +
    ' Ein Klick auf <b>Abonnieren</b> prüft die Seite und zeigt die Optionen an.';
  addDlg.showModal();
  $(tab === 'url' ? '#add-url' : '#add-search').focus();
}
function switchTab(tab) {
  $$('#dlg-add .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  $$('#dlg-add [data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== tab));
}
$$('#dlg-add .tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

$('#add-url-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const url = $('#add-url').value.trim();
  if (url) discoverUrl(url, {}, e.submitter || $('#add-url-form button[type=submit]'));
});

// Prüft eine Adresse und öffnet bei Erfolg den Abonnieren-Dialog.
// Fehler erscheinen als schwebende Meldung, der Inhalt des Dialogs bleibt, wo er ist.
async function discoverUrl(url, hint = {}, btn = null) {
  const label = btn?.innerHTML;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Prüfe …';
  }
  try {
    const d = await api('/discover', { method: 'POST', body: { url, fallbackUrl: hint.siteUrl || undefined } });
    if (!d.feeds.length && !d.page) throw new Error('Unter dieser Adresse wurde nichts Abonnierbares gefunden.');
    openSubscribeDialog(d, hint);
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  }
}

function categoryPicker(selected = []) {
  return `
    <div class="cat-picker">
      ${state.categories.map((c) => `<label><input type="checkbox" value="${c.id}" ${selected.includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}
      <button type="button" class="btn small" data-new-cat>+ Neue Kategorie</button>
    </div>`;
}
// Ausgewählte Kategorien immer nur innerhalb des jeweiligen Dialogs lesen
const pickedCategories = (root) => $$('.cat-picker input:checked', root).map((x) => Number(x.value));

async function handleNewCatInPicker(container) {
  const checked = pickedCategories(container);
  const c = await newCategory();
  if (c) container.outerHTML = categoryPicker([...checked, c.id]);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-new-cat]');
  if (b) handleNewCatInPicker(b.closest('.cat-picker'));
});

let subscribeOpts = [];
function openSubscribeDialog(d, hint = {}) {
  const opts = [...d.feeds];
  // „Webseite beobachten“ nur anbieten, wenn dort Artikel erkannt wurden (oder es keinen Feed gibt)
  if (d.page && (d.page.count > 0 || !d.feeds.length)) opts.push(d.page);
  subscribeOpts = opts;
  const already = (o) => state.subs.find((s) => s.url === o.url && s.type === o.type);
  const firstFree = Math.max(0, opts.findIndex((o) => !already(o)));
  const preselected = state.filters.category && state.filters.category !== 'none' ? [Number(state.filters.category)] : [];
  const optHtml = opts.map((o, i) => `
    <label class="option">
      <input type="radio" name="opt" value="${i}" ${i === firstFree ? 'checked' : ''}>
      <div>
        <div><b>${o.type === 'rss' ? icon('rss') + ' Feed' : icon('globe') + ' Webseite ohne Feed beobachten'}:</b> ${esc(o.title)}
          ${already(o) ? '<span class="chip">bereits abonniert</span>' : ''}</div>
        <div class="muted small">${esc(o.url)} · ${o.count} Artikel gefunden${o.language ? ' · ' + esc(langName(o.language)) : ''}</div>
        ${o.description ? `<div class="small">${esc(o.description).slice(0, 220)}</div>` : ''}
      </div>
      ${o.samples?.length ? `<ul class="samples">${o.samples.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${o.type === 'scrape' ? `
        <details>
          <summary class="small">Erweitert: CSS-Selektor für Artikel-Links</summary>
          <p class="small muted">Optional. Werden zu viele oder falsche Links erkannt, kannst Du hier einen CSS-Selektor angeben, z. B. <code>article h2 a</code> oder <code>.teaser</code>.</p>
          <input class="selector-input" data-i="${i}" placeholder="z. B. article h2 a" style="width:100%">
        </details>` : ''}
    </label>`).join('');
  $('#subscribe-body').innerHTML = `
    ${d.note ? `<p class="notice">${esc(d.note)}</p>` : ''}
    <div class="field"><span>Was möchtest Du abonnieren?</span>${optHtml}</div>
    ${!d.feeds.length && d.page ? '<p class="small muted">Für diese Seite wurde kein RSS-Feed gefunden. Sie wird stattdessen regelmäßig nach neuen Artikeln durchsucht.</p>' : ''}
    <label class="field"><span>Name</span><input id="add-title" value="${esc(hint.title || opts[firstFree].title || '')}"></label>
    <div class="field"><span>Kategorien</span>${categoryPicker(preselected)}</div>
  `;
  $$('#subscribe-body input[name=opt]').forEach((r) =>
    r.addEventListener('change', () => {
      $('#add-title').value = opts[Number(r.value)].title || '';
    }),
  );
  const btn = $('#subscribe-confirm');
  btn.disabled = false;
  btn.innerHTML = `${icon('plus')} Abonnieren`;
  subDlg.showModal();
  $('#subscribe-body').scrollTop = 0;
}

$('#subscribe-cancel').addEventListener('click', () => subDlg.close());
$('#subscribe-confirm').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const i = Number($('#subscribe-body input[name=opt]:checked').value);
  const o = subscribeOpts[i];
  btn.disabled = true;
  btn.textContent = 'Wird abonniert …';
  try {
    const sub = await api('/subscriptions', {
      method: 'POST',
      body: {
        type: o.type,
        url: o.url,
        title: $('#add-title').value.trim(),
        categoryIds: pickedCategories(subDlg),
        selector: $(`#subscribe-body .selector-input[data-i="${i}"]`)?.value.trim() || undefined,
      },
    });
    subDlg.close();
    addDlg.close();
    toast(`„${sub.title}“ abonniert`);
    if (sub.lastError) toast(`Hinweis: ${sub.lastError}`, true);
    await reloadMeta();
    select({ subscription: sub.id });
  } catch (err) {
    toast(err.message, true);
    btn.disabled = false;
    btn.innerHTML = `${icon('plus')} Abonnieren`;
  }
});

function ageHint(ts) {
  if (!ts) return '';
  const days = Math.floor((Date.now() - ts) / DAY);
  if (days > 90) return ` · <span class="warn-text">seit ${days > 365 ? 'über einem Jahr' : days + ' Tagen'} nicht aktualisiert</span>`;
  return ` · zuletzt aktualisiert ${esc(fmtDate(ts))}`;
}

$('#add-search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const qy = $('#add-search').value.trim();
  if (!qy) return;
  const box = $('#search-results');
  box.innerHTML = '<p class="muted">Suche läuft …</p>';
  try {
    const r = await api('/search?q=' + encodeURIComponent(qy));
    const row = (x) => `
      <div class="result">
        ${favicon(x.icon, x.title)}
        <div style="min-width:0">
          <div class="r-title">${esc(x.title || x.url)}</div>
          <div class="r-url">${esc(x.kind === 'feed' ? x.url : x.siteUrl || x.url)}</div>
          ${x.description ? `<div class="r-desc">${esc(x.description)}</div>` : ''}
          ${x.kind === 'feed' ? `<div class="small muted">${x.subscribers ? x.subscribers.toLocaleString('de-DE') + ' Abonnenten bei Feedly' : 'Feed'}${x.language ? ' · ' + esc(langName(x.language)) : ''}${ageHint(x.lastUpdated)}</div>` : ''}
        </div>
        <button class="btn small primary" data-url="${esc(x.url)}" data-site="${esc(x.kind === 'feed' ? x.siteUrl || '' : '')}" data-title="${esc(x.title || '')}">Abonnieren</button>
      </div>`;
    let html = '';
    if (r.feeds.length) html += `<div class="results-head">Feeds</div>${r.feeds.map(row).join('')}`;
    if (r.pages.length) html += `<div class="results-head">Webseiten</div>${r.pages.map(row).join('')}`;
    if (!html) html = '<p class="muted">Leider nichts gefunden. Versuch es mit anderen Suchbegriffen.</p>';
    if (r.errors?.length) html += `<p class="small error">${r.errors.map(esc).join('<br>')}</p>`;
    box.innerHTML = html;
  } catch (err) {
    box.innerHTML = `<p class="error">${esc(err.message)}</p>`;
  }
});
$('#search-results').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-url]');
  if (b) discoverUrl(b.dataset.url, { title: b.dataset.title, siteUrl: b.dataset.site }, b);
});

// ================================================================ Abo bearbeiten
function editSubscription(id) {
  const s = state.subs.find((x) => x.id === id);
  if (!s) return;
  $('#sub-body').innerHTML = `
    <label class="field"><span>Name</span><input id="sub-title" value="${esc(s.title)}" placeholder="${esc(s.sourceTitle || '')}"></label>
    <div class="field"><span>Kategorien</span>${categoryPicker(s.categoryIds)}</div>
    ${s.type === 'scrape' ? `
      <label class="field"><span>CSS-Selektor für Artikel-Links (optional)</span>
        <input id="sub-selector" value="${esc(s.selector || '')}" placeholder="automatische Erkennung">
      </label>` : ''}
    <dl class="kv">
      <dt>Typ</dt><dd>${s.type === 'rss' ? 'RSS-/Atom-Feed' : 'Webseite ohne Feed'}</dd>
      <dt>Adresse</dt><dd><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url)}</a></dd>
      ${s.siteUrl && s.siteUrl !== s.url ? `<dt>Webseite</dt><dd><a href="${esc(s.siteUrl)}" target="_blank" rel="noopener noreferrer">${esc(s.siteUrl)}</a></dd>` : ''}
      ${s.language ? `<dt>Sprache</dt><dd>${esc(langName(s.language))}</dd>` : ''}
      <dt>Zuletzt abgerufen</dt><dd>${s.lastFetchedAt ? esc(fmtDate(s.lastFetchedAt, true)) : '–'}</dd>
      ${s.lastError ? `<dt>Fehler</dt><dd class="error">${esc(s.lastError)}</dd>` : ''}
    </dl>
    <div class="row" style="justify-content:space-between;flex-wrap:wrap">
      <button class="btn danger" id="sub-remove">${icon('trash')} Abo entfernen</button>
      <div class="row">
        <button class="btn" id="sub-refresh">${icon('refresh')} Aktualisieren</button>
        <button class="btn primary" id="sub-save">Speichern</button>
      </div>
    </div>`;
  $('#sub-remove').onclick = () => removeSub(id);
  $('#sub-refresh').onclick = () => refreshSub(id);
  $('#sub-save').onclick = async () => {
    try {
      await api(`/subscriptions/${id}`, {
        method: 'PATCH',
        body: {
          title: $('#sub-title').value.trim(),
          categoryIds: pickedCategories($('#sub-body')),
          ...(s.type === 'scrape' ? { selector: $('#sub-selector').value.trim() } : {}),
        },
      });
      $('#dlg-sub').close();
      toast('Gespeichert');
      await reloadMeta();
      if (s.type === 'scrape' && $('#sub-selector')?.value.trim() !== (s.selector || '')) refreshSub(id);
    } catch (e) {
      toast(e.message, true);
    }
  };
  $('#dlg-sub').showModal();
}

// ================================================================ Einstellungen
$('#btn-settings').addEventListener('click', openSettings);

function openSettings() {
  const s = state.settings;
  const radio = (name, value, label, cur) =>
    `<label class="check"><input type="radio" name="${name}" value="${value}" ${cur === value ? 'checked' : ''}> ${label}</label>`;
  const check = (key, label) =>
    `<label class="check"><input type="checkbox" data-key="${key}" ${s[key] ? 'checked' : ''}> ${label}</label>`;
  $('#settings-body').innerHTML = `
    <div class="settings-group">
      <h3>Zähler in der Seitenleiste</h3>
      <div class="radio-list">
        ${radio('countMode', 'today', 'Neue Nachrichten heute', s.countMode)}
        ${radio('countMode', 'all', 'Neue Nachrichten insgesamt', s.countMode)}
        ${radio('countMode', 'week', 'Diese Woche (ab Montag)', s.countMode)}
        ${radio('countMode', 'days7', 'Letzte sieben Tage', s.countMode)}
        ${radio('countMode', 'month', 'Dieser Monat', s.countMode)}
        ${radio('countMode', 'days30', 'Letzte 30 Tage', s.countMode)}
      </div>
    </div>
    <div class="settings-group">
      <h3>Artikelansicht</h3>
      <div class="radio-list">
        ${radio('viewMode', 'details', 'Liste mit Details', s.viewMode)}
        ${radio('viewMode', 'magazine', 'Liste mit Bild', s.viewMode)}
        ${radio('viewMode', 'tiles', 'Kacheln', s.viewMode)}
      </div>
      ${check('unreadOnly', 'Nur ungelesene Artikel anzeigen')}
    </div>
    <div class="settings-group">
      <h3>Lesen</h3>
      ${check('markReadOnOpen', 'Artikel beim Öffnen als gelesen markieren')}
      ${check('autoFulltext', 'Vollständigen Artikel automatisch von der Webseite laden')}
      <p class="small muted">Schriftgröße, Schriftart und Farben stellst Du direkt in der Leseansicht über das <b>Tt</b>-Symbol ein.</p>
    </div>
    <div class="settings-group">
      <h3>Erscheinungsbild</h3>
      <div class="radio-list">
        ${radio('appTheme', 'auto', 'Wie das System', s.appTheme)}
        ${radio('appTheme', 'light', 'Hell', s.appTheme)}
        ${radio('appTheme', 'dark', 'Dunkel', s.appTheme)}
      </div>
    </div>
    <div class="settings-group">
      <h3>Abos importieren &amp; exportieren (OPML)</h3>
      <p class="small muted">Damit kannst Du z. B. Deine Abos aus Inoreader übernehmen (dort: Einstellungen → Import/Export → OPML exportieren).</p>
      <div class="row">
        <a class="btn" href="/api/opml" download>Exportieren</a>
        <label class="btn">Importieren … <input type="file" id="opml-file" accept=".opml,.xml,text/xml" hidden></label>
      </div>
    </div>
    <div class="settings-group">
      <h3>Verlauf</h3>
      <div class="row">
        <button class="btn danger" id="set-clear-history">${icon('trash')} Gesamten Verlauf löschen</button>
      </div>
    </div>
    <div class="settings-group">
      <h3>Konto: ${esc(state.user.username)}</h3>
      <form id="pw-form" class="field">
        <input type="password" name="current" placeholder="Aktuelles Passwort" autocomplete="current-password" required>
        <input type="password" name="password" placeholder="Neues Passwort (mind. 8 Zeichen)" autocomplete="new-password" minlength="8" required>
        <div class="row"><button class="btn">Passwort ändern</button>
        <button type="button" class="btn" id="btn-logout">${icon('logout')} Abmelden</button></div>
      </form>
    </div>
    <p class="small muted">Tastenkürzel: <b>j/k</b> nächster/vorheriger Artikel · <b>o</b> öffnen · <b>s</b> Favorit · <b>m</b> gelesen/ungelesen · <b>v</b> Original öffnen · <b>r</b> aktualisieren · <b>/</b> suchen · <b>1/2/3</b> Ansicht · <b>Esc</b> schließen</p>
  `;
  const body = $('#settings-body');
  body.addEventListener('change', onSettingsChange);
  $('#set-clear-history').onclick = clearHistory;
  $('#btn-logout').onclick = async () => {
    await api('/logout', { method: 'POST', body: {} });
    if (state.logoutUrl) return location.assign(state.logoutUrl);
    location.hash = '';
    location.reload();
  };
  $('#pw-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/password', { method: 'POST', body: { current: e.target.current.value, password: e.target.password.value } });
      e.target.reset();
      toast('Passwort geändert');
    } catch (err) {
      toast(err.message, true);
    }
  };
  $('#opml-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const r = await api('/opml', { method: 'POST', body: await file.text(), raw: true });
      toast(`${r.added} Abos importiert – die Artikel werden jetzt abgerufen …`);
      if (r.failed.length) toast(`${r.failed.length} Einträge konnten nicht importiert werden`, true);
      await reloadMeta();
      watchRefresh();
    } catch (err) {
      toast(err.message, true);
    }
  };
  $('#dlg-settings').showModal();
}

async function onSettingsChange(e) {
  const t = e.target;
  if (t.type === 'radio') {
    await saveSettings({ [t.name]: t.value });
    if (t.name === 'countMode') {
      await loadCounts();
      renderSidebar();
    }
    if (t.name === 'viewMode') {
      renderHead();
      renderArticles();
    }
    if (t.name === 'appTheme') applyAppTheme();
  } else if (t.type === 'checkbox' && t.dataset.key) {
    await saveSettings({ [t.dataset.key]: t.checked });
    if (t.dataset.key === 'unreadOnly') {
      renderHead();
      reloadArticles();
    }
  }
}

// ================================================================ Aktualisieren
let watching = false;
async function watchRefresh() {
  if (watching) return;
  watching = true;
  $('#btn-refresh').classList.add('spin');
  const before = state.counts.all;
  try {
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const s = await api('/status');
      await loadCounts();
      renderSidebar();
      if (!s.refreshing) break;
    }
    await reloadMeta();
    const diff = (state.counts.all || 0) - (before || 0);
    toast(diff > 0 ? `${diff} neue Artikel` : 'Alles aktuell');
    if (!state.reader) reloadArticles();
  } finally {
    watching = false;
    $('#btn-refresh').classList.remove('spin');
  }
}
$('#btn-refresh').addEventListener('click', async () => {
  await api('/refresh', { method: 'POST', body: {} });
  watchRefresh();
});

// Zähler regelmäßig im Hintergrund auffrischen
setInterval(async () => {
  if (!state.user || document.hidden) return;
  try {
    await loadCounts();
    renderSidebar();
  } catch {}
}, 3 * 60_000);

// ================================================================ Tastatur
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) {
    if (e.key === 'Escape' && e.target.id === 'search') e.target.blur();
    return;
  }
  if ($('dialog[open]')) return;
  const inReader = !$('#reader').hidden;
  const cur = state.articles[inReader ? state.readerIdx : state.selected];
  switch (e.key) {
    case 'Escape':
      if (!$('#typo-panel').hidden) $('#typo-panel').hidden = true;
      else if (inReader) closeReader();
      break;
    case 'j':
    case 'n':
      if (inReader) readerStep(1);
      else selectStep(1);
      break;
    case 'k':
    case 'p':
      if (inReader) readerStep(-1);
      else selectStep(-1);
      break;
    case 'o':
    case 'Enter':
      if (!inReader && state.selected >= 0) openReader(state.selected);
      break;
    case 's':
    case 'f':
      if (cur) toggleFavorite(cur, state.articles.indexOf(cur));
      break;
    case 'm':
      if (cur) setRead(cur, state.articles.indexOf(cur), !cur.readAt);
      break;
    case 'v':
      if (cur?.url) window.open(cur.url, '_blank', 'noopener');
      break;
    case 'r':
      $('#btn-refresh').click();
      break;
    case '/':
      e.preventDefault();
      $('#search').focus();
      break;
    case '1': setViewMode('details'); break;
    case '2': setViewMode('magazine'); break;
    case '3': setViewMode('tiles'); break;
    default:
      return;
  }
});

function selectStep(dir) {
  const idx = Math.max(0, Math.min(state.articles.length - 1, state.selected + dir));
  state.selected = idx;
  $$('#articles .art.selected').forEach((el) => el.classList.remove('selected'));
  const el = $(`#articles .art[data-idx="${idx}"]`);
  el?.classList.add('selected');
  el?.scrollIntoView({ block: 'nearest' });
  if (idx >= state.articles.length - 3) loadMore();
}

window.addEventListener('hashchange', () => {
  readHash();
  renderAll();
  reloadArticles();
});

applyIcons();
$('#btn-menu').innerHTML = icon('menu');
boot().catch((e) => {
  console.error(e);
  if (e.message !== 'Nicht angemeldet') toast(e.message, true);
});
