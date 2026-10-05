// Web shell parity: exercises the same Core modules the web bundle is built from (pinned at 4d280e8).
// Nothing here re-implements Core; it asserts Casey's parity bar against Core's own exports.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { buildEntitlements, markTrialStarted, readCachedEntitlements } from '../../studio/src/lib/entitlements.ts'
import { exportBitDepthLabel, isFeatureLocked, trialCtaVisibility } from '../../studio/src/lib/gates.ts'
import { TIER_TEST_IDS, expectedTierUi } from '../../studio/src/lib/tierUiHooks.ts'

const pin = JSON.parse(readFileSync(new URL('./core-pin.json', import.meta.url), 'utf8'))
const week = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

test('web shell pins Core to the PR #8 merge commit', () => {
  assert.equal(pin.core, '4d280e871dc31916549ba317032300510403a8b2')
  assert.equal(pin.coreShort, pin.core.slice(0, 7))
  assert.equal(pin.shell, 'web')
})

test('Free / Basic $20 / Pro $40 locks match the browser studio', () => {
  const free = buildEntitlements({})
  const basic = buildEntitlements({ studioPlan: 'basic', billingStatus: 'active' })
  const pro = buildEntitlements({ studioPlan: 'pro', billingStatus: 'active' })
  assert.equal(isFeatureLocked('advanced', free), true)
  assert.equal(isFeatureLocked('smart-mix', free), true)
  assert.equal(isFeatureLocked('advanced', basic), false)
  assert.equal(isFeatureLocked('smart-mix', basic), true)
  assert.equal(isFeatureLocked('advanced', pro), false)
  assert.equal(isFeatureLocked('smart-mix', pro), false)
  const panel = readFileSync(new URL('../../studio/src/components/SubscribePanel.tsx', import.meta.url), 'utf8')
  assert.match(panel, /Basic \$20/)
  assert.match(panel, /Pro \$40/)
})

test('trial CTAs and export bit depth use the same testids and labels', () => {
  const free = buildEntitlements({})
  assert.deepEqual(trialCtaVisibility(free), { basic: true, pro: true, showBasic: true, showPro: true })
  assert.equal(exportBitDepthLabel(free), '16-bit · locked')
  const ui = expectedTierUi(free)
  assert.equal(ui.testIds.trialCtaBasic, 'trial-cta-basic')
  assert.equal(ui.testIds.trialCtaPro, 'trial-cta-pro')
  assert.equal(ui.testIds.exportBitDepth, 'export-bit-depth')
  assert.equal(TIER_TEST_IDS.featureLockAdvanced, 'feature-lock-advanced')
  assert.equal(TIER_TEST_IDS.featureLockSmartMix, 'feature-lock-smart-mix')
  assert.equal(TIER_TEST_IDS.upgradeCta, 'upgrade-cta')
  assert.equal(TIER_TEST_IDS.subscribePanel, 'subscribe-panel')
  const trial = markTrialStarted(free, 'basic', week(), { cardAuthorized: true })
  assert.equal(exportBitDepthLabel(trial), '24-bit / 48kHz')
  assert.equal(trialCtaVisibility(trial).showBasic, false)
})

test('offline entitlement expiry falls back to Free', () => {
  const pro = buildEntitlements({ studioPlan: 'pro', billingStatus: 'active' })
  assert.equal(readCachedEntitlements({ entitlements: pro, fetchedAt: Date.now() }).tier, 'pro')
  const stale = readCachedEntitlements({ entitlements: pro, fetchedAt: Date.now() - 16 * 60 * 1000 })
  assert.equal(stale.tier, 'free')
  assert.equal(stale.export.maxBitDepth, 16)
  assert.equal(isFeatureLocked('smart-mix', stale), true)
  assert.equal(readCachedEntitlements(null).tier, 'free')
})
