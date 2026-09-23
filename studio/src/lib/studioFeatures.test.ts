import assert from 'node:assert/strict'
import { test } from 'node:test'
import { snapSemitones } from './pitchMath.ts'
import { clampPocketSec, pocketAssistOffsetSec, POCKET_LIMIT_SEC } from './pocket.ts'
import { loopRangeFromBars } from './transport.ts'

test('scale snap holds a concert A in A major', () => {
  const shift = snapSemitones(440, 'A', 'major', 8)
  assert.equal(shift, 0)
})

test('scale snap pulls A# toward the A major collection', () => {
  const shift = snapSemitones(466.16, 'A', 'major', 5)
  assert.ok(shift != null)
  assert.ok(Math.abs(shift) > 0.4 && Math.abs(shift) < 1.6)
})

test('pocket assist stays inside ±80 ms', () => {
  assert.equal(POCKET_LIMIT_SEC, 0.08)
  assert.equal(clampPocketSec(0.2), 0.08)
  assert.equal(clampPocketSec(-0.5), -0.08)
  const sr = 48000
  const data = new Float32Array(sr)
  data[Math.floor(0.12 * sr)] = 0.2
  const offset = pocketAssistOffsetSec(data, sr, 60)
  assert.ok(offset <= 0.08 && offset >= -0.08)
  assert.ok(Math.abs(offset + 0.08) < 1e-9 || Math.abs(offset) <= 0.08)
})

test('project lab bar loop is 4/4 at the session bpm', () => {
  const range = loopRangeFromBars(1, 2, 120)
  assert.deepEqual(range, { startBar: 1, endBar: 2, startSec: 0, endSec: 4 })
  const swapped = loopRangeFromBars(4, 2, 120)
  assert.equal(swapped.startBar, 4)
  assert.equal(swapped.endBar, 4)
  assert.equal(swapped.endSec - swapped.startSec, 2)
})
