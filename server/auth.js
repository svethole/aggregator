import crypto from 'node:crypto';
import { q } from './db.js';
import { config } from './config.js';

const SESSION_DAYS = 60;
export const COOKIE = 'agg_session';

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pw), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(pw, stored) {
  const [alg, saltB64, hashB64] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(String(pw), Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

export function createUser(username, password) {
  if (!/^[\w.@-]{2,64}$/.test(username)) throw new Error('Ungültiger Benutzername');
  if (String(password).length < 8) throw new Error('Das Passwort muss mindestens 8 Zeichen haben');
  return q('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?) RETURNING id').get(
    username,
    hashPassword(password),
    Date.now(),
  ).id;
}

export function setPassword(userId, password) {
  if (String(password).length < 8) throw new Error('Das Passwort muss mindestens 8 Zeichen haben');
  q('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), userId);
  q('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

/** Legt beim ersten Start einen Benutzer aus ADMIN_USER/ADMIN_PASSWORD an. */
export function bootstrapAdmin() {
  const { n } = q('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) return;
  if (config.adminUser && config.adminPassword) {
    createUser(config.adminUser, config.adminPassword);
    console.log(`Benutzer „${config.adminUser}“ wurde angelegt.`);
  } else {
    console.warn('Noch kein Benutzer vorhanden: Beim ersten Aufruf kann ein Konto angelegt werden (Einrichtung).');
  }
}

export function needsSetup() {
  return q('SELECT COUNT(*) AS n FROM users').get().n === 0;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: SESSION_DAYS * 86400_000,
    path: '/',
  };
}

export function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  q('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, Date.now() + SESSION_DAYS * 86400_000);
  res.cookie(COOKIE, token, cookieOptions());
}

export function endSession(req, res) {
  const token = req.cookies?.[COOKIE];
  if (token) q('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
}

export function parseCookies(req, _res, next) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  req.cookies = out;
  next();
}

export function sessionUser(req, res) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  const row = q(`SELECT u.id, u.username, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`).get(token);
  if (!row || row.expires_at <= Date.now()) return null;
  // Sitzung gleitend verlängern (höchstens einmal am Tag)
  if (row.expires_at - Date.now() < (SESSION_DAYS - 1) * 86400_000) {
    q('UPDATE sessions SET expires_at = ? WHERE token = ?').run(Date.now() + SESSION_DAYS * 86400_000, token);
    res.cookie(COOKIE, token, cookieOptions());
  }
  return { id: row.id, username: row.username };
}

export function requireUser(req, res, next) {
  const user = sessionUser(req, res);
  if (user) {
    req.user = user;
    return next();
  }
  res.status(401).json({ error: 'Nicht angemeldet', setup: needsSetup() });
}

// Einfache Bremse gegen Passwort-Raten
const attempts = new Map();
export function loginAllowed(ip) {
  const a = attempts.get(ip);
  if (!a) return true;
  if (Date.now() - a.first > 15 * 60_000) {
    attempts.delete(ip);
    return true;
  }
  return a.count < 10;
}
export function loginFailed(ip) {
  const a = attempts.get(ip) || { count: 0, first: Date.now() };
  a.count++;
  attempts.set(ip, a);
}
export function loginSucceeded(ip) {
  attempts.delete(ip);
}

export function cleanupSessions() {
  q('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}
