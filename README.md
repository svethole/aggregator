# Aggregator

Ein selbst gehosteter News-Aggregator im Stil von Inoreader – für **aggregator.svetho.net**.

## Funktionen

- **RSS-/Atom-/JSON-Feeds** abonnieren, auch wenn nur die Adresse der Webseite bekannt ist (der Feed wird automatisch gesucht).
- **Webseiten ohne Feed** beobachten: Die Seite wird regelmäßig nach neuen Artikel-Links durchsucht. Bild, Beschreibung, Datum und Sprache werden von der Artikelseite ergänzt. Bei Bedarf lässt sich pro Seite ein CSS-Selektor angeben.
- **Quellensuche** direkt in der Oberfläche (z. B. „wissenschaft zoologie“ oder „lokalnachrichten ludwigsburg“). Ein Klick abonniert das Ergebnis.
  - Die Feedsuche läuft über Feedly und braucht keinen Schlüssel.
  - Die Websuche läuft über die Brave Search API, wenn `BRAVE_API_KEY` gesetzt ist. Sonst wird DuckDuckGo als Notlösung verwendet, das kann aber ab und zu blockieren.
- **Kategorien**: Ein Abo kann beliebig vielen Kategorien zugeordnet werden. Kategorien lassen sich umbenennen, sortieren und einklappen.
- **Zähler für neue (ungelesene) Artikel** bei Kategorien und Quellen. Der Zeitraum ist einstellbar: insgesamt, heute (Standard), diese Woche, letzte 7 Tage, dieser Monat oder letzte 30 Tage.
- **Drei Ansichten**:
  - Liste mit Details (Datum, Kategorie, Seite, Sprache)
  - Liste mit größerem Bild und Zusammenfassung
  - Kacheln mit großen Bildern und längerem Textauszug
- **Filter** nach Zeitraum (auch frei wählbar), Kategorie, Seite und Sprache, dazu eine Volltextsuche in Titel und Zusammenfassung.
- **Leseansicht**:
  - Schriftgröße frei einstellbar
  - 8 Schriftarten (nur Systemschriften, also keine Google-Fonts und damit DSGVO-freundlich)
  - Zeilenabstand und Textbreite
  - 8 Farbschemata: Hell, Papier, Sepia, Mint, Grau, Dunkel, Nacht, Kontrast
- **Volltext**: Der vollständige Artikel wird nach Möglichkeit von der Originalseite geladen (wie der Lesemodus im Browser). Klappt das nicht, gibt es den Feed-Inhalt. Ein Link zur Originalseite ist immer dabei.
- **Verlauf** der gelesenen Artikel (ganz oder einzeln löschbar) und **Favoriten**.
- **OPML-Import und -Export**, z. B. um die Abos aus Inoreader zu übernehmen.
- Hell- und Dunkelmodus, Mobilansicht, Tastenkürzel (`j`/`k`, `s`, `m`, `v`, `r`, `/`, `1`/`2`/`3`).
- Vorbereitet für mehrere Benutzer: Abos, Kategorien, Gelesen-Status, Favoriten und Verlauf sind pro Benutzer getrennt, die Quellen werden geteilt.

**Technik:** Node.js ≥ 22.5. Als Datenbank dient SQLite, und zwar das in Node eingebaute `node:sqlite`. Es müssen also keine nativen Module kompiliert werden. Die Oberfläche kommt ohne Build-Schritt aus.

## Lokal ausprobieren

```bash
npm install
cp .env.example .env      # Werte anpassen (für lokal: BASE_URL leer lassen, HOST=127.0.0.1)
npm start                 # → http://localhost:3000
```

Ist in der `.env` kein `ADMIN_USER`/`ADMIN_PASSWORD` gesetzt, zeigt die App beim ersten Aufruf eine Einrichtungsseite. Den nötigen **Einrichtungscode** gibt der Server beim Start im Log aus.

## Installation auf dem Hostinger-VPS

Eine ausführliche Schritt-für-Schritt-Anleitung speziell für den Hostinger-VPS (Debian 13) steht in [`deploy/HOSTINGER.md`](deploy/HOSTINGER.md).

Voraussetzung: Die DNS-Einträge für `aggregator.svetho.net` (A-Record, ggf. AAAA) zeigen auf die IP des VPS.

### Variante A: Docker (empfohlen)

```bash
cd /opt
git clone https://github.com/svethole/aggregator.git
cd aggregator
cp .env.example .env && nano .env        # Passwort, ggf. BRAVE_API_KEY setzen
mkdir -p data && sudo chown 1000:1000 data
docker compose up -d --build
docker compose logs -f                   # prüfen, ob alles läuft
```

Danach brauchst Du noch HTTPS über einen Reverse-Proxy (siehe unten).

**Update:** `git pull && docker compose up -d --build`

### Variante B: Node.js direkt (mit systemd)

```bash
# Node.js 22 installieren (falls noch nicht vorhanden)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

sudo useradd --system --home /opt/aggregator aggregator
sudo git clone https://github.com/svethole/aggregator.git /opt/aggregator
cd /opt/aggregator
sudo npm ci --omit=dev
sudo cp .env.example .env && sudo nano .env
sudo mkdir -p data && sudo chown -R aggregator:aggregator data .env
sudo cp deploy/aggregator.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now aggregator
journalctl -u aggregator -f
```

**Update:** `cd /opt/aggregator && sudo git pull && sudo npm ci --omit=dev && sudo systemctl restart aggregator`

### HTTPS mit Nginx oder Caddy

- **Nginx:**
  ```bash
  sudo cp deploy/nginx.conf /etc/nginx/sites-available/aggregator
  sudo ln -s /etc/nginx/sites-available/aggregator /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
  sudo certbot --nginx -d aggregator.svetho.net
  ```
- **Caddy:** Den Inhalt von `deploy/Caddyfile` in `/etc/caddy/Caddyfile` übernehmen und `sudo systemctl reload caddy` ausführen. Das Zertifikat holt Caddy dann automatisch.

### Hostinger „Node.js Web App“ (Shared/Cloud Hosting)

Das geht grundsätzlich auch, wenn Node.js 22 auswählbar ist. Als Startbefehl `npm start` eintragen und die Umgebungsvariablen aus `.env.example` im hPanel setzen. Wichtig: `DATA_DIR` muss auf einen Ordner zeigen, der bei neuen Deployments erhalten bleibt. Außerdem muss der Prozess dauerhaft laufen dürfen, sonst werden die Feeds im Hintergrund nicht aktualisiert.

## Benutzer verwalten

```bash
npm run user -- list
npm run user -- add <name>        # weiteren Benutzer anlegen
npm run user -- passwd <name>     # Passwort zurücksetzen
```

Mit Docker: `docker compose exec aggregator node scripts/user.js passwd sven`

## Datensicherung

Alle Daten liegen in `data/aggregator.db`. Für ein konsistentes Backup im laufenden Betrieb:

```bash
sqlite3 data/aggregator.db ".backup 'backup-$(date +%F).db'"
```

Alternativ den Dienst kurz stoppen und den Ordner `data/` kopieren.

## Konfiguration

Alle Einstellungen stehen kommentiert in [`.env.example`](.env.example). Die wichtigsten:

| Variable | Standard | Bedeutung |
|---|---|---|
| `BASE_URL` | – | öffentliche Adresse; mit `https://` werden Cookies nur verschlüsselt übertragen |
| `REFRESH_INTERVAL_MINUTES` | 30 | Abrufintervall der Quellen |
| `ARTICLE_RETENTION_DAYS` | 90 | ältere Artikel werden gelöscht (außer Favoriten und Verlauf) |
| `BRAVE_API_KEY` | – | Schlüssel für die Websuche bei der Quellensuche |
| `SEARCH_FALLBACK` | true | ohne Schlüssel DuckDuckGo verwenden |

## Sicherheit

- Passwörter werden mit scrypt gehasht. Die Sitzungen laufen über HttpOnly-Cookies mit SameSite=Lax, und wiederholte Fehlversuche beim Anmelden werden gebremst.
- Artikelinhalte werden serverseitig bereinigt (kein JavaScript, keine Styles). Dazu kommt eine strenge Content-Security-Policy.
- Der Server ruft keine internen Adressen ab (localhost, LAN), damit niemand über die App interne Dienste erreichen kann.

## Tests

```bash
npm test
```

Die Tests laufen gegen eine lokale Test-Nachrichtenseite: Feed-Erkennung, Feed-Abruf, Erkennung von Artikeln auf Seiten ohne Feed (inkl. Latin-1), Volltext, Spracherkennung und die Sperre für interne Adressen.
