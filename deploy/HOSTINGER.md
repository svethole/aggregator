# Installation auf dem Hostinger-VPS (KVM 1, Debian 13)

Diese Anleitung richtet den Aggregator mit **Docker** ein. Davor kommt **Caddy** (oder ein schon vorhandenes Nginx) für HTTPS. Alle Befehle werden als `root` per SSH ausgeführt.

Die Ressourcen reichen locker: Die App braucht im Betrieb etwa 100–200 MB RAM und kaum CPU.

---

## 0. Bestandsaufnahme

```bash
ssh root@<IP-DEINES-VPS>

ss -tlnp | grep -E ':(80|443|3000)\b'   # Belegt schon etwas die Ports 80/443/3000?
docker --version                          # Ist Docker schon installiert?
systemctl is-active nginx apache2 caddy   # Läuft schon ein Webserver?
```

- **Ports 80/443 frei:** Weiter mit Caddy in Schritt 6a.
- **Nginx läuft schon** (z. B. für svetho.net): Weiter mit Schritt 6b.
- **Port 3000 belegt:** In `docker-compose.yml` z. B. `127.0.0.1:3010:3000` eintragen und unten überall 3010 statt 3000 verwenden.

## 1. DNS-Eintrag

Lege dort, wo die Domain `svetho.net` verwaltet wird (z. B. im hPanel unter *Domains → DNS*), einen Eintrag an:

| Typ | Name | Ziel |
|---|---|---|
| A | `aggregator` | IPv4-Adresse des VPS |
| AAAA | `aggregator` | IPv6-Adresse des VPS (optional) |

Prüfen: `getent hosts aggregator.svetho.net` muss die IP des VPS liefern. Das kann ein paar Minuten dauern.

## 2. Firewall

Im hPanel unter *VPS → Sicherheit → Firewall* (falls aktiv) die Ports **22, 80 und 443** erlauben.
Läuft auf dem Server zusätzlich `ufw`, dann so:

```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp
```

## 3. Docker installieren (falls noch nicht vorhanden)

```bash
apt update && apt install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
docker run --rm hello-world
```

## 4. Code holen

Ist das Repository **privat**, braucht der Server einen schreibgeschützten Zugang über einen *Deploy Key*:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/aggregator_deploy -N "" -C "vps-aggregator"
cat ~/.ssh/aggregator_deploy.pub
```

Den ausgegebenen Schlüssel auf GitHub unter *svethole/aggregator → Settings → Deploy keys → Add deploy key* eintragen. Den Haken bei „Allow write access“ **nicht** setzen.

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-aggregator
  HostName github.com
  User git
  IdentityFile ~/.ssh/aggregator_deploy
EOF

git clone -b claude/news-aggregator-innoreader-6smy69 git@github-aggregator:svethole/aggregator.git /opt/aggregator
cd /opt/aggregator
```

> Der aktuelle Stand liegt derzeit auf dem Branch `claude/news-aggregator-innoreader-6smy69`. Wird er später nach `main` übernommen, wechselst Du mit `git fetch && git checkout main` dorthin.

Bei einem **öffentlichen** Repository reicht `git clone -b claude/news-aggregator-innoreader-6smy69 https://github.com/svethole/aggregator.git /opt/aggregator`.

## 5. Konfigurieren und starten

```bash
cd /opt/aggregator
cp .env.example .env
openssl rand -base64 18      # erzeugt ein sicheres Passwort zum Kopieren
nano .env
```

Mindestens diese Werte setzen:

```ini
BASE_URL=https://aggregator.svetho.net
ADMIN_USER=sven
ADMIN_PASSWORD=<das erzeugte Passwort>
BRAVE_API_KEY=<falls vorhanden>
```

```bash
chmod 600 .env
mkdir -p data && chown 1000:1000 data
docker compose up -d --build
docker compose logs -f        # Beenden mit Strg+C
curl -sI http://127.0.0.1:3000 | head -1   # → HTTP/1.1 200 OK
```

## 6a. HTTPS mit Caddy (wenn Port 80/443 frei ist)

Caddy ist bei Debian 13 direkt dabei und holt das Let's-Encrypt-Zertifikat automatisch:

```bash
apt install -y caddy
cp /opt/aggregator/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
journalctl -u caddy -n 50 --no-pager    # nach "certificate obtained" schauen
```

> Betreibt Caddy schon andere Seiten, hängst Du den Block aus `deploy/Caddyfile` an die bestehende `/etc/caddy/Caddyfile` an, statt sie zu überschreiben.

## 6b. HTTPS mit vorhandenem Nginx

```bash
apt install -y certbot python3-certbot-nginx
cp /opt/aggregator/deploy/nginx.conf /etc/nginx/sites-available/aggregator
ln -s /etc/nginx/sites-available/aggregator /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d aggregator.svetho.net
```

## 7. Fertig 🎉

**https://aggregator.svetho.net** öffnen und mit `ADMIN_USER`/`ADMIN_PASSWORD` anmelden.

Danach kannst Du `ADMIN_PASSWORD` aus der `.env` löschen, denn der Benutzer ist ja schon angelegt. Das Passwort lässt sich in den Einstellungen der App ändern.

Abos aus Inoreader übernimmst Du so: In Inoreader die OPML-Datei exportieren und in der App unter *Einstellungen → Importieren* hochladen.

---

## Alltag

| Was | Befehl (in `/opt/aggregator`) |
|---|---|
| Update einspielen | `git pull && docker compose up -d --build` |
| Logs ansehen | `docker compose logs -f --tail 100` |
| Neu starten | `docker compose restart` |
| Passwort zurücksetzen | `docker compose exec -it aggregator node scripts/user.js passwd sven` |
| Backup der Datenbank | `cp data/aggregator.db ~/aggregator-$(date +%F).db` (am besten kurz vorher `docker compose stop`) |
| Speicherplatz alter Images freigeben | `docker image prune -f` |

Die täglichen Hostinger-Backups sichern den ganzen Server und damit auch `/opt/aggregator/data`.
