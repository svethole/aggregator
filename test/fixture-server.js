// Kleiner Testserver mit einem RSS-Feed und einer Nachrichtenseite ohne Feed
import http from 'node:http';

const now = Date.now();
const iso = (h) => new Date(now - h * 3600_000).toUTCString();
const longText = (topic) =>
  Array.from({ length: 8 }, (_, i) => `<p>Absatz ${i + 1}: Dies ist ein ausführlicher Text über ${topic}. Forscherinnen und Forscher haben neue Erkenntnisse gewonnen, die das Verständnis grundlegend verändern könnten. Die Ergebnisse wurden in einer Fachzeitschrift veröffentlicht.</p>`).join('');

export function createFixtureServer() {
  return http.createServer((req, res) => {
    const base = `http://${req.headers.host}`;
    const url = new URL(req.url, base);
    if (url.pathname === '/veraltet.xml') {
      // Wie ein veralteter Feed-Link aus einer Suchmaschine
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (url.pathname === '/feed.xml') {
      res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
      res.end(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>Zoologie Aktuell</title>
  <link>${base}/</link>
  <description>Neuigkeiten aus der Tierwelt</description>
  <language>de-de</language>
  <item>
    <title>Neue Froschart im Regenwald entdeckt</title>
    <link>${base}/artikel/neue-froschart-entdeckt</link>
    <guid>frosch-1</guid>
    <pubDate>${iso(1)}</pubDate>
    <description>Im Amazonas haben Forschende eine bislang unbekannte Froschart beschrieben.</description>
    <media:content url="${base}/img/frosch.jpg" medium="image"/>
  </item>
  <item>
    <title>Wie Krähen Werkzeuge benutzen</title>
    <link>${base}/artikel/kraehen-werkzeuge</link>
    <guid>kraehe-2</guid>
    <pubDate>${iso(30)}</pubDate>
    <content:encoded><![CDATA[<p>Krähen gehören zu den <b>intelligentesten</b> Vögeln.</p><img src="/img/kraehe.jpg" width="600"><script>alert(1)</script>]]></content:encoded>
  </item>
  <item>
    <title>Octopuses dream, scientists say</title>
    <link>${base}/artikel/octopus-dreams</link>
    <guid>octo-3</guid>
    <pubDate>${iso(24 * 10)}</pubDate>
    <description>Researchers observed sleeping octopuses changing colours in patterns that resemble dreaming in mammals.</description>
  </item>
</channel>
</rss>`);
      return;
    }
    if (url.pathname === '/' || url.pathname === '/blog') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html lang="de"><head><title>Zoologie Aktuell</title>
        <link rel="alternate" type="application/rss+xml" title="Feed" href="/feed.xml"></head><body><h1>Zoologie</h1></body></html>`);
      return;
    }
    if (url.pathname === '/lokal') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=iso-8859-1' });
      const html = `<!doctype html><html lang="de"><head><meta charset="iso-8859-1"><title>Ludwigsburger Lokalblatt</title></head><body>
        <header><nav><a href="/impressum">Impressum</a><a href="/lokal/politik">Politik</a></nav></header>
        <main>
          <article class="teaser"><a href="/lokal/2026/11/schlossfestspiele-starten-mit-rekord"><img src="/img/schloss.jpg"><h2>Schlossfestspiele starten mit Rekord</h2></a><p>Mehr Besucher als je zuvor.</p><time datetime="2026-11-01T10:00:00Z"></time></article>
          <article class="teaser"><a href="/lokal/2026/11/neue-buslinie-nach-asperg"><h2>Neue Buslinie nach Asperg geplant – Bürger begrüßen Pläne</h2></a></article>
          <article class="teaser"><a href="/lokal/2026/11/kuerbisausstellung-blühendes-barock"><h2>Kürbisausstellung im Blühenden Barock</h2></a><p>Größte Kürbisausstellung der Welt.</p></article>
          <a href="/kontakt">Kontakt aufnehmen mit unserer Redaktion bitte hier</a>
        </main>
        <footer><a href="/datenschutz">Datenschutz</a></footer></body></html>`;
      res.end(Buffer.from(html, 'latin1'));
      return;
    }
    if (url.pathname.startsWith('/artikel/') || url.pathname.startsWith('/lokal/2026')) {
      const slug = url.pathname.split('/').pop();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html lang="de"><head><title>${slug}</title>
        <meta property="og:title" content="Artikel: ${slug}">
        <meta property="og:image" content="${base}/img/${slug}.jpg">
        <meta property="og:description" content="Beschreibung zu ${slug}">
        <meta property="article:published_time" content="${new Date(now - 5 * 3600_000).toISOString()}">
        </head><body><nav><a href="/">Start</a></nav><article><h1>${slug}</h1>${longText(slug)}</article><footer>Impressum</footer></body></html>`);
      return;
    }
    if (url.pathname.startsWith('/img/')) {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#7a9"/><text x="20" y="200" font-size="40" fill="#fff">${url.pathname.slice(5)}</text></svg>`);
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.FIXTURE_PORT || 4100);
  createFixtureServer().listen(port, () => console.log(`Testseite auf http://localhost:${port}`));
}
