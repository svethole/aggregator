import express from 'express';
import crypto from 'node:crypto';
import { DOMParser } from 'linkedom';
import { q, tx } from './db.js';
import {
  requireUser, sessionUser, startSession, endSession, needsSetup, createUser, verifyPassword, setPassword,
  loginAllowed, loginFailed, loginSucceeded,
} from './auth.js';
import { discoverWithFallback, ensureSource, refreshSource, refreshAll, isRefreshing } from './feeds.js';
import { loadFulltext } from './fulltext.js';
import { searchSources, searchInfo } from './search.js';
import { normalizeUrl } from './http.js';
import { config } from './config.js';

export const api = express.Router();

// Einmaliger Code für die Ersteinrichtung (steht im Server-Log)
export const setupCode = crypto.randomBytes(4).toString('hex');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const intOrNull = (v) => (v === undefined || v === null || v === '' ? null : Number.parseInt(v, 10));
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

// Schutz gegen CSRF: schreibende Anfragen müssen JSON sein (Formulare fremder Seiten können das nicht)
api.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const ct = req.headers['content-type'] || '';
    if (!ct.startsWith('application/json') && req.headers['x-requested-with'] !== 'aggregator') {
      return bad(res, 'Ungültige Anfrage', 415);
    }
  }
  next();
});

// ------------------------------------------------------------------ Anmeldung

api.get('/session', (req, res) => {
  const user = sessionUser(req, res);
  res.json({
    user,
    setup: !user && needsSetup(),
    search: user ? searchInfo() : null,
    logoutUrl: user ? config.logoutUrl || null : null,
  });
});

api.post('/setup', (req, res) => {
  if (!needsSetup()) return bad(res, 'Die Einrichtung ist bereits abgeschlossen', 403);
  const { username, password, code } = req.body || {};
  if (String(code || '').trim().toLowerCase() !== setupCode) return bad(res, 'Der Einrichtungscode stimmt nicht', 403);
  try {
    const id = createUser(String(username || '').trim(), password);
    startSession(res, id);
    res.json({ ok: true });
  } catch (err) {
    bad(res, err.message);
  }
});

api.post('/login', (req, res) => {
  const ip = req.ip;
  if (!loginAllowed(ip)) return bad(res, 'Zu viele Fehlversuche. Bitte später erneut versuchen.', 429);
  const { username, password } = req.body || {};
  const user = q('SELECT * FROM users WHERE username = ?').get(String(username || '').trim());
  if (!user || !verifyPassword(password || '', user.password_hash)) {
    loginFailed(ip);
    return bad(res, 'Benutzername oder Passwort ist falsch', 401);
  }
  loginSucceeded(ip);
  startSession(res, user.id);
  res.json({ ok: true });
});

api.post('/logout', (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

// Ab hier nur für angemeldete Benutzer
api.use(requireUser);

api.post('/password', (req, res) => {
  const { current, password } = req.body || {};
  const user = q('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!verifyPassword(current || '', user.password_hash)) return bad(res, 'Das aktuelle Passwort ist falsch', 403);
  try {
    setPassword(req.user.id, password);
    startSession(res, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    bad(res, err.message);
  }
});

// ------------------------------------------------------------------ Einstellungen

export const DEFAULT_SETTINGS = {
  countMode: 'today', // all | today | week | days7 | month | days30
  viewMode: 'details', // details | magazine | tiles
  unreadOnly: false,
  markReadOnOpen: true,
  autoFulltext: true,
  appTheme: 'auto',
  readerFontSize: 19,
  readerFont: 'serif',
  readerTheme: 'light',
  readerWidth: 'medium',
  readerLineHeight: 1.6,
  collapsedCategories: [],
};

function getSettings(userId) {
  const out = { ...DEFAULT_SETTINGS };
  for (const r of q('SELECT key, value FROM settings WHERE user_id = ?').all(userId)) {
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {}
  }
  return out;
}

api.get('/settings', (req, res) => res.json(getSettings(req.user.id)));

api.put('/settings', (req, res) => {
  const body = req.body || {};
  tx(() => {
    for (const [k, v] of Object.entries(body)) {
      if (!(k in DEFAULT_SETTINGS)) continue;
      q('INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value').run(
        req.user.id,
        k,
        JSON.stringify(v),
      );
    }
  });
  res.json(getSettings(req.user.id));
});

// ------------------------------------------------------------------ Kategorien

api.get('/categories', (req, res) => {
  res.json(q('SELECT id, name, position FROM categories WHERE user_id = ? ORDER BY position, name COLLATE NOCASE').all(req.user.id));
});

api.post('/categories', (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 80);
  if (!name) return bad(res, 'Bitte einen Namen angeben');
  const existing = q('SELECT id, name, position FROM categories WHERE user_id = ? AND name = ?').get(req.user.id, name);
  if (existing) return res.json(existing);
  const { m } = q('SELECT COALESCE(MAX(position), 0) AS m FROM categories WHERE user_id = ?').get(req.user.id);
  res.json(q('INSERT INTO categories (user_id, name, position) VALUES (?, ?, ?) RETURNING id, name, position').get(req.user.id, name, m + 1));
});

api.patch('/categories/:id', (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 80);
  if (!name) return bad(res, 'Bitte einen Namen angeben');
  try {
    q('UPDATE categories SET name = ? WHERE id = ? AND user_id = ?').run(name, req.params.id, req.user.id);
  } catch {
    return bad(res, 'Diese Kategorie gibt es schon');
  }
  res.json({ ok: true });
});

api.post('/categories/order', (req, res) => {
  const ids = (req.body?.ids || []).map(Number);
  tx(() => ids.forEach((id, i) => q('UPDATE categories SET position = ? WHERE id = ? AND user_id = ?').run(i + 1, id, req.user.id)));
  res.json({ ok: true });
});

api.delete('/categories/:id', (req, res) => {
  q('DELETE FROM categories WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ------------------------------------------------------------------ Abos

function listSubscriptions(userId, id) {
  const rows = q(`
    SELECT sub.id, sub.source_id AS sourceId, COALESCE(sub.title, s.title) AS title, s.title AS sourceTitle, s.type, s.url,
           s.site_url AS siteUrl, s.icon_url AS icon, s.language, s.selector, s.last_error AS lastError,
           s.last_fetched_at AS lastFetchedAt, s.last_success_at AS lastSuccessAt,
           (SELECT group_concat(category_id) FROM subscription_categories WHERE subscription_id = sub.id) AS cats
    FROM subscriptions sub JOIN sources s ON s.id = sub.source_id
    WHERE sub.user_id = ? AND (? IS NULL OR sub.id = ?)
    ORDER BY COALESCE(sub.title, s.title) COLLATE NOCASE
  `).all(userId, id ?? null, id ?? null);
  return rows.map(({ cats, ...r }) => ({ ...r, categoryIds: cats ? String(cats).split(',').map(Number) : [] }));
}

function setSubscriptionCategories(userId, subId, categoryIds) {
  q('DELETE FROM subscription_categories WHERE subscription_id = ?').run(subId);
  for (const cid of new Set((categoryIds || []).map(Number))) {
    const ok = q('SELECT 1 FROM categories WHERE id = ? AND user_id = ?').get(cid, userId);
    if (ok) q('INSERT OR IGNORE INTO subscription_categories (subscription_id, category_id) VALUES (?, ?)').run(subId, cid);
  }
}

api.get('/subscriptions', (req, res) => res.json(listSubscriptions(req.user.id)));

api.post('/discover', wrap(async (req, res) => {
  try {
    res.json(await discoverWithFallback(req.body?.url, req.body?.fallbackUrl));
  } catch (err) {
    bad(res, `Die Adresse konnte nicht geprüft werden: ${err.message}`);
  }
}));

api.post('/subscriptions', wrap(async (req, res) => {
  const { type = 'rss', url, title, categoryIds, selector } = req.body || {};
  if (!['rss', 'scrape'].includes(type)) return bad(res, 'Unbekannter Typ');
  let source;
  try {
    source = await ensureSource({ type, url, title, selector });
  } catch (err) {
    return bad(res, `Die Quelle konnte nicht hinzugefügt werden: ${err.message}`);
  }
  const sub = tx(() => {
    const row =
      q('SELECT id FROM subscriptions WHERE user_id = ? AND source_id = ?').get(req.user.id, source.id) ||
      q('INSERT INTO subscriptions (user_id, source_id, title, created_at) VALUES (?, ?, ?, ?) RETURNING id').get(
        req.user.id,
        source.id,
        title && title !== source.title ? String(title).slice(0, 200) : null,
        Date.now(),
      );
    setSubscriptionCategories(req.user.id, row.id, categoryIds);
    return row;
  });
  // Ersten Abruf abwarten (max. 25 s), damit gleich Artikel sichtbar sind
  await Promise.race([refreshSource(source.id), new Promise((r) => setTimeout(r, 25000))]);
  res.json(listSubscriptions(req.user.id, sub.id)[0]);
}));

api.patch('/subscriptions/:id', (req, res) => {
  const sub = q('SELECT * FROM subscriptions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!sub) return bad(res, 'Abo nicht gefunden', 404);
  const { title, categoryIds, selector } = req.body || {};
  tx(() => {
    if (title !== undefined) q('UPDATE subscriptions SET title = ? WHERE id = ?').run(String(title).trim() || null, sub.id);
    if (categoryIds !== undefined) setSubscriptionCategories(req.user.id, sub.id, categoryIds);
    if (selector !== undefined) {
      q("UPDATE sources SET selector = ? WHERE id = ? AND type = 'scrape'").run(String(selector).trim() || null, sub.source_id);
    }
  });
  res.json(listSubscriptions(req.user.id, sub.id)[0]);
});

api.delete('/subscriptions/:id', (req, res) => {
  const sub = q('SELECT * FROM subscriptions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!sub) return bad(res, 'Abo nicht gefunden', 404);
  tx(() => {
    q('DELETE FROM subscriptions WHERE id = ?').run(sub.id);
    const others = q('SELECT 1 FROM subscriptions WHERE source_id = ?').get(sub.source_id);
    if (!others) {
      // Artikel entfernen, außer Favoriten und Verlauf
      q(`DELETE FROM articles WHERE source_id = ?
         AND id NOT IN (SELECT article_id FROM article_states WHERE favorite_at IS NOT NULL)
         AND id NOT IN (SELECT article_id FROM history)`).run(sub.source_id);
      q('DELETE FROM sources WHERE id = ? AND NOT EXISTS (SELECT 1 FROM articles WHERE source_id = ?)').run(sub.source_id, sub.source_id);
    }
  });
  res.json({ ok: true });
});

api.post('/subscriptions/:id/refresh', wrap(async (req, res) => {
  const sub = q('SELECT * FROM subscriptions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!sub) return bad(res, 'Abo nicht gefunden', 404);
  const r = await refreshSource(sub.source_id);
  res.json({ ...r, subscription: listSubscriptions(req.user.id, sub.id)[0] });
}));

api.post('/refresh', (req, res) => {
  const ids = q('SELECT source_id AS id FROM subscriptions WHERE user_id = ?').all(req.user.id).map((r) => r.id);
  refreshAll({ sourceIds: ids }).catch((e) => console.error('Aktualisierung fehlgeschlagen:', e));
  res.json({ started: true });
});

api.get('/status', (req, res) => res.json({ refreshing: isRefreshing() }));

api.get('/search', wrap(async (req, res) => {
  res.json(await searchSources(req.query.q));
}));

// ------------------------------------------------------------------ Zähler

api.get('/counts', (req, res) => {
  const uid = req.user.id;
  const since = Number(req.query.since) || 0;
  const subs = q(`
    SELECT sub.id, COUNT(a.id) AS n
    FROM subscriptions sub
    JOIN articles a ON a.source_id = sub.source_id AND a.published_at >= ?
    LEFT JOIN article_states st ON st.article_id = a.id AND st.user_id = sub.user_id
    WHERE sub.user_id = ? AND st.read_at IS NULL
    GROUP BY sub.id
  `).all(since, uid);
  const cats = q(`
    SELECT sc.category_id AS id, COUNT(DISTINCT a.id) AS n
    FROM subscriptions sub
    JOIN subscription_categories sc ON sc.subscription_id = sub.id
    JOIN articles a ON a.source_id = sub.source_id AND a.published_at >= ?
    LEFT JOIN article_states st ON st.article_id = a.id AND st.user_id = sub.user_id
    WHERE sub.user_id = ? AND st.read_at IS NULL
    GROUP BY sc.category_id
  `).all(since, uid);
  const categorized = new Set(
    q('SELECT DISTINCT sc.subscription_id AS id FROM subscription_categories sc JOIN subscriptions s ON s.id = sc.subscription_id WHERE s.user_id = ?')
      .all(uid)
      .map((r) => r.id),
  );
  const sources = Object.fromEntries(subs.map((r) => [r.id, r.n]));
  res.json({
    all: subs.reduce((s, r) => s + r.n, 0),
    uncategorized: subs.filter((r) => !categorized.has(r.id)).reduce((s, r) => s + r.n, 0),
    favorites: q('SELECT COUNT(*) AS n FROM article_states WHERE user_id = ? AND favorite_at IS NOT NULL').get(uid).n,
    history: q('SELECT COUNT(*) AS n FROM history WHERE user_id = ?').get(uid).n,
    sources,
    categories: Object.fromEntries(cats.map((r) => [r.id, r.n])),
  });
});

api.get('/languages', (req, res) => {
  const rows = q(`
    SELECT a.language AS code, COUNT(*) AS n FROM articles a
    JOIN subscriptions sub ON sub.source_id = a.source_id AND sub.user_id = ?
    WHERE a.language IS NOT NULL GROUP BY a.language ORDER BY n DESC
  `).all(req.user.id);
  res.json(rows);
});

// ------------------------------------------------------------------ Artikel

function buildArticleQuery(userId, p) {
  const view = ['favorites', 'history'].includes(p.view) ? p.view : 'all';
  const where = [];
  const args = [];
  let subJoin = view === 'all'
    ? 'JOIN subscriptions sub ON sub.source_id = a.source_id AND sub.user_id = ?'
    : 'LEFT JOIN subscriptions sub ON sub.source_id = a.source_id AND sub.user_id = ?';
  let extraJoin = '';
  let sortCol = 'a.published_at';
  if (view === 'favorites') {
    where.push('st.favorite_at IS NOT NULL');
    sortCol = 'st.favorite_at';
  }
  if (view === 'history') {
    extraJoin = 'JOIN history h ON h.article_id = a.id AND h.user_id = ?';
    sortCol = 'h.viewed_at';
  }
  const category = p.category;
  if (category === 'none') {
    where.push('sub.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM subscription_categories WHERE subscription_id = sub.id)');
  } else if (intOrNull(category)) {
    where.push('sub.id IN (SELECT subscription_id FROM subscription_categories WHERE category_id = ?)');
    args.push(intOrNull(category));
  }
  if (intOrNull(p.subscription)) {
    where.push('sub.id = ?');
    args.push(intOrNull(p.subscription));
  }
  if (p.lang) {
    const langs = String(p.lang).split(',').filter(Boolean);
    if (langs.includes('unknown')) {
      where.push(`(a.language IS NULL OR a.language IN (${langs.map(() => '?').join(',')}))`);
    } else {
      where.push(`a.language IN (${langs.map(() => '?').join(',')})`);
    }
    args.push(...langs);
  }
  if (intOrNull(p.from)) {
    where.push('a.published_at >= ?');
    args.push(intOrNull(p.from));
  }
  if (intOrNull(p.to)) {
    where.push('a.published_at < ?');
    args.push(intOrNull(p.to));
  }
  if (p.unread === '1' || p.unread === true) where.push('st.read_at IS NULL');
  if (p.q) {
    const like = `%${String(p.q).replace(/[%_\\]/g, (m) => '\\' + m)}%`;
    where.push("(a.title LIKE ? ESCAPE '\\' OR a.summary LIKE ? ESCAPE '\\')");
    args.push(like, like);
  }
  const joinArgs = view === 'history' ? [userId, userId, userId] : [userId, userId];
  const from = `
    FROM articles a
    JOIN sources s ON s.id = a.source_id
    ${subJoin}
    LEFT JOIN article_states st ON st.article_id = a.id AND st.user_id = ?
    ${extraJoin}
  `;
  return { from, where, args: [...joinArgs, ...args], sortCol, view };
}

api.get('/articles', (req, res) => {
  const p = req.query;
  const limit = Math.min(Math.max(intOrNull(p.limit) || 40, 1), 200);
  const { from, where, args, sortCol } = buildArticleQuery(req.user.id, p);
  if (p.cursor) {
    const [sv, id] = String(p.cursor).split(':').map(Number);
    where.push(`(${sortCol} < ? OR (${sortCol} = ? AND a.id < ?))`);
    args.push(sv, sv, id);
  }
  const rows = q(`
    SELECT a.id, a.url, a.title, a.author, a.summary, a.image_url AS image, a.language, a.published_at AS publishedAt,
           s.id AS sourceId, sub.id AS subscriptionId, COALESCE(sub.title, s.title) AS sourceTitle, s.icon_url AS sourceIcon,
           s.site_url AS siteUrl, st.read_at AS readAt, st.favorite_at AS favoriteAt, ${sortCol} AS sortVal,
           (SELECT group_concat(category_id) FROM subscription_categories WHERE subscription_id = sub.id) AS cats
    ${from}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${sortCol} DESC, a.id DESC
    LIMIT ${limit + 1}
  `).all(...args);
  const more = rows.length > limit;
  const items = rows.slice(0, limit).map(({ cats, sortVal, ...r }) => ({
    ...r,
    categoryIds: cats ? String(cats).split(',').map(Number) : [],
    _sort: sortVal,
  }));
  const last = items[items.length - 1];
  res.json({
    items: items.map(({ _sort, ...r }) => r),
    cursor: more && last ? `${last._sort}:${last.id}` : null,
  });
});

api.post('/articles/mark-read', (req, res) => {
  const p = { ...(req.body || {}), unread: '1' };
  const { from, where, args } = buildArticleQuery(req.user.id, p);
  if (intOrNull(p.before)) {
    where.push('a.fetched_at <= ?');
    args.push(intOrNull(p.before));
  }
  const ids = q(`SELECT a.id ${from} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`).all(...args).map((r) => r.id);
  const now = Date.now();
  tx(() => {
    for (const id of ids) {
      q(`INSERT INTO article_states (user_id, article_id, read_at) VALUES (?, ?, ?)
         ON CONFLICT (user_id, article_id) DO UPDATE SET read_at = COALESCE(read_at, excluded.read_at)`).run(req.user.id, id, now);
    }
  });
  res.json({ marked: ids.length });
});

function articleForUser(userId, id) {
  return q(`
    SELECT a.id, a.url, a.title, a.author, a.summary, a.content, a.image_url AS image, a.language, a.published_at AS publishedAt,
           a.fulltext_status AS fulltextStatus, s.id AS sourceId, sub.id AS subscriptionId,
           COALESCE(sub.title, s.title) AS sourceTitle, s.icon_url AS sourceIcon, s.site_url AS siteUrl, s.type AS sourceType,
           st.read_at AS readAt, st.favorite_at AS favoriteAt,
           (SELECT group_concat(category_id) FROM subscription_categories WHERE subscription_id = sub.id) AS cats
    FROM articles a JOIN sources s ON s.id = a.source_id
    LEFT JOIN subscriptions sub ON sub.source_id = a.source_id AND sub.user_id = ?
    LEFT JOIN article_states st ON st.article_id = a.id AND st.user_id = ?
    WHERE a.id = ? AND (sub.id IS NOT NULL OR st.favorite_at IS NOT NULL
      OR EXISTS (SELECT 1 FROM history WHERE user_id = ? AND article_id = a.id))
  `).get(userId, userId, id, userId);
}

api.get('/articles/:id', (req, res) => {
  const a = articleForUser(req.user.id, req.params.id);
  if (!a) return bad(res, 'Artikel nicht gefunden', 404);
  const { cats, ...rest } = a;
  res.json({ ...rest, categoryIds: cats ? String(cats).split(',').map(Number) : [] });
});

api.post('/articles/:id/state', (req, res) => {
  const a = articleForUser(req.user.id, req.params.id);
  if (!a) return bad(res, 'Artikel nicht gefunden', 404);
  const { read, favorite } = req.body || {};
  const now = Date.now();
  q('INSERT OR IGNORE INTO article_states (user_id, article_id) VALUES (?, ?)').run(req.user.id, a.id);
  if (read !== undefined) q('UPDATE article_states SET read_at = ? WHERE user_id = ? AND article_id = ?').run(read ? now : null, req.user.id, a.id);
  if (favorite !== undefined) {
    q('UPDATE article_states SET favorite_at = ? WHERE user_id = ? AND article_id = ?').run(favorite ? now : null, req.user.id, a.id);
  }
  const st = q('SELECT read_at AS readAt, favorite_at AS favoriteAt FROM article_states WHERE user_id = ? AND article_id = ?').get(req.user.id, a.id);
  res.json(st);
});

// Artikel wurde geöffnet: in den Verlauf aufnehmen (und ggf. als gelesen markieren)
api.post('/articles/:id/opened', (req, res) => {
  const a = articleForUser(req.user.id, req.params.id);
  if (!a) return bad(res, 'Artikel nicht gefunden', 404);
  const now = Date.now();
  q(`INSERT INTO history (user_id, article_id, viewed_at) VALUES (?, ?, ?)
     ON CONFLICT (user_id, article_id) DO UPDATE SET viewed_at = excluded.viewed_at`).run(req.user.id, a.id, now);
  if (req.body?.markRead) {
    q(`INSERT INTO article_states (user_id, article_id, read_at) VALUES (?, ?, ?)
       ON CONFLICT (user_id, article_id) DO UPDATE SET read_at = COALESCE(read_at, excluded.read_at)`).run(req.user.id, a.id, now);
  }
  res.json({ ok: true });
});

api.get('/articles/:id/fulltext', wrap(async (req, res) => {
  const a = articleForUser(req.user.id, req.params.id);
  if (!a) return bad(res, 'Artikel nicht gefunden', 404);
  res.json(await loadFulltext(a.id, { force: req.query.force === '1' }));
}));

// ------------------------------------------------------------------ Verlauf

api.delete('/history', (req, res) => {
  const { olderThan } = req.query;
  if (intOrNull(olderThan)) q('DELETE FROM history WHERE user_id = ? AND viewed_at < ?').run(req.user.id, intOrNull(olderThan));
  else q('DELETE FROM history WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

api.delete('/history/:articleId', (req, res) => {
  q('DELETE FROM history WHERE user_id = ? AND article_id = ?').run(req.user.id, req.params.articleId);
  res.json({ ok: true });
});

// ------------------------------------------------------------------ OPML (Import/Export, z. B. von Inoreader)

const xmlEsc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);

api.get('/opml', (req, res) => {
  const subs = listSubscriptions(req.user.id);
  const cats = q('SELECT id, name FROM categories WHERE user_id = ? ORDER BY position, name').all(req.user.id);
  const line = (s) =>
    `<outline type="${s.type === 'rss' ? 'rss' : 'link'}" text="${xmlEsc(s.title)}" title="${xmlEsc(s.title)}" ` +
    `${s.type === 'rss' ? 'xmlUrl' : 'url'}="${xmlEsc(s.url)}" htmlUrl="${xmlEsc(s.siteUrl || s.url)}"` +
    `${s.selector ? ` aggregatorSelector="${xmlEsc(s.selector)}"` : ''}/>`;
  let body = '';
  for (const c of cats) {
    const inCat = subs.filter((s) => s.categoryIds.includes(c.id));
    if (!inCat.length) continue;
    body += `    <outline text="${xmlEsc(c.name)}" title="${xmlEsc(c.name)}">\n${inCat.map((s) => '      ' + line(s)).join('\n')}\n    </outline>\n`;
  }
  for (const s of subs.filter((s) => !s.categoryIds.length)) body += `    ${line(s)}\n`;
  res.setHeader('Content-Type', 'text/x-opml; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="aggregator-abos.opml"');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>Aggregator – Abos</title><dateCreated>${new Date().toUTCString()}</dateCreated></head>\n  <body>\n${body}  </body>\n</opml>\n`);
});

api.post('/opml', express.text({ type: '*/*', limit: '5mb' }), wrap(async (req, res) => {
  const text = typeof req.body === 'string' ? req.body : req.body?.opml;
  if (!text) return bad(res, 'Keine OPML-Datei erhalten');
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const entries = [];
  const walk = (el, cat) => {
    for (const o of el.children || []) {
      if (o.tagName?.toLowerCase() !== 'outline') continue;
      const xmlUrl = o.getAttribute('xmlUrl') || o.getAttribute('xmlurl');
      const url = o.getAttribute('url');
      if (xmlUrl) entries.push({ type: 'rss', url: xmlUrl, title: o.getAttribute('title') || o.getAttribute('text'), cat });
      else if (url && o.getAttribute('type') === 'link') {
        entries.push({ type: 'scrape', url, title: o.getAttribute('title') || o.getAttribute('text'), selector: o.getAttribute('aggregatorSelector'), cat });
      } else walk(o, o.getAttribute('title') || o.getAttribute('text') || cat);
    }
  };
  const body = doc.querySelector('body');
  if (!body) return bad(res, 'Die Datei ist keine gültige OPML-Datei');
  walk(body, null);

  let added = 0;
  const failed = [];
  for (const e of entries) {
    try {
      let catId = null;
      if (e.cat) {
        const c =
          q('SELECT id FROM categories WHERE user_id = ? AND name = ?').get(req.user.id, e.cat) ||
          q('INSERT INTO categories (user_id, name, position) VALUES (?, ?, (SELECT COALESCE(MAX(position),0)+1 FROM categories WHERE user_id = ?)) RETURNING id').get(req.user.id, e.cat, req.user.id);
        catId = c.id;
      }
      const url = normalizeUrl(e.url);
      // Ohne Netzabruf anlegen; Details werden beim ersten Aktualisieren ergänzt
      const src =
        q('SELECT * FROM sources WHERE type = ? AND url = ?').get(e.type, url) ||
        q('INSERT INTO sources (type, url, title, selector, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *').get(e.type, url, e.title || url, e.selector || null, Date.now());
      const sub =
        q('SELECT id FROM subscriptions WHERE user_id = ? AND source_id = ?').get(req.user.id, src.id) ||
        q('INSERT INTO subscriptions (user_id, source_id, created_at) VALUES (?, ?, ?) RETURNING id').get(req.user.id, src.id, Date.now());
      if (catId) q('INSERT OR IGNORE INTO subscription_categories (subscription_id, category_id) VALUES (?, ?)').run(sub.id, catId);
      added++;
    } catch (err) {
      failed.push({ url: e.url, error: err.message });
    }
  }
  const ids = q('SELECT source_id AS id FROM subscriptions WHERE user_id = ?').all(req.user.id).map((r) => r.id);
  refreshAll({ sourceIds: ids }).catch(() => {});
  res.json({ added, failed });
}));

api.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Fehler: ' + err.message });
});
