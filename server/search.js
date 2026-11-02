// Suche nach neuen Quellen.
// 1. Feedly-Feedsuche (kein Schlüssel nötig): liefert direkt abonnierbare Feeds
// 2. Websuche: Brave Search API (mit BRAVE_API_KEY), sonst DuckDuckGo-HTML als Notlösung
import { parseHTML } from 'linkedom';
import { config } from './config.js';
import { fetchJson, fetchText } from './http.js';
import { decodeEntities, htmlToText } from './content.js';

async function feedlySearch(query) {
  const url = `https://cloud.feedly.com/v3/search/feeds?count=20&locale=de&query=${encodeURIComponent(query)}`;
  const j = await fetchJson(url);
  return (j.results || [])
    .filter((r) => r.feedId?.startsWith('feed/'))
    .map((r) => ({
      kind: 'feed',
      url: r.feedId.slice(5),
      siteUrl: r.website || null,
      title: decodeEntities(r.title || ''),
      description: htmlToText(r.description || ''),
      icon: r.iconUrl || r.visualUrl || null,
      language: r.language || null,
      subscribers: r.subscribers || 0,
      lastUpdated: r.lastUpdated || r.updated || null,
    }));
}

async function braveSearch(query) {
  const url = `https://api.search.brave.com/res/v1/web/search?count=20&country=de&search_lang=de&q=${encodeURIComponent(query)}`;
  const j = await fetchJson(url, { headers: { 'X-Subscription-Token': config.braveApiKey } });
  return (j.web?.results || []).map((r) => ({
    kind: 'page',
    url: r.url,
    siteUrl: r.url,
    title: htmlToText(r.title || ''),
    description: htmlToText(r.description || ''),
    icon: r.meta_url?.favicon || r.profile?.img || null,
    language: r.language || null,
  }));
}

async function duckDuckGoSearch(query) {
  const r = await fetchText(`https://html.duckduckgo.com/html/?kl=de-de&q=${encodeURIComponent(query)}`);
  if (r.status >= 400) throw new Error(`DuckDuckGo antwortet mit Status ${r.status}`);
  const { document } = parseHTML(r.text);
  const out = [];
  for (const res of document.querySelectorAll('.result')) {
    const a = res.querySelector('a.result__a');
    if (!a) continue;
    let href = a.getAttribute('href') || '';
    const m = /[?&]uddg=([^&]+)/.exec(href);
    if (m) href = decodeURIComponent(m[1]);
    if (href.startsWith('//')) href = 'https:' + href;
    if (!/^https?:/.test(href) || /duckduckgo\.com\/y\.js/.test(href)) continue;
    out.push({
      kind: 'page',
      url: href,
      siteUrl: href,
      title: a.textContent.replace(/\s+/g, ' ').trim(),
      description: res.querySelector('.result__snippet')?.textContent.replace(/\s+/g, ' ').trim() || '',
      icon: null,
      language: null,
    });
  }
  return out;
}

export function searchInfo() {
  return {
    web: config.braveApiKey ? 'brave' : config.searchFallback ? 'duckduckgo' : null,
  };
}

export async function searchSources(query) {
  const query2 = String(query || '').trim().slice(0, 200);
  if (!query2) return { feeds: [], pages: [], errors: [] };
  const errors = [];
  const webFn = config.braveApiKey ? braveSearch : config.searchFallback ? duckDuckGoSearch : null;
  const [feeds, pages] = await Promise.all([
    feedlySearch(query2).catch((e) => (errors.push(`Feedsuche: ${e.message}`), [])),
    webFn ? webFn(query2).catch((e) => (errors.push(`Websuche: ${e.message}`), [])) : [],
  ]);
  return { feeds, pages, errors, provider: searchInfo().web };
}
