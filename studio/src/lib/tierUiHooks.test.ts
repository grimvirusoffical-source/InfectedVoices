import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  entitlementFixtures,
  markTrialStarted,
  readCachedEntitlements,
  buildEntitlements,
} from './entitlements.ts'
import { TIER_TEST_IDS, expectedTierUi, lockMountFlags } from './tierUiHooks.ts'

test('P0 hooks: Free shows both locks, both trial CTAs, 16-bit export', () => {
  const ui = expectedTierUi(entitlementFixtures().free)
  assert.equal(ui.showFeatureLockAdvanced, true)
  assert.equal(ui.showFeatureLockSmartMix, true)
  assert.equal(ui.showTrialCtaBasic, true)
  assert.equal(ui.showTrialCtaPro, true)
  assert.equal(ui.exportLockedAt16, true)
  assert.match(ui.exportBitDepthText, /16-bit/)
  assert.equal(ui.testIds.featureLockAdvanced, TIER_TEST_IDS.featureLockAdvanced)
  assert.equal(ui.testIds.featureLockSmartMix, TIER_TEST_IDS.featureLockSmartMix)
  assert.equal(ui.testIds.trialCtaBasic, TIER_TEST_IDS.trialCtaBasic)
  assert.equal(ui.testIds.trialCtaPro, TIER_TEST_IDS.trialCtaPro)
  assert.equal(ui.testIds.exportBitDepth, TIER_TEST_IDS.exportBitDepth)
  assert.equal(ui.testIds.passwordHint, TIER_TEST_IDS.passwordHint)
  assert.equal(ui.testIds.subscribePanel, TIER_TEST_IDS.subscribePanel)
})

test('P0 hooks: Basic hides advanced lock, keeps Smart Mix lock, 24-bit', () => {
  const ui = expectedTierUi(entitlementFixtures().basic)
  assert.equal(ui.showFeatureLockAdvanced, false)
  assert.equal(ui.showFeatureLockSmartMix, true)
  assert.equal(ui.testIds.featureLockAdvanced, null)
  assert.equal(ui.testIds.featureLockSmartMix, TIER_TEST_IDS.featureLockSmartMix)
  assert.equal(ui.exportLockedAt16, false)
  assert.match(ui.exportBitDepthText, /24-bit/)
})

test('P0 hooks: Pro hides both locks and unlocks 24-bit', () => {
  const ui = expectedTierUi(entitlementFixtures().pro)
  assert.equal(ui.showFeatureLockAdvanced, false)
  assert.equal(ui.showFeatureLockSmartMix, false)
  assert.equal(ui.testIds.featureLockAdvanced, null)
  assert.equal(ui.testIds.featureLockSmartMix, null)
  assert.equal(ui.exportLockedAt16, false)
})

test('P0 hooks: trialEligible flip hides Basic CTA after card-auth trial start', () => {
  const before = buildEntitlements({})
  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const after = markTrialStarted(before, 'basic', endsAt, { cardAuthorized: true })
  const ui = expectedTierUi(after)
  assert.equal(ui.showTrialCtaBasic, false)
  assert.equal(ui.showTrialCtaPro, true)
  assert.equal(ui.showFeatureLockAdvanced, false)
  assert.equal(ui.testIds.trialCtaBasic, null)
})

test('P0 hooks: card-upfront without auth does not unlock; Basic CTA gone', () => {
  const before = buildEntitlements({})
  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const after = markTrialStarted(before, 'pro', endsAt, { cardAuthorized: false })
  const ui = expectedTierUi(after)
  assert.equal(ui.showFeatureLockAdvanced, true)
  assert.equal(ui.showFeatureLockSmartMix, true)
  assert.equal(ui.showTrialCtaPro, false)
  assert.equal(ui.exportLockedAt16, true)
})

test('P0 hooks: past_due fail-closed matches Free lock UI', () => {
  const ui = expectedTierUi(entitlementFixtures().pastDue)
  assert.equal(ui.showFeatureLockAdvanced, true)
  assert.equal(ui.showFeatureLockSmartMix, true)
  assert.equal(ui.exportLockedAt16, true)
  const flags = lockMountFlags(entitlementFixtures().pastDue)
  assert.equal(flags.advanced, true)
  assert.equal(flags.smartMix, true)
})

test('P0 hooks: offline TTL expiry fail-closes UI to Free locks', () => {
  const live = entitlementFixtures().pro
  const stale = readCachedEntitlements(
    { entitlements: live, fetchedAt: Date.now() - 20 * 60 * 1000 },
    Date.now(),
    15 * 60 * 1000,
  )
  const ui = expectedTierUi(stale)
  assert.equal(ui.showFeatureLockAdvanced, true)
  assert.equal(ui.showFeatureLockSmartMix, true)
  assert.equal(ui.exportLockedAt16, true)
})

test('P0 hooks: Jordan testid constants stay stable', () => {
  assert.equal(TIER_TEST_IDS.featureLock, 'feature-lock')
  assert.equal(TIER_TEST_IDS.featureLockAdvanced, 'feature-lock-advanced')
  assert.equal(TIER_TEST_IDS.featureLockSmartMix, 'feature-lock-smart-mix')
  assert.equal(TIER_TEST_IDS.trialCtaBasic, 'trial-cta-basic')
  assert.equal(TIER_TEST_IDS.trialCtaPro, 'trial-cta-pro')
  assert.equal(TIER_TEST_IDS.exportBitDepth, 'export-bit-depth')
  assert.equal(TIER_TEST_IDS.passwordHint, 'password-hint')
  assert.equal(TIER_TEST_IDS.upgradeCta, 'upgrade-cta')
  assert.equal(TIER_TEST_IDS.subscribePanel, 'subscribe-panel')
})
