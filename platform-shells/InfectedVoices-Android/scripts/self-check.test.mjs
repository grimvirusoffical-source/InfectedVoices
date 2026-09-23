import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { assertCorePin, root } from './core-pin.mjs';

test('pins Core and keeps DSP out of the shell', () => {
  assertCorePin();
});

test('Play upload flags are refused', () => {
  for (const flag of ['--submit', '--upload', '--eas', '--release']) {
    const result = spawnSync(process.execPath, ['scripts/prepare-android.mjs', flag], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Refusing store upload/);
  }
});
