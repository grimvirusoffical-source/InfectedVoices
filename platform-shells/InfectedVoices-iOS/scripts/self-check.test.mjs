import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { assertCorePin, root } from './core-pin.mjs';

test('pins Core and keeps DSP out of the shell', () => {
  assertCorePin();
});

test('App Store upload and Mac targets are refused', () => {
  for (const flag of ['--submit', '--upload', '--eas', '--mac', '--catalyst', '--macos']) {
    const result = spawnSync(process.execPath, ['scripts/prepare-ios.mjs', flag], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Refusing store upload or a Mac target/);
  }
});
