import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildEntitlements,
  entitlementFixtures,
  markTrialStarted,
  readCachedEntitlements,
} from './entitlements.ts'

test('P0: Free locks advanced editor + smart mix and caps export at 16-bit', () => {
  const e = buildEntitlements({})
  assert.equal(e.tier, 'free')
  assert.equal(e.features.advancedEditor, false)
  assert.equal(e.features.smartMix, false)
  assert.equal(e.export.maxBitDepth, 16)
  assert.equal(e.trialEligible.basic, true)
  assert.equal(e.trialEligible.pro, true)
})

test('P0: Basic unlocks advanced editor and 24-bit; Smart Mix stays Pro', () => {
  const e = buildEntitlements({ studioPlan: 'basic', billingStatus: 'active' })
  assert.equal(e.tier, 'basic')
  assert.equal(e.features.advancedEditor, true)
  assert.equal(e.features.smartMix, false)
  assert.equal(e.export.maxBitDepth, 24)
  assert.equal(e.export.sampleRateHz, 48000)
})

test('P0: Pro unlocks Smart Mix and 24-bit', () => {
  const e = buildEntitlements({ studioPlan: 'pro', billingStatus: 'active' })
  assert.equal(e.tier, 'pro')
  assert.equal(e.features.smartMix, true)
  assert.equal(e.export.maxBitDepth, 24)
})

test('P0: once-per-account trialEligible flips false after start', () => {
  const before = buildEntitlements({})
  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const after = markTrialStarted(before, 'basic', endsAt, { cardAuthorized: true })
  assert.equal(after.trialEligible.basic, false)
  assert.equal(after.trialEligible.pro, true)
  assert.equal(after.tier, 'basic')
  assert.equal(after.billing.status, 'trialing')
  assert.ok(after.trialActive)
})

test('P0: card-upfront trial without auth does not unlock Basic/Pro', () => {
  const before = buildEntitlements({})
  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const after = markTrialStarted(before, 'pro', endsAt, { cardAuthorized: false })
  assert.equal(after.tier, 'free')
  assert.equal(after.trialEligible.pro, true)
  assert.equal(after.features.smartMix, false)
  assert.equal(after.billing.status, 'none')
})

test('P0: payment fail / past_due clears paid flags to Free', () => {
  const e = buildEntitlements({
    studioPlan: 'pro',
    billingStatus: 'past_due',
    proTrialUsedAt: Date.now(),
  })
  assert.equal(e.tier, 'free')
  assert.equal(e.features.advancedEditor, false)
  assert.equal(e.features.smartMix, false)
  assert.equal(e.export.maxBitDepth, 16)
  assert.equal(e.billing.status, 'past_due')
  assert.equal(e.trialEligible.pro, false)
})

test('P0: offline TTL expiry fail-closes to Free', () => {
  const live = buildEntitlements({ studioPlan: 'pro', billingStatus: 'active' })
  const fresh = readCachedEntitlements({ entitlements: live, fetchedAt: Date.now() })
  assert.equal(fresh.tier, 'pro')
  const stale = readCachedEntitlements(
    { entitlements: live, fetchedAt: Date.now() - 20 * 60 * 1000 },
    Date.now(),
    15 * 60 * 1000,
  )
  assert.equal(stale.tier, 'free')
  assert.equal(stale.features.smartMix, false)
})

test('fixtures cover Free / Basic / Pro / trial / past_due for Morgan P0', () => {
  const f = entitlementFixtures()
  assert.equal(f.free.tier, 'free')
  assert.equal(f.basic.tier, 'basic')
  assert.equal(f.pro.tier, 'pro')
  assert.equal(f.trialBasic.billing.status, 'trialing')
  assert.equal(f.trialPro.trialEligible.pro, false)
  assert.equal(f.pastDue.tier, 'free')
})
