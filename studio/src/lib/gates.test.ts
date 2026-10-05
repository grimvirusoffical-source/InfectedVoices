import assert from 'node:assert/strict'
import { test } from 'node:test'
import { entitlementFixtures } from './entitlements.ts'
import {
  canUseAdvancedEditor,
  canUseSmartMix,
  exportBitDepthLabel,
  exportLimits,
  isFeatureLocked,
  trialCtaVisibility,
} from './gates.ts'

test('gates: Free locks advanced + smart mix; export 16-bit', () => {
  const e = entitlementFixtures().free
  assert.equal(canUseAdvancedEditor(e), false)
  assert.equal(canUseSmartMix(e), false)
  assert.equal(exportLimits(e).maxBitDepth, 16)
  assert.equal(isFeatureLocked('advanced', e), true)
  assert.equal(isFeatureLocked('smart-mix', e), true)
  assert.equal(isFeatureLocked('wav24', e), true)
  assert.match(exportBitDepthLabel(e), /16-bit/)
  const cta = trialCtaVisibility(e)
  assert.equal(cta.showBasic, true)
  assert.equal(cta.showPro, true)
})

test('gates: Basic unlocks advanced + 24-bit; Smart Mix locked', () => {
  const e = entitlementFixtures().basic
  assert.equal(canUseAdvancedEditor(e), true)
  assert.equal(canUseSmartMix(e), false)
  assert.equal(exportLimits(e).maxBitDepth, 24)
  assert.equal(exportLimits(e).sampleRateHz, 48000)
  assert.equal(isFeatureLocked('advancedEditor', e), false)
  assert.equal(isFeatureLocked('smartMix', e), true)
  assert.equal(isFeatureLocked('export24', e), false)
  assert.match(exportBitDepthLabel(e), /24-bit/)
})

test('gates: Pro unlocks Smart Mix + 24-bit', () => {
  const e = entitlementFixtures().pro
  assert.equal(canUseAdvancedEditor(e), true)
  assert.equal(canUseSmartMix(e), true)
  assert.equal(isFeatureLocked('smart-mix', e), false)
  assert.equal(exportLimits(e).maxBitDepth, 24)
})

test('gates: trialBasic matches Basic features; trialEligible.basic false', () => {
  const e = entitlementFixtures().trialBasic
  assert.equal(e.tier, 'basic')
  assert.equal(canUseAdvancedEditor(e), true)
  assert.equal(canUseSmartMix(e), false)
  assert.equal(trialCtaVisibility(e).basic, false)
  assert.equal(trialCtaVisibility(e).pro, true)
})

test('gates: trialPro unlocks Smart Mix; trialEligible.pro false', () => {
  const e = entitlementFixtures().trialPro
  assert.equal(e.tier, 'pro')
  assert.equal(canUseSmartMix(e), true)
  assert.equal(trialCtaVisibility(e).pro, false)
})

test('gates: pastDue fail-closed to Free locks', () => {
  const e = entitlementFixtures().pastDue
  assert.equal(e.tier, 'free')
  assert.equal(canUseAdvancedEditor(e), false)
  assert.equal(canUseSmartMix(e), false)
  assert.equal(exportLimits(e).maxBitDepth, 16)
  assert.equal(isFeatureLocked('advanced', e), true)
})

test('gates: never unlock from empty / free fixture only', () => {
  const e = entitlementFixtures().free
  assert.equal(isFeatureLocked('ai_mix_master', e), true)
  assert.equal(isFeatureLocked('precision_tune', e), true)
})
