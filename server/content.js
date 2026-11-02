// Hilfsfunktionen rund um HTML-Inhalte: Bereinigen, Text-Auszüge, Sprache, Bilder, Metadaten
import sanitizeHtml from 'sanitize-html';
import { parseHTML } from 'linkedom';
import { detectAll } from 'tinyld';

const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITY[e.toLowerCase()] ?? m;
  });
}

export function htmlToText(html) {
  const text = sanitizeHtml(String(html || '').replace(/<(br|\/p|\/div|\/li|\/h\d)[^>]*>/gi, ' $&'), {
    allowedTags: [],
    allowedAttributes: {},
    nonTextTags: ['style', 'script', 'textarea', 'noscript', 'figcaption'],
  });
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

export function truncate(text, max) {
  if (!text || text.length <= max) return text || '';
  const cut = text.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut) + ' …';
}

function absolutize(value, base) {
  if (!value) return value;
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

/** Bereinigt Artikel-HTML für die sichere Anzeige in der Leseansicht. */
export function cleanHtml(html, baseUrl) {
  return sanitizeHtml(String(html || ''), {
    allowedTags: [
      'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'a', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup',
      'small', 'mark', 'abbr', 'cite', 'q', 'img', 'figure', 'figcaption', 'picture', 'source',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'div', 'span', 'section',
      'article', 'aside', 'details', 'summary', 'time', 'video', 'audio', 'iframe',
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'srcset', 'alt', 'title', 'width', 'height'],
      source: ['src', 'srcset', 'type', 'media'],
      video: ['src', 'poster', 'controls', 'width', 'height'],
      audio: ['src', 'controls'],
      iframe: ['src', 'width', 'height', 'allowfullscreen'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      time: ['datetime'],
      abbr: ['title'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'], iframe: ['https'] },
    allowedIframeHostnames: [
      'www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com', 'www.dailymotion.com',
    ],
    exclusiveFilter: (frame) =>
      frame.tag === 'img' && /(feedburner|pixel|tracking|1x1|spacer)\./i.test(frame.attribs.src || ''),
    transformTags: {
      a: (tag, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, href: absolutize(attribs.href, baseUrl), target: '_blank', rel: 'noopener noreferrer' },
      }),
      img: (tag, attribs) => {
        const src = attribs.src || attribs['data-src'] || attribs['data-lazy-src'] || attribs['data-original'];
        const out = { ...attribs, src: absolutize(src, baseUrl), loading: 'lazy', referrerpolicy: 'no-referrer' };
        if (attribs.srcset) {
          out.srcset = attribs.srcset
            .split(',')
            .map((p) => {
              const [u, d] = p.trim().split(/\s+/);
              return [absolutize(u, baseUrl), d].filter(Boolean).join(' ');
            })
            .join(', ');
        }
        return { tagName: 'img', attribs: out };
      },
      source: (tag, attribs) => ({
        tagName: 'source',
        attribs: { ...attribs, src: absolutize(attribs.src, baseUrl) },
      }),
    },
  });
}

const LANG_FIX = { iw: 'he', in: 'id', ji: 'yi' };
export function normalizeLang(code) {
  if (!code) return null;
  const c = String(code).trim().toLowerCase().split(/[-_]/)[0];
  if (!/^[a-z]{2,3}$/.test(c)) return null;
  return LANG_FIX[c] || c;
}

export function detectLanguage(text, minAccuracy = 0.15) {
  const t = String(text || '').slice(0, 1500);
  if (t.length < 25) return null;
  try {
    // Nur bei ausreichender Sicherheit eine Sprache annehmen
    const best = detectAll(t)[0];
    return best && best.accuracy >= minAccuracy ? normalizeLang(best.lang) : null;
  } catch {
    return null;
  }
}

export function firstImageFromHtml(html, baseUrl) {
  const re = /<img\b[^>]*?\s(?:data-src|src)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const tag = m[0];
    const src = m[1];
    if (/^data:/i.test(src)) continue;
    if (/(feedburner|pixel|tracking|spacer|emoji|gravatar|1x1|blank\.gif|smilies)/i.test(src)) continue;
    const w = /\bwidth=["']?(\d+)/i.exec(tag);
    if (w && parseInt(w[1], 10) < 60) continue;
    return absolutize(decodeEntities(src), baseUrl);
  }
  return null;
}

/** Liest Metadaten (og:*, Sprache, Datum, Feeds) aus einer HTML-Seite. */
export function pageMeta(html, baseUrl) {
  const { document } = parseHTML(html);
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content')?.trim() || null;
  const feeds = [];
  for (const l of document.querySelectorAll('link[rel~="alternate"]')) {
    const type = (l.getAttribute('type') || '').toLowerCase();
    const href = l.getAttribute('href');
    if (!href || !/(rss|atom|feed\+json|application\/json|rdf)/.test(type)) continue;
    if (/comments?/i.test(l.getAttribute('title') || '') && feeds.length) continue;
    feeds.push({ url: absolutize(href, baseUrl), title: l.getAttribute('title') || null });
  }
  const icon =
    document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ||
    document.querySelector('link[rel~="icon"]')?.getAttribute('href') ||
    '/favicon.ico';
  const published =
    meta('meta[property="article:published_time"]') ||
    meta('meta[name="date"]') ||
    meta('meta[itemprop="datePublished"]') ||
    meta('meta[name="DC.date.issued"]') ||
    document.querySelector('time[datetime]')?.getAttribute('datetime') ||
    null;
  return {
    document,
    title:
      meta('meta[property="og:site_name"]') ||
      document.querySelector('title')?.textContent?.trim() ||
      null,
    pageTitle: meta('meta[property="og:title"]') || document.querySelector('title')?.textContent?.trim() || null,
    description: meta('meta[property="og:description"]') || meta('meta[name="description"]'),
    image: absolutize(meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]'), baseUrl),
    language: normalizeLang(
      document.documentElement?.getAttribute('lang') || meta('meta[http-equiv="content-language"]') || meta('meta[property="og:locale"]'),
    ),
    published: parseDate(published),
    icon: absolutize(icon, baseUrl),
    feeds,
  };
}

export function parseDate(v) {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}
