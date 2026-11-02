// Benutzer verwalten:
//   npm run user -- add <name>        Benutzer anlegen
//   npm run user -- passwd <name>     Passwort setzen
//   npm run user -- list              Benutzer auflisten
import readline from 'node:readline/promises';
import { q } from '../server/db.js';
import { createUser, setPassword } from '../server/auth.js';

const [cmd, name] = process.argv.slice(2);

async function askPassword() {
  if (process.env.NEW_PASSWORD) return process.env.NEW_PASSWORD;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const pw = await rl.question('Neues Passwort: ');
  rl.close();
  return pw;
}

try {
  if (cmd === 'list') {
    for (const u of q('SELECT id, username, created_at FROM users').all()) {
      console.log(`${u.id}\t${u.username}\t${new Date(u.created_at).toLocaleString('de-DE')}`);
    }
  } else if (cmd === 'add' && name) {
    createUser(name, await askPassword());
    console.log(`Benutzer „${name}“ angelegt.`);
  } else if (cmd === 'passwd' && name) {
    const u = q('SELECT id FROM users WHERE username = ?').get(name);
    if (!u) throw new Error('Benutzer nicht gefunden');
    setPassword(u.id, await askPassword());
    console.log('Passwort geändert.');
  } else {
    console.log('Verwendung: npm run user -- add <name> | passwd <name> | list');
  }
} catch (err) {
  console.error('Fehler:', err.message);
  process.exitCode = 1;
}
