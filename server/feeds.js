// Feeds abrufen, Webseiten ohne Feed auslesen, Quellen erkennen und Artikel speichern
import Parser from 'rss-parser';
import { parseHTML } from 'linkedom';
import { q, tx } from './db.js';
import { config } from './config.js';
import { fetchText, fetchOk, mapLimit, normalizeUrl } from './http.js';
import {
  cleanHtml, htmlToText, truncate, detectLanguage, normalizeLang, firstImageFromHtml, pageMeta, parseDate,
  decodeEntities,
} from './content.js';

const parser = new Parser({
  timeout: 20000,
  customFields: {
    feed: [['dc:language', 'dcLanguage'], 'icon', 'logo'],
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['media:group', 'mediaGroup'],
      ['content:encoded', 'contentEncoded'],
      ['dc:language', 'dcLanguage'],
      ['dc:creator', 'dcCreator'],
      ['summary', 'atomSummary'],
    ],
  },
});

// ---------------------------------------------------------------- Feed-Erkennung

export function looksLikeFeed(text, contentType = '') {
  const head = String(text || '').slice(0, 1500).trimStart();
  if (/json/i.test(contentType) || head.startsWith('{')) {
    return /"version"\s*:\s*"https:\/\/jsonfeed\.org/i.test(head);
  }
  return /^(﻿)?(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<\?xml-stylesheet[^>]*>\s*)*<(rss|feed|rdf:RDF)\b/i.test(head);
}

function asArray(v) {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function mediaUrl(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  const a = entry.$ || entry;
  return a.url || a.href || null;
}

function itemImage(item, baseUrl) {
  if (item.enclosure?.url && (/^image\//i.test(item.enclosure.type || '') || /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(item.enclosure.url))) {
    return item.enclosure.url;
  }
  const media = [
    ...asArray(item.mediaContent),
    ...asArray(item.mediaGroup?.['media:content']),
    ...asArray(item.mediaThumbnail),
    ...asArray(item.mediaGroup?.['media:thumbnail']),
  ];
  for (const m of media) {
    const a = m?.$ || {};
    if (a.medium && a.medium !== 'image') continue;
    if (a.type && !/^image\//.test(a.type)) continue;
    const u = mediaUrl(m);
    if (u) return new URL(u, baseUrl).toString();
  }
  if (item.itunes?.image) return item.itunes.image;
  return firstImageFromHtml(item.contentEncoded || item.content || item.atomSummary || item.summary, baseUrl);
}

async function parseFeedText(text, url) {
  const head = text.trimStart();
  if (head.startsWith('{')) {
    const j = JSON.parse(text);
    return {
      title: j.title,
      description: j.description,
      link: j.home_page_url,
      language: j.language,
      image: j.icon || j.favicon,
      items: (j.items || []).map((it) => ({
        guid: it.id,
        link: it.url,
        title: it.title,
        contentEncoded: it.content_html || (it.content_text ? `<p>${it.content_text}</p>` : ''),
        summary: it.summary,
        isoDate: it.date_published,
        creator: it.authors?.[0]?.name || it.author?.name,
        enclosure: it.image ? { url: it.image, type: 'image/*' } : null,
        dcLanguage: it.language,
      })),
    };
  }
  const feed = await parser.parseString(text.replace(/^﻿/, ''));
  feed.language = feed.language || feed.dcLanguage;
  feed.image = feed.image?.url || feed.icon || feed.logo || null;
  return feed;
}

export async function parseFeedUrl(url, extraHeaders = {}) {
  const r = await fetchText(url, {
    headers: extraHeaders,
    accept: 'application/rss+xml, application/atom+xml, application/feed+json, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5',
  });
  if (r.status === 304) return { notModified: true, response: r };
  if (r.status >= 400) throw new Error(`Server antwortet mit Status ${r.status}`);
  if (!looksLikeFeed(r.text, r.contentType)) throw new Error('Unter dieser Adresse wurde kein gültiger Feed gefunden');
  const feed = await parseFeedText(r.text, r.url);
  return { feed, response: r };
}

// ---------------------------------------------------------------- Webseiten ohne Feed

const EXCLUDE_PATH =
  /\/(impressum|imprint|datenschutz|privacy|kontakt|contact|agb|terms|login|logout|register|anmelden|abo|abonnement|newsletter|suche|search|tag|tags|thema|themen|kategorie|category|categories|author|autor|autoren|about|ueber-uns|karriere|jobs|shop|cart|warenkorb|account|konto|feed|rss|wp-admin|wp-login|cookie|barrierefreiheit|sitemap|hilfe|help|faq|werbung|mediadaten|podcast-abonnieren)(\/|$|\.|\?)/i;
const EXCLUDE_EXT = /\.(jpe?g|png|gif|webp|svg|pdf|zip|mp3|mp4|xml|rss|css|js)(\?|$)/i;

function baseHost(h) {
  return h.replace(/^(www\d?|m|mobil|mobile)\./i, '').toLowerCase();
}

function pickImg(el, base) {
  if (!el) return null;
  const img = el.tagName === 'IMG' ? el : el.querySelector('img');
  if (img) {
    const srcset = img.getAttribute('data-srcset') || img.getAttribute('srcset');
    let src =
      img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('src');
    if (srcset) {
      const parts = srcset.split(',').map((s) => s.trim().split(/\s+/));
      const best = parts.sort((a, b) => parseInt(b[1] || '0', 10) - parseInt(a[1] || '0', 10))[0];
      if (best?.[0]) src = best[0];
    }
    if (src && !/^data:/.test(src) && !/(logo|icon|avatar|sprite|placeholder|blank|pixel)/i.test(src)) {
      try {
        return new URL(decodeEntities(src), base).toString();
      } catch {}
    }
  }
  const source = el.querySelector?.('picture source[srcset]');
  if (source) {
    const first = source.getAttribute('srcset').split(',')[0].trim().split(/\s+/)[0];
    try {
      return new URL(first, base).toString();
    } catch {}
  }
  return null;
}

function containerOf(a) {
  let el = a;
  for (let i = 0; i < 5 && el.parentElement; i++) {
    el = el.parentElement;
    if (/^(ARTICLE|LI)$/.test(el.tagName)) return el;
    if (/(teaser|article|story|post|entry|card|item|news)/i.test(el.getAttribute('class') || '')) return el;
  }
  return a.parentElement?.parentElement || a.parentElement || a;
}

/**
 * Sucht auf einer Übersichtsseite nach Artikel-Links.
 * Liefert [{ url, title, image, summary, published }]
 */
export function extractArticleLinks(html, pageUrl, selector) {
  const { document } = parseHTML(html);
  const page = new URL(pageUrl);
  const host = baseHost(page.hostname);

  let anchors = [];
  if (selector) {
    for (const el of document.querySelectorAll(selector)) {
      if (el.tagName === 'A') anchors.push(el);
      else anchors.push(...el.querySelectorAll('a[href]'));
    }
  } else {
    for (const el of document.querySelectorAll(
      'script, style, noscript, template, nav, header, footer, form, [role="navigation"], [role="banner"], [role="contentinfo"], [aria-hidden="true"], .cookie, #cookie',
    )) el.remove();
    anchors = [...document.querySelectorAll('a[href]')];
  }

  const found = new Map();
  for (const a of anchors) {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) continue;
    let u;
    try {
      u = new URL(decodeEntities(href), page);
    } catch {
      continue;
    }
    u.hash = '';
    if (!/^https?:$/.test(u.protocol)) continue;
    if (!selector && baseHost(u.hostname) !== host && !baseHost(u.hostname).endsWith('.' + host)) continue;
    const path = u.pathname;
    if (path === '/' || u.toString() === page.toString()) continue;
    if (EXCLUDE_EXT.test(path)) continue;
    if (!selector && EXCLUDE_PATH.test(path)) continue;

    const heading = a.querySelector('h1,h2,h3,h4') || a.closest('h1,h2,h3,h4');
    let text = (heading?.textContent || a.textContent || a.getAttribute('title') || a.querySelector('img')?.getAttribute('alt') || '')
      .replace(/\s+/g, ' ')
      .trim();
    const words = text.split(' ').length;
    const lastSeg = path.split('/').filter(Boolean).pop() || '';
    const sluggy = /[a-z0-9]+-[a-z0-9]+-[a-z0-9]+/i.test(lastSeg) || /\d{4,}/.test(path);
    const score = (heading ? 3 : 0) + (sluggy ? 2 : 0) + (text.length >= 30 ? 2 : 0) + (words >= 4 ? 1 : 0);
    if (!selector && (score < 3 || text.length < 15)) continue;
    if (text.length > 220) text = truncate(text, 200);

    const key = u.toString();
    const container = containerOf(a);
    const prev = found.get(key);
    if (prev) {
      if (!prev.image) prev.image = pickImg(container, page);
      if ((heading && !prev.heading) || (text.length > prev.title.length && text.length < 200 && !prev.heading)) prev.title = text;
      continue;
    }
    let summary = '';
    const p = container.querySelector?.('p');
    if (p) summary = p.textContent.replace(/\s+/g, ' ').trim();
    if (summary === text) summary = '';
    const time = container.querySelector?.('time[datetime]')?.getAttribute('datetime');
    found.set(key, {
      url: key,
      title: text,
      heading: !!heading,
      image: pickImg(a, page) || pickImg(container, page),
      summary: truncate(summary, 600),
      published: parseDate(time),
    });
    if (found.size >= 60) break;
  }
  return [...found.values()].filter((x) => x.title);
}

// ---------------------------------------------------------------- Quelle erkennen (beim Hinzufügen)

const COMMON_FEED_PATHS = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/index.xml', '/feed/', '/rss/', '/index.rss'];

async function describeFeed(url) {
  const { feed, response } = await parseFeedUrl(url);
  return {
    type: 'rss',
    url: response.url,
    title: decodeEntities(feed.title || '') || new URL(response.url).hostname,
    description: htmlToText(feed.description || ''),
    siteUrl: feed.link || new URL(response.url).origin,
    image: feed.image || null,
    language: normalizeLang(feed.language),
    count: feed.items?.length || 0,
    samples: (feed.items || []).slice(0, 5).map((i) => decodeEntities(i.title || '')).filter(Boolean),
  };
}

/** Untersucht eine Adresse und schlägt Abo-Möglichkeiten vor. */
export async function discover(input) {
  const url = normalizeUrl(input);
  const r = await fetchOk(url);
  if (looksLikeFeed(r.text, r.contentType)) {
    return { feeds: [await describeFeed(r.url)], page: null };
  }
  const meta = pageMeta(r.text, r.url);
  let candidates = meta.feeds.map((f) => f.url);
  if (!candidates.length) {
    const origin = new URL(r.url).origin;
    const pathBase = r.url.replace(/\/$/, '');
    const guesses = [...new Set([...COMMON_FEED_PATHS.map((p) => pathBase + p), ...COMMON_FEED_PATHS.map((p) => origin + p)])];
    for (const g of guesses.slice(0, 14)) {
      try {
        const gr = await fetchText(g, { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' });
        if (gr.status < 400 && looksLikeFeed(gr.text, gr.contentType)) {
          candidates = [gr.url];
          break;
        }
      } catch {}
    }
  }
  const feeds = (await mapLimit([...new Set(candidates)].slice(0, 6), 3, describeFeed)).filter((f) => f && !f.error);
  const links = extractArticleLinks(r.text, r.url);
  return {
    feeds,
    page: {
      type: 'scrape',
      url: r.url,
      title: meta.title || new URL(r.url).hostname,
      description: meta.description,
      image: meta.icon,
      language: meta.language,
      count: links.length,
      samples: links.slice(0, 6).map((l) => l.title),
    },
  };
}

// ---------------------------------------------------------------- Abrufen & Speichern

function insertArticle(sourceId, a) {
  const now = Date.now();
  const published = a.published && a.published < now + 3600_000 ? Math.min(a.published, now) : now;
  return q(`
    INSERT INTO articles (source_id, guid, url, title, author, summary, content, image_url, language, published_at, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (source_id, guid) DO NOTHING
    RETURNING id
  `).get(
    sourceId,
    String(a.guid).slice(0, 1000),
    a.url || null,
    a.title || '(ohne Titel)',
    a.author || null,
    a.summary || null,
    a.content || null,
    a.image || null,
    a.language || null,
    published,
    now,
  );
}

async function enrichFromPage(articleId, url, { needImage, needSummary, needDate, needLang, needTitle }) {
  try {
    const r = await fetchOk(url);
    const m = pageMeta(r.text, r.url);
    const sets = [];
    const vals = [];
    if (needImage && m.image) sets.push('image_url = ?'), vals.push(m.image);
    if (needSummary && m.description) sets.push('summary = ?'), vals.push(truncate(decodeEntities(m.description), 1200));
    if (needDate && m.published && m.published <= Date.now()) sets.push('published_at = ?'), vals.push(m.published);
    if (needLang && m.language) sets.push('language = ?'), vals.push(m.language);
    if (needTitle && m.pageTitle) sets.push('title = ?'), vals.push(decodeEntities(m.pageTitle).slice(0, 300));
    if (sets.length) q(`UPDATE articles SET ${sets.join(', ')} WHERE id = ?`).run(...vals, articleId);
  } catch {
    /* Anreicherung ist optional */
  }
}

async function refreshRss(source) {
  const headers = {};
  if (source.etag) headers['If-None-Match'] = source.etag;
  if (source.last_modified) headers['If-Modified-Since'] = source.last_modified;
  const { feed, notModified, response } = await parseFeedUrl(source.url, headers);
  if (notModified) return { added: 0 };

  const base = response.url;
  const feedLang = normalizeLang(feed.language) || source.language;
  const newOnes = [];
  tx(() => {
    for (const item of feed.items || []) {
      const link = item.link ? new URL(item.link, base).toString() : null;
      const title = decodeEntities(item.title || '').replace(/\s+/g, ' ').trim();
      const rawContent = item.contentEncoded || item.content || item.atomSummary || item.summary || '';
      const summaryText = truncate(htmlToText(item.contentSnippet && item.contentSnippet.length > 40 ? item.contentSnippet : rawContent), 1200);
      const guid = item.guid || item.id || link || `${title}|${item.isoDate || item.pubDate || ''}`;
      if (!guid || (!title && !link)) continue;
      // Sprache: Angabe am Artikel > sichere Erkennung (mehrsprachige Feeds) > Angabe des Feeds > unsichere Erkennung
      const sample = `${title}. ${summaryText}`;
      const language =
        normalizeLang(item.dcLanguage) ||
        (sample.length > 80 && detectLanguage(sample, 0.5)) ||
        feedLang ||
        detectLanguage(sample);
      const row = insertArticle(source.id, {
        guid,
        url: link,
        title: title || truncate(summaryText, 100),
        author: item.creator || item.dcCreator || item.author || null,
        summary: summaryText,
        content: rawContent ? cleanHtml(rawContent, link || base) : null,
        image: itemImage(item, link || base),
        language,
        published: parseDate(item.isoDate || item.pubDate),
      });
      if (row) newOnes.push({ id: row.id, url: link, hasImage: !!itemImage(item, link || base), hasSummary: !!summaryText });
    }
    q(`UPDATE sources SET etag = ?, last_modified = ?, language = COALESCE(language, ?),
       title = COALESCE(title, ?), site_url = COALESCE(site_url, ?) WHERE id = ?`).run(
      response.headers.get('etag'),
      response.headers.get('last-modified'),
      feedLang,
      feed.title ? decodeEntities(feed.title) : null,
      feed.link || null,
      source.id,
    );
  });

  // Fehlende Vorschaubilder/Zusammenfassungen von der Artikelseite holen (begrenzt)
  const toEnrich = newOnes.filter((n) => n.url && (!n.hasImage || !n.hasSummary)).slice(0, 10);
  await mapLimit(toEnrich, 3, (n) =>
    enrichFromPage(n.id, n.url, { needImage: !n.hasImage, needSummary: !n.hasSummary }),
  );
  return { added: newOnes.length };
}

async function refreshScrape(source) {
  const r = await fetchOk(source.url);
  const links = extractArticleLinks(r.text, r.url, source.selector);
  if (!links.length) throw new Error('Auf der Seite wurden keine Artikel-Links gefunden');
  const meta = pageMeta(r.text, r.url);
  const newOnes = [];
  tx(() => {
    for (const l of links) {
      const row = insertArticle(source.id, {
        guid: l.url,
        url: l.url,
        title: l.title,
        summary: l.summary,
        image: l.image,
        language: meta.language || detectLanguage(`${l.title}. ${l.summary}`),
        published: l.published,
      });
      if (row) newOnes.push({ id: row.id, ...l });
    }
  });
  await mapLimit(newOnes.slice(0, 20), 3, (n) =>
    enrichFromPage(n.id, n.url, {
      needImage: !n.image,
      needSummary: !n.summary,
      needDate: !n.published,
      needLang: true,
      needTitle: !n.heading && n.title.length < 25,
    }),
  );
  return { added: newOnes.length };
}

const running = new Map();

export async function refreshSource(sourceId) {
  if (running.has(sourceId)) return running.get(sourceId);
  const p = (async () => {
    const source = q('SELECT * FROM sources WHERE id = ?').get(sourceId);
    if (!source) return { added: 0 };
    try {
      const res = source.type === 'rss' ? await refreshRss(source) : await refreshScrape(source);
      q('UPDATE sources SET last_fetched_at = ?, last_success_at = ?, last_error = NULL WHERE id = ?').run(Date.now(), Date.now(), sourceId);
      return res;
    } catch (err) {
      q('UPDATE sources SET last_fetched_at = ?, last_error = ? WHERE id = ?').run(Date.now(), String(err.message || err).slice(0, 500), sourceId);
      return { added: 0, error: err.message };
    }
  })().finally(() => running.delete(sourceId));
  running.set(sourceId, p);
  return p;
}

export function isRefreshing() {
  return running.size > 0;
}

export async function refreshAll({ force = false, sourceIds } = {}) {
  const cutoff = Date.now() - config.refreshIntervalMinutes * 60_000 + 30_000;
  const rows = sourceIds
    ? sourceIds.map((id) => ({ id }))
    : q(`SELECT s.id FROM sources s WHERE EXISTS (SELECT 1 FROM subscriptions WHERE source_id = s.id)
         AND (? OR s.last_fetched_at IS NULL OR s.last_fetched_at < ?)`).all(force ? 1 : 0, cutoff);
  const results = await mapLimit(rows, config.fetchConcurrency, (r) => refreshSource(r.id));
  return results.reduce((n, r) => n + (r?.added || 0), 0);
}

/** Löscht alte Artikel, die weder Favorit noch im Verlauf sind. */
export function cleanup() {
  const cutoff = Date.now() - config.retentionDays * 86400_000;
  q(`DELETE FROM articles WHERE published_at < ?
     AND id NOT IN (SELECT article_id FROM article_states WHERE favorite_at IS NOT NULL)
     AND id NOT IN (SELECT article_id FROM history)`).run(cutoff);
  // Verwaiste Quellen ohne Abo und ohne aufbewahrte Artikel entfernen
  q(`DELETE FROM sources WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE source_id = sources.id)
     AND NOT EXISTS (SELECT 1 FROM articles WHERE source_id = sources.id)`).run();
}

/** Legt eine Quelle an bzw. findet die bestehende. */
export async function ensureSource({ type, url, title, selector }) {
  const nurl = normalizeUrl(url);
  let src = q('SELECT * FROM sources WHERE type = ? AND url = ?').get(type, nurl);
  if (src) {
    if (type === 'scrape' && selector !== undefined && (selector || null) !== src.selector) {
      q('UPDATE sources SET selector = ? WHERE id = ?').run(selector || null, src.id);
    }
    return src;
  }
  let info = { title, siteUrl: null, description: null, image: null, language: null };
  if (type === 'rss') {
    const d = await describeFeed(nurl);
    info = { ...d, title: d.title || title };
    if (d.url !== nurl) {
      src = q('SELECT * FROM sources WHERE type = ? AND url = ?').get(type, d.url);
      if (src) return src;
    }
  } else {
    const r = await fetchOk(nurl);
    const m = pageMeta(r.text, r.url);
    info = { title: title || m.title, siteUrl: r.url, description: m.description, image: m.icon, language: m.language };
  }
  // Favicon der Webseite ermitteln
  if (type === 'rss' && info.siteUrl) {
    try {
      const sr = await fetchOk(info.siteUrl);
      const m = pageMeta(sr.text, sr.url);
      info.icon = m.icon;
      if (!info.language) info.language = m.language;
    } catch {}
  }
  const row = q(`INSERT INTO sources (type, url, site_url, title, description, icon_url, language, selector, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT (type, url) DO UPDATE SET title = COALESCE(sources.title, excluded.title)
                 RETURNING *`).get(
    type,
    type === 'rss' && info.url ? info.url : nurl,
    info.siteUrl || null,
    info.title || new URL(nurl).hostname,
    info.description ? truncate(info.description, 500) : null,
    info.icon || (type === 'scrape' ? info.image : null) || null,
    info.language || null,
    type === 'scrape' ? selector || null : null,
    Date.now(),
  );
  return row;
}
