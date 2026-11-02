import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { config } from './config.js';

export const db = new DatabaseSync(path.join(config.dataDir, 'aggregator.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
`);

const migrations = [
  // 1: Grundschema
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE settings (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (user_id, key)
  );
  -- Eine Quelle (Feed oder Webseite) wird von allen Benutzern geteilt
  CREATE TABLE sources (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('rss','scrape')),
    url TEXT NOT NULL,
    site_url TEXT,
    title TEXT,
    description TEXT,
    icon_url TEXT,
    language TEXT,
    selector TEXT,
    etag TEXT,
    last_modified TEXT,
    last_fetched_at INTEGER,
    last_success_at INTEGER,
    last_error TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE (type, url)
  );
  CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    title TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE (user_id, source_id)
  );
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, name)
  );
  CREATE TABLE subscription_categories (
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (subscription_id, category_id)
  );
  CREATE TABLE articles (
    id INTEGER PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    guid TEXT NOT NULL,
    url TEXT,
    title TEXT,
    author TEXT,
    summary TEXT,
    content TEXT,
    image_url TEXT,
    language TEXT,
    published_at INTEGER NOT NULL,
    fetched_at INTEGER NOT NULL,
    fulltext TEXT,
    fulltext_status TEXT,
    UNIQUE (source_id, guid)
  );
  CREATE INDEX idx_articles_source_pub ON articles (source_id, published_at DESC);
  CREATE INDEX idx_articles_pub ON articles (published_at DESC);
  CREATE TABLE article_states (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    read_at INTEGER,
    favorite_at INTEGER,
    PRIMARY KEY (user_id, article_id)
  );
  CREATE INDEX idx_states_fav ON article_states (user_id, favorite_at);
  CREATE TABLE history (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    viewed_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, article_id)
  );
  CREATE INDEX idx_history_user ON history (user_id, viewed_at DESC);
  `,
];

const { user_version: version } = db.prepare('PRAGMA user_version').get();
for (let i = version; i < migrations.length; i++) {
  db.exec('BEGIN');
  try {
    db.exec(migrations[i]);
    db.exec(`PRAGMA user_version = ${i + 1}`);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function tx(fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

const stmtCache = new Map();
export function q(sql) {
  let s = stmtCache.get(sql);
  if (!s) {
    s = db.prepare(sql);
    stmtCache.set(sql, s);
  }
  return s;
}
