import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { classify } from './host-routes.mjs';
import { createHandler } from './serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

function request(port, urlPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: urlPath, method }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('routes stay on the distribution contract', () => {
  assert.equal(classify('/voices').kind, 'voices');
  assert.equal(classify('/get').kind, 'store-page');
  assert.equal(classify('/download').kind, 'store-page');
  assert.equal(classify('/voices/app.ipa').kind, 'forbidden');
  assert.equal(classify('/store/app.aab').kind, 'forbidden');
  assert.equal(classify('/InfectedVoices.app').kind, 'forbidden');
  assert.equal(classify('/voices/%2e%2e/core/package.json').kind, 'forbidden');
});

test('host serves /voices and /get and refuses binaries', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iv-web-'));
  fs.mkdirSync(path.join(tmp, 'host'), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, 'host', 'landing.html'), path.join(tmp, 'host', 'landing.html'));
  fs.mkdirSync(path.join(tmp, 'core', 'download'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'core', 'download', 'index.html'), '<p>store-only fixture</p>');
  fs.mkdirSync(path.join(tmp, 'site', 'voices'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'site', 'voices', 'index.html'), '<p>voices fixture</p>');
  fs.writeFileSync(path.join(tmp, 'site', 'voices', 'app.ipa'), 'nope');
  const server = http.createServer(createHandler(tmp));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    const home = await request(port, '/');
    assert.equal(home.status, 200);
    assert.match(home.body, /\/voices/);
    assert.match(home.body, /\/get/);
    const store = await request(port, '/get');
    const download = await request(port, '/download');
    assert.equal(store.status, 200);
    assert.equal(download.body, store.body);
    assert.match(store.body, /store-only fixture/);
    const voices = await request(port, '/voices');
    assert.equal(voices.status, 200);
    assert.match(voices.body, /voices fixture/);
    const ipa = await request(port, '/voices/app.ipa');
    assert.equal(ipa.status, 403);
    const mac = await request(port, '/InfectedVoices-Mac.app');
    assert.equal(mac.status, 403);
    const escape = await request(port, '/voices/../../core/download/index.html');
    assert.equal(escape.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
