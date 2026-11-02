import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agg-auth-'));
const port = 3900 + Math.floor(Math.random() * 90);
const base = `http://127.0.0.1:${port}`;
let proc;

before(async () => {
  proc = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], {
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      PORT: String(port),
      HOST: '127.0.0.1',
      PROXY_AUTH_HEADER: 'X-Svetho-Sso',
      PROXY_AUTH_USER: 'sven',
      LOGOUT_URL: 'https://svetho.net/abmelden',
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(base + '/api/session');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

after(() => {
  proc.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('Anmeldung über den Webserver-Header', async () => {
  const ok = await (await fetch(base + '/api/session', { headers: { 'X-Svetho-Sso': '1' } })).json();
  assert.equal(ok.user.username, 'sven');
  assert.equal(ok.logoutUrl, 'https://svetho.net/abmelden');
  const r = await fetch(base + '/api/subscriptions', { headers: { 'X-Svetho-Sso': '1' } });
  assert.equal(r.status, 200);
});

test('ohne gültigen Header keine Anmeldung', async () => {
  const no = await (await fetch(base + '/api/session', { headers: { 'X-Svetho-Sso': '0' } })).json();
  assert.equal(no.user, null);
  assert.equal(no.setup, false);
  assert.equal((await fetch(base + '/api/subscriptions')).status, 401);
});
