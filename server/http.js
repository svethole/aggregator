// Sicheres Abrufen externer URLs: Timeout, Größenlimit, Zeichensatz-Erkennung
// und Schutz davor, dass interne Adressen (localhost, LAN) abgerufen werden.
import dns from 'node:dns/promises';
import net from 'node:net';
import { config } from './config.js';

const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 20000;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

async function assertPublic(url) {
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Nur http(s)-Adressen sind erlaubt');
  if (config.allowPrivateNetwork) return;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error('Interne Adressen sind nicht erlaubt');
}

export function normalizeUrl(input) {
  let s = String(input || '').trim();
  if (!s) throw new Error('Keine Adresse angegeben');
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s.replace(/^\/\//, '');
  const u = new URL(s);
  u.hash = '';
  return u.toString();
}

function detectCharset(contentType, bytes) {
  const m = /charset=["']?([\w-]+)/i.exec(contentType || '');
  if (m) return m[1];
  const head = Buffer.from(bytes.subarray(0, 2048)).toString('latin1');
  const x = /<\?xml[^>]*encoding=["']([\w-]+)/i.exec(head);
  if (x) return x[1];
  const h = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head);
  if (h) return h[1];
  return 'utf-8';
}

function decode(bytes, charset) {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/**
 * Ruft eine URL ab und liefert { url (final), status, headers, text, contentType }.
 */
export async function fetchText(input, { headers = {}, accept, method = 'GET', body } = {}) {
  let url = new URL(normalizeUrl(input));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let res;
    for (let hop = 0; hop < 6; hop++) {
      await assertPublic(url);
      res = await fetch(url, {
        method,
        body,
        redirect: 'manual',
        signal: ctrl.signal,
        headers: {
          'User-Agent': config.userAgent,
          Accept: accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.7',
          ...headers,
        },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        url = new URL(res.headers.get('location'), url);
        continue;
      }
      break;
    }
    if (res.status >= 300 && res.status < 400 && res.status !== 304) throw new Error('Zu viele Weiterleitungen');

    const contentType = res.headers.get('content-type') || '';
    if (res.status === 304) return { url: url.toString(), status: 304, headers: res.headers, text: '', contentType };

    const chunks = [];
    let size = 0;
    if (res.body) {
      for await (const chunk of res.body) {
        size += chunk.length;
        if (size > MAX_BYTES) throw new Error('Antwort ist zu groß');
        chunks.push(chunk);
      }
    }
    const bytes = new Uint8Array(Buffer.concat(chunks));
    const text = decode(bytes, detectCharset(contentType, bytes));
    return { url: url.toString(), status: res.status, headers: res.headers, text, contentType };
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Zeitüberschreitung beim Abrufen');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOk(input, opts) {
  const r = await fetchText(input, opts);
  if (r.status >= 400) throw new Error(`Server antwortet mit Status ${r.status}`);
  return r;
}

export async function fetchJson(input, opts = {}) {
  const r = await fetchOk(input, { ...opts, accept: 'application/json' });
  return JSON.parse(r.text);
}

/** Einfacher Pool für begrenzte Parallelität */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch (err) {
        results[idx] = { error: err };
      }
    }
  });
  await Promise.all(workers);
  return results;
}
