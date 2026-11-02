import express from 'express';
import path from 'node:path';
import { config, ROOT } from './config.js';
import './db.js';
import { api, setupCode } from './api.js';
import { parseCookies, bootstrapAdmin, needsSetup, cleanupSessions } from './auth.js';
import { refreshAll, cleanup } from './feeds.js';

bootstrapAdmin();

const app = express();
app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src * data: blob:; media-src *; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.dailymotion.com; " +
      "style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(parseCookies);
app.use('/api', api);
app.use(express.static(path.join(ROOT, 'public'), { maxAge: '1h', index: 'index.html' }));
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));

app.listen(config.port, config.host, () => {
  console.log(`Aggregator läuft auf http://${config.host}:${config.port}`);
  if (needsSetup()) {
    console.log('──────────────────────────────────────────────');
    console.log(` Einrichtungscode für das erste Konto: ${setupCode}`);
    console.log('──────────────────────────────────────────────');
  }
});

// Regelmäßige Aktualisierung der Quellen
async function tick() {
  try {
    const added = await refreshAll();
    if (added) console.log(`${new Date().toISOString()} – ${added} neue Artikel`);
  } catch (err) {
    console.error('Aktualisierung fehlgeschlagen:', err);
  }
}
setTimeout(tick, 5000);
setInterval(tick, 5 * 60_000);
setInterval(() => {
  try {
    cleanup();
    cleanupSessions();
  } catch (err) {
    console.error('Aufräumen fehlgeschlagen:', err);
  }
}, 6 * 3600_000);
