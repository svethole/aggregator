#!/bin/sh
# Holt den neuesten Stand und startet den Dienst neu.
#   cd /var/www/aggregator && sudo ./aktualisieren.sh
set -e
cd "$(dirname "$0")"
git pull --ff-only
npm ci --omit=dev --no-audit --no-fund
systemctl restart aggregator
sleep 2
systemctl --no-pager --lines=5 status aggregator
