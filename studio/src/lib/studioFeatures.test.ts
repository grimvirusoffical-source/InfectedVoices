import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { snapSemitones } from './pitchMath.ts'
import { clampPocketSec, pocketAssistOffsetSec, POCKET_LIMIT_SEC } from './pocket.ts'
import { loopRangeFromBars } from './transport.ts'
import { estimateKey } from './keyEstimate.ts'
import { REDX_INSTALL_COMMAND, VOCAL_LAB_V040 } from '../releases.ts'
import { formatDeliveryNote, measureDelivery } from './delivery.ts'
import { can, resolveTier, startTrial } from './plan.ts'
import { applyStripeSubscription } from '../../../scripts/stripe-subscription.mjs'

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

test('A–B key estimate hears a concert A', () => {
  const sampleRate = 22050
  const data = new Float32Array(sampleRate)
  for (let i = 0; i < data.length; i++) data[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.6
  const guess = estimateKey(data, sampleRate)
  assert.equal(guess?.key, 'A')
})

test('published v0.4.0 artifact is the Release source zipball', () => {
  assert.equal(VOCAL_LAB_V040.name, 'v0.4.0')
  assert.equal(VOCAL_LAB_V040.tag, 'Release')
  assert.equal(VOCAL_LAB_V040.branch, 'native/v040-unified-studio')
  assert.equal(VOCAL_LAB_V040.zipball, 'https://github.com/grimvirusoffical-source/InfectedVoices/zipball/Release')
  assert.equal(VOCAL_LAB_V040.page, 'https://github.com/grimvirusoffical-source/InfectedVoices/releases/tag/Release')
  const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'))
  assert.equal(pkg.redx.install_command, REDX_INSTALL_COMMAND)
  assert.equal(REDX_INSTALL_COMMAND, 'npm install --include=dev --ignore-scripts')
  const buildBrowser = readFileSync(new URL('../../../scripts/build-browser.mjs', import.meta.url), 'utf8')
  assert.match(buildBrowser, /install','--include=dev','--ignore-scripts','--prefix'/)
})

test('project lab bar loop is 4/4 at the session bpm', () => {
  const range = loopRangeFromBars(1, 2, 120)
  assert.deepEqual(range, { startBar: 1, endBar: 2, startSec: 0, endSec: 4 })
  const swapped = loopRangeFromBars(4, 2, 120)
  assert.equal(swapped.startBar, 4)
  assert.equal(swapped.endBar, 4)
  assert.equal(swapped.endSec - swapped.startSec, 2)
})

test('delivery note measures a half-scale sine instead of inventing loudness', () => {
  const rate = 48000
  const data = new Float32Array(rate)
  for (let i = 0; i < data.length; i++) data[i] = 0.5 * Math.sin((2 * Math.PI * 1000 * i) / rate)
  const buffer = {
    numberOfChannels: 1,
    sampleRate: rate,
    length: data.length,
    getChannelData: () => data,
  }
  const metrics = measureDelivery(buffer as unknown as AudioBuffer)
  assert.ok(Math.abs(metrics.samplePeakDb - -6.02) < 0.2)
  assert.ok(metrics.truePeakDbtp > metrics.samplePeakDb - 0.05)
  assert.ok(Number.isFinite(metrics.integratedLufs))
  const note = formatDeliveryNote({ metrics, sampleRate: rate, bits: 16, bpm: 140 })
  assert.match(note, /Delivery note: integrated .+ LUFS/)
  assert.match(note, /true peak .+ dBTP/)
  assert.match(note, /48000 Hz · 16-bit · 140 BPM/)
})

test('free WAV is labeled 16-bit and basic defaults to 48 kHz 24-bit', () => {
  const source = readFileSync(new URL('./exportAudio.ts', import.meta.url), 'utf8')
  assert.match(source, /sampleRate: 44100, bits: 16, label: '44\.1 kHz · 16-bit WAV'/)
  assert.match(source, /sampleRate: 48000, bits: 24, label: '48 kHz · 24-bit WAV'/)
  assert.equal(source.includes("label: 'pro"), false)
})

test('a 7-day trial is once per account and expiry drops Pro', () => {
  const future = Date.now() + 60 * 60 * 1000
  const past = Date.now() - 60 * 60 * 1000
  assert.equal(resolveTier({ trialPlan: 'pro', trialEnd: future }), 'pro')
  assert.equal(resolveTier({ trialPlan: 'pro', trialEnd: past, proTrialUsedAt: past }), 'free')
  assert.equal(resolveTier({ studioPlan: 'basic', trialPlan: 'pro', trialEnd: past }), 'basic')
  assert.equal(can(resolveTier({ trialPlan: 'pro', trialEnd: past }), 'stems'), false)
  const account = 'studio-trial-test'
  assert.equal(startTrial('basic', account).status, 200)
  assert.equal(startTrial('basic', account).status, 409)
  assert.equal(resolveTier({ account }), 'basic')
  assert.equal(can(resolveTier({ account }), 'project_lab'), true)
  assert.equal(can(resolveTier({ account }), 'stems'), false)
  assert.equal(startTrial('pro', 'studio-ineligible', Date.now(), { introEligible: false }).reason, 'ineligible')
  assert.equal(resolveTier({ account: 'studio-ineligible' }), 'free')
  assert.equal(startTrial('basic', 'studio-higher', Date.now(), { tier: 'pro' }).reason, 'higher')
})

test('stripe unpaid trial end returns to free or the lower paid plan', () => {
  const now = Date.now()
  const trialEnd = Math.floor((now + 7 * 24 * 60 * 60 * 1000) / 1000)
  const started = applyStripeSubscription(null, {
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_pro', status: 'trialing', trial_end: trialEnd, metadata: { plan: 'pro' } } },
  }, now)
  assert.equal(started.plan, 'pro')
  assert.ok(started.proTrialUsedAt)
  const expired = applyStripeSubscription(started, {
    type: 'customer.subscription.deleted',
    data: { object: { id: 'sub_pro', status: 'canceled', trial_end: Math.floor(now / 1000) - 10, metadata: { plan: 'pro' } } },
  }, now)
  assert.equal(expired.plan, 'free')
  assert.ok(expired.proTrialUsedAt)
  const withBasic = applyStripeSubscription(expired, {
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_basic', status: 'active', metadata: { plan: 'basic' } } },
  }, now)
  assert.equal(withBasic.plan, 'basic')
})
