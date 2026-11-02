import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFixtureServer } from './fixture-server.js';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agg-test-'));
process.env.DATA_DIR = dataDir;
process.env.ALLOW_PRIVATE_NETWORK = 'true';

let server, base, feeds, db, content, http;

before(async () => {
  server = createFixtureServer();
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
  feeds = await import('../server/feeds.js');
  db = await import('../server/db.js');
  content = await import('../server/content.js');
  http = await import('../server/http.js');
});

after(() => {
  server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('erkennt Feed über <link rel=alternate>', async () => {
  const d = await feeds.discover(base + '/');
  assert.equal(d.feeds.length, 1);
  assert.equal(d.feeds[0].title, 'Zoologie Aktuell');
  assert.equal(d.feeds[0].language, 'de');
  assert.equal(d.feeds[0].count, 3);
});

test('Feed abonnieren und Artikel speichern', async () => {
  const src = await feeds.ensureSource({ type: 'rss', url: base + '/feed.xml' });
  const r = await feeds.refreshSource(src.id);
  assert.equal(r.added, 3);
  const rows = db.q('SELECT * FROM articles WHERE source_id = ? ORDER BY published_at DESC').all(src.id);
  assert.equal(rows[0].title, 'Neue Froschart im Regenwald entdeckt');
  assert.match(rows[0].image_url, /frosch\.jpg$/);
  assert.equal(rows[0].language, 'de');
  // Skripte werden entfernt, relative Bilder absolut gemacht
  assert.ok(!rows[1].content.includes('<script'));
  assert.ok(rows[1].content.includes(base + '/img/kraehe.jpg'));
  assert.match(rows[1].image_url, /kraehe\.jpg$/);
  // Englischer Artikel in deutschem Feed wird erkannt
  assert.equal(rows.find((x) => x.guid === 'octo-3').language, 'en');
  // Erneuter Abruf legt keine Duplikate an
  const again = await feeds.refreshSource(src.id);
  assert.equal(again.added, 0);
});

test('Webseite ohne Feed: Artikel-Links werden erkannt (inkl. Latin-1)', async () => {
  const d = await feeds.discover(base + '/lokal');
  // Die Seite selbst verlinkt keinen Feed; über typische Pfade (/feed.xml) wird aber einer erraten
  assert.ok(d.feeds.every((f) => f.url.endsWith('/feed.xml')));
  assert.equal(d.page.type, 'scrape');
  assert.ok(d.page.samples.includes('Kürbisausstellung im Blühenden Barock'), d.page.samples.join(' | '));
  assert.equal(d.page.count, 3);

  const src = await feeds.ensureSource({ type: 'scrape', url: base + '/lokal' });
  const r = await feeds.refreshSource(src.id);
  assert.equal(r.added, 3);
  const rows = db.q('SELECT * FROM articles WHERE source_id = ?').all(src.id);
  const schloss = rows.find((x) => x.title.startsWith('Schlossfestspiele'));
  assert.match(schloss.image_url, /schloss\.jpg$/);
  assert.equal(schloss.summary, 'Mehr Besucher als je zuvor.');
  // Anreicherung von der Artikelseite (Bild und Beschreibung)
  const bus = rows.find((x) => x.title.startsWith('Neue Buslinie'));
  assert.match(bus.image_url, /neue-buslinie/);
  assert.match(bus.summary, /Beschreibung/);
  assert.ok(!rows.some((x) => /kontakt|impressum/i.test(x.url)));
});

test('Volltext wird per Readability geladen', async () => {
  const { loadFulltext } = await import('../server/fulltext.js');
  const a = db.q("SELECT id FROM articles WHERE guid = 'frosch-1'").get();
  const r = await loadFulltext(a.id);
  assert.equal(r.status, 'ok');
  assert.match(r.html, /Absatz 8/);
  assert.ok(!r.html.includes('Impressum'));
});

test('veralteter Feed-Link: Ausweichen auf die Webseite', async () => {
  await assert.rejects(feeds.discover(base + '/veraltet.xml'), /403/);
  const d = await feeds.discoverWithFallback(base + '/veraltet.xml', base + '/');
  assert.equal(d.feeds[0].url, base + '/feed.xml');
  assert.match(d.note, /nicht erreichbar/);
  // Ohne Ausweich-Adresse bleibt es beim Fehler
  await assert.rejects(feeds.discoverWithFallback(base + '/veraltet.xml'), /403/);
});

test('Spracherkennung', () => {
  assert.equal(content.detectLanguage('Octopuses dream, scientists say. Researchers observed sleeping octopuses changing colours in patterns that resemble dreaming in mammals.'), 'en');
  // Bei zu unsicherer Erkennung lieber „unbekannt“ als falsch
  assert.notEqual(content.detectLanguage('Researchers observed sleeping octopuses changing colours in patterns'), 'fr');
  assert.equal(content.detectLanguage('Die Forscher haben schlafende Kraken beobachtet, die ihre Farbe wechseln'), 'de');
});

test('interne Adressen werden standardmäßig blockiert', async () => {
  const { config } = await import('../server/config.js');
  config.allowPrivateNetwork = false;
  await assert.rejects(http.fetchText(base + '/feed.xml'), /Interne Adressen/);
  config.allowPrivateNetwork = true;
});
