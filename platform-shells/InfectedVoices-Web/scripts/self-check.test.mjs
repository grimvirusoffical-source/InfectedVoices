import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { assertCorePin, root } from './core-pin.mjs';

test('pins Core and keeps DSP out of the shell', () => {
  assertCorePin();
});

test('stage does not invent a payload when Core is absent', () => {
  if (fs.existsSync(path.join(root, 'core', 'package.json'))) return;
  const result = spawnSync(process.execPath, ['scripts/stage-site.mjs', '--stage'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /will not invent a studio payload/);
});

test('landing page points at open web and the store page', () => {
  const landing = fs.readFileSync(path.join(root, 'host', 'landing.html'), 'utf8');
  assert.match(landing, /href="\/voices"/);
  assert.match(landing, /href="\/get"/);
  assert.match(landing, /href="\/download"/);
  assert.doesNotMatch(landing, /href="[^"]+\.(ipa|aab|apk|exe|msi|dmg|app)"/i);
});
