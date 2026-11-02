import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const env = process.env;
const bool = (v, def) => (v === undefined || v === '' ? def : /^(1|true|yes|ja|on)$/i.test(v));
const int = (v, def) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : def);

export const config = {
  port: int(env.PORT, 3000),
  host: env.HOST || '0.0.0.0',
  dataDir: path.resolve(ROOT, env.DATA_DIR || 'data'),
  baseUrl: env.BASE_URL || '',
  // Cookies nur über HTTPS senden (hinter Reverse-Proxy mit TLS: true)
  cookieSecure: bool(env.COOKIE_SECURE, (env.BASE_URL || '').startsWith('https://')),
  trustProxy: bool(env.TRUST_PROXY, true),
  refreshIntervalMinutes: int(env.REFRESH_INTERVAL_MINUTES, 30),
  retentionDays: int(env.ARTICLE_RETENTION_DAYS, 90),
  fetchConcurrency: int(env.FETCH_CONCURRENCY, 4),
  braveApiKey: env.BRAVE_API_KEY || '',
  searchFallback: bool(env.SEARCH_FALLBACK, true),
  allowPrivateNetwork: bool(env.ALLOW_PRIVATE_NETWORK, false),
  adminUser: env.ADMIN_USER || '',
  adminPassword: env.ADMIN_PASSWORD || '',
  userAgent:
    env.USER_AGENT ||
    'Mozilla/5.0 (compatible; Aggregator/0.1; +https://aggregator.svetho.net)',
};

fs.mkdirSync(config.dataDir, { recursive: true });
