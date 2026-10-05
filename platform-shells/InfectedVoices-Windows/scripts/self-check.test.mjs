import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { assertCorePin, root } from './core-pin.mjs';

test('pins Core and keeps DSP out of the shell', () => {
  assertCorePin();
});

test('checksum stays a placeholder with no installer', () => {
  const sums = fs.readFileSync(path.join(root, 'release', 'SHA256SUMS.txt'), 'utf8');
  assert.match(sums, /UNPROVISIONED/);
  assert.doesNotMatch(sums, /^[a-f0-9]{64}\s+\S+/m);
  const host = JSON.parse(fs.readFileSync(path.join(root, 'packaging', 'host.json'), 'utf8'));
  assert.equal(host.selectedHost, 'webview2');
  assert.equal(host.cutsRelease, false);
  assert.deepEqual(host.alternatesNotImplemented, ['electron', 'tauri']);
});

test('release and sign flags are refused', () => {
  for (const flag of ['--release', '--sign']) {
    const result = spawnSync(process.execPath, ['scripts/stage-windows-payload.mjs', flag], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Refusing to sign or cut a Windows Release/);
  }
});
