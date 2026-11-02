# Einrichtung auf dem Server (Hostinger-VPS, Debian 13, nginx)

Die Einrichtung folgt dem Aufbau der anderen svetho-Subdomains:

- Der Code liegt in `/var/www/aggregator` und wird als root über einen Deploy-Key geklont.
- nginx mit certbot sorgt für HTTPS.
- Zugang gibt's nur über die **gemeinsame svetho-Anmeldung** (Snippet aus svetho-portal).

Anders als die statischen Seiten braucht der Aggregator einen **eigenen Dienst**. Ein kleines Node.js-Programm ruft die Feeds regelmäßig ab und lauscht nur auf `127.0.0.1:3070`. nginx reicht die Anfragen dorthin weiter.

| Was | Wo |
|---|---|
| Code | `/var/www/aggregator` (gehört root) |
| Einstellungen | `/var/www/aggregator/.env` (root:aggregator, 640) |
| Datenbank | `/var/lib/aggregator/aggregator.db` (gehört dem Dienstbenutzer `aggregator`) |
| Dienst | `aggregator.service` (systemd, läuft als Benutzer `aggregator`) |
| nginx | `/etc/nginx/sites-available/aggregator.svetho.net` |

Alle Befehle auf dem Server. Voraussetzung: Die svetho-Anmeldung aus **svetho-portal** läuft schon. Dazu gehören `/etc/nginx/snippets/svetho-sso-check.conf` und `/etc/nginx/conf.d/svetho-sso.conf`.

---

### 1. DNS-Eintrag für die Subdomain

Beim DNS-Anbieter von svetho.net – genauso wie bei den anderen Subdomains:

| Typ  | Name         | Wert                         |
| ---- | ------------ | ---------------------------- |
| A    | `aggregator` | IPv4-Adresse des Servers     |
| AAAA | `aggregator` | IPv6-Adresse (falls genutzt) |

```bash
dig +short aggregator.svetho.net    # muss dasselbe liefern wie dig +short tschechisch.svetho.net
```

### 2. Node.js 22 installieren

Debian 13 bringt nur Node.js 20 mit. Der Aggregator braucht mindestens 22.5, weil er die eingebaute SQLite-Datenbank von Node verwendet. Darum kommt Node von NodeSource:

```bash
sudo apt update
sudo apt install -y curl git ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
node --version          # v22.x
```

Port 3070 muss frei sein:

```bash
sudo ss -tlnp | grep ':3070\b' || echo "frei"
```

Ist er belegt, nimmst Du einen anderen Port und trägst ihn in `.env` (PORT) und in der nginx-Konfiguration ein.

### 3. Deploy-Key (einmalig, das Repo ist privat)

Wie bei den anderen Repos: ein eigener Schlüssel nur zum Lesen, er liegt bei root.

```bash
sudo ssh-keygen -t ed25519 -N "" -C "deploy aggregator" -f /root/.ssh/deploy_aggregator

# Öffentlichen Schlüssel anzeigen und bei GitHub eintragen:
#   https://github.com/svethole/aggregator/settings/keys/new
#   (Titel z. B. „svetho-server“, „Allow write access“ NICHT anhaken)
sudo cat /root/.ssh/deploy_aggregator.pub

sudo tee -a /root/.ssh/config >/dev/null <<'EOT'

Host github-aggregator
    HostName github.com
    User git
    IdentityFile /root/.ssh/deploy_aggregator
    IdentitiesOnly yes
EOT
sudo chmod 600 /root/.ssh/config

# Testen: „Hi svethole/aggregator! You've successfully authenticated …“
sudo ssh -T git@github-aggregator
```

### 4. Klonen, Dienstbenutzer und Datenordner

```bash
cd /var/www
sudo git clone -b main git@github-aggregator:svethole/aggregator.git
cd aggregator
sudo npm ci --omit=dev --no-audit --no-fund

sudo useradd --system --no-create-home --shell /usr/sbin/nologin aggregator
sudo mkdir -p /var/lib/aggregator
sudo chown aggregator:aggregator /var/lib/aggregator
sudo chmod 750 /var/lib/aggregator
```

### 5. Einstellungen

```bash
sudo cp .env.example .env
sudo nano .env
sudo chown root:aggregator .env && sudo chmod 640 .env
```

Die Vorlage passt schon für diesen Server: Port 3070, die gemeinsame Anmeldung und `/var/lib/aggregator`. Prüfen solltest Du nur:

- `ADMIN_USER`: Dein Benutzername in der App, z. B. `sven`.
- `BRAVE_API_KEY`: der Schlüssel für die Websuche, falls vorhanden.

### 6. Dienst starten

```bash
sudo cp deploy/aggregator.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now aggregator
sudo systemctl status aggregator          # „active (running)“
sudo journalctl -u aggregator -n 20       # „Anmeldung über den Webserver aktiv …“
curl -sI http://127.0.0.1:3070 | head -1  # HTTP/1.1 200 OK
```

### 7. nginx

```bash
sudo cp deploy/aggregator.svetho.net.conf /etc/nginx/sites-available/aggregator.svetho.net
sudo ln -s /etc/nginx/sites-available/aggregator.svetho.net /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 8. Zertifikat (Let's Encrypt)

```bash
sudo certbot --nginx -d aggregator.svetho.net
```

Die Frage nach der Umleitung von HTTP auf HTTPS beantwortest Du mit **2 (Redirect)**. certbot ergänzt den 443-Teil dann selbst. Die Zeilen `include …` und `proxy_set_header X-Svetho-Sso …` übernimmt es dabei mit.

### 9. Ausprobieren

https://aggregator.svetho.net öffnen. Ohne Anmeldung geht's zum Portal, danach zurück zum Aggregator, und zwar **ohne zweite Anmeldung**. „Abmelden“ in den Einstellungen der App führt zu `svetho.net/abmelden`.

Abos aus Inoreader übernehmen: In Inoreader die Abos als OPML exportieren und in der App unter *Einstellungen → Importieren* hochladen.

---

## Aktualisieren

```bash
cd /var/www/aggregator && sudo ./aktualisieren.sh
```

Das Skript holt den neuesten Stand (`git pull`), installiert die Pakete neu und startet den Dienst neu.

## Nützliches

| Was | Befehl |
|---|---|
| Logs ansehen | `sudo journalctl -u aggregator -f` |
| Neu starten | `sudo systemctl restart aggregator` |
| Backup der Datenbank | `sudo cp /var/lib/aggregator/aggregator.db ~/aggregator-$(date +%F).db` |
| Speicherverbrauch | `systemctl status aggregator` (Zeile „Memory“) |

Die täglichen Hostinger-Backups sichern `/var/lib/aggregator` automatisch mit.

## Wie die gemeinsame Anmeldung hier funktioniert

1. `snippets/svetho-sso-check.conf` leitet ohne gültiges `svetho_sso`-Cookie zum Portal um, wie bei allen Subdomains.
2. Zusätzlich gibt nginx der App per Header `X-Svetho-Sso` den Wert `$svetho_sso_ok` mit, also 1 oder 0. Diesen Wert berechnet die map in `conf.d/svetho-sso.conf`.
3. Ein Header, den ein Browser selbst schickt, wird dabei von nginx überschrieben.
4. Die App glaubt dem Header nur bei Anfragen von `127.0.0.1`, also nur von nginx. Bei `1` gilt `ADMIN_USER` als angemeldet.

Soll die App stattdessen ihre **eigene** Anmeldung verwenden, lässt Du `PROXY_AUTH_HEADER` in der `.env` leer und setzt `ADMIN_PASSWORD`. Danach `sudo systemctl restart aggregator`.
