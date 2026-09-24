/** Session entitlements contract for Free / Basic / Pro (increment 1). */

import { can, planFromAccess, type StudioPlan } from './plan.ts'

export type Tier = 'free' | 'basic' | 'pro'
export type BillingStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled'

export type Entitlements = {
  tier: Tier
  trialEligible: { basic: boolean; pro: boolean }
  trialActive: null | { tier: 'basic' | 'pro'; endsAt: string }
  export: { maxBitDepth: 16 | 24; sampleRateHz: 44100 | 48000 }
  features: {
    advancedEditor: boolean
    smartMix: boolean
  }
  billing: {
    status: BillingStatus
    stripeCustomerId?: string
  }
}

export type EntitlementSignal = {
  studioPlan?: string
  plan?: string
  trialPlan?: string
  trialEnd?: string | number
  trialEndsAt?: string | number
  basicTrialUsedAt?: string | number
  proTrialUsedAt?: string | number
  billingStatus?: BillingStatus
  stripeCustomerId?: string
  account?: string
}

const OFFLINE_TTL_MS = 15 * 60 * 1000

function stamp(value: unknown): number {
  if (value == null || value === '' || value === false) return 0
  const parsed = typeof value === 'number' ? value : Date.parse(String(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function used(value: unknown): boolean {
  return stamp(value) > 0
}

function rank(plan: string): number {
  if (plan === 'pro') return 2
  if (plan === 'basic') return 1
  return 0
}

function higher(a: string, b: string): Tier {
  const winner = rank(a) >= rank(b) ? a : b
  return winner === 'basic' || winner === 'pro' ? winner : 'free'
}

/** Pure tier resolve from server/session signal (no localStorage). */
export function tierFromSignal(signal: EntitlementSignal = {}, now = Date.now()): Tier {
  const paid = planFromAccess(signal)
  const floor: Tier = paid === 'basic' || paid === 'pro' ? paid : 'free'
  const trialEnds = stamp(signal.trialEnd || signal.trialEndsAt)
  const trialPlan =
    signal.trialPlan === 'basic' || signal.trialPlan === 'pro' ? signal.trialPlan : ''
  const activeTrial = trialPlan && trialEnds > now ? trialPlan : ''
  return higher(floor, activeTrial)
}

export function freeEntitlements(
  overrides: {
    trialEligible?: Entitlements['trialEligible']
    billing?: Entitlements['billing']
  } = {},
): Entitlements {
  return {
    tier: 'free',
    trialEligible: overrides.trialEligible || { basic: true, pro: true },
    trialActive: null,
    export: { maxBitDepth: 16, sampleRateHz: 44100 },
    features: { advancedEditor: false, smartMix: false },
    billing: overrides.billing || { status: 'none' },
  }
}

/** Avery defaults: card-upfront trial; past_due/canceled fail-closed to Free. */
export function buildEntitlements(signal: EntitlementSignal = {}, now = Date.now()): Entitlements {
  const billingStatus = signal.billingStatus || 'none'
  const trialEligible = {
    basic: !used(signal.basicTrialUsedAt),
    pro: !used(signal.proTrialUsedAt),
  }

  if (billingStatus === 'past_due' || billingStatus === 'canceled') {
    return freeEntitlements({
      trialEligible,
      billing: { status: billingStatus, stripeCustomerId: signal.stripeCustomerId },
    })
  }

  const tier = tierFromSignal(signal, now)
  const trialEnds = stamp(signal.trialEnd || signal.trialEndsAt)
  const trialPlan =
    signal.trialPlan === 'basic' || signal.trialPlan === 'pro' ? signal.trialPlan : null
  const trialActive =
    billingStatus === 'trialing' && trialPlan && trialEnds > now
      ? { tier: trialPlan, endsAt: new Date(trialEnds).toISOString() }
      : null

  const paid = tier === 'basic' || tier === 'pro'
  return {
    tier,
    trialEligible,
    trialActive,
    export: {
      maxBitDepth: paid ? 24 : 16,
      sampleRateHz: paid ? 48000 : 44100,
    },
    features: {
      advancedEditor: can(tier, 'precision_tune'),
      smartMix: can(tier, 'ai_mix_master'),
    },
    billing: {
      status: billingStatus === 'none' && paid ? 'active' : billingStatus,
      stripeCustomerId: signal.stripeCustomerId,
    },
  }
}

/** P0 fixtures for Morgan / Jordan gate helpers. */
export function entitlementFixtures(now = Date.now()) {
  const week = 7 * 24 * 60 * 60 * 1000
  return {
    free: freeEntitlements(),
    basic: buildEntitlements({ studioPlan: 'basic', billingStatus: 'active' }, now),
    pro: buildEntitlements({ studioPlan: 'pro', billingStatus: 'active' }, now),
    trialBasic: buildEntitlements(
      {
        trialPlan: 'basic',
        trialEndsAt: now + week,
        basicTrialUsedAt: now,
        billingStatus: 'trialing',
      },
      now,
    ),
    trialPro: buildEntitlements(
      {
        trialPlan: 'pro',
        trialEndsAt: now + week,
        proTrialUsedAt: now,
        billingStatus: 'trialing',
      },
      now,
    ),
    pastDue: buildEntitlements(
      {
        studioPlan: 'pro',
        billingStatus: 'past_due',
        proTrialUsedAt: now - 1000,
      },
      now,
    ),
  }
}

export type CachedEntitlements = {
  entitlements: Entitlements
  fetchedAt: number
}

/** Offline short TTL: refetch on focus; fail-closed to Free when expired. */
export function readCachedEntitlements(
  cache: CachedEntitlements | null | undefined,
  now = Date.now(),
  ttlMs = OFFLINE_TTL_MS,
): Entitlements {
  if (!cache?.entitlements || now - cache.fetchedAt > ttlMs) {
    return freeEntitlements({ trialEligible: { basic: false, pro: false } })
  }
  return cache.entitlements
}

/** Card-upfront trial start: successful auth flips eligibility; card-fail does not burn trial. */
export function markTrialStarted(
  entitlements: Entitlements,
  tier: 'basic' | 'pro',
  endsAt: string,
  opts: { cardAuthorized?: boolean } = {},
): Entitlements {
  // Card-fail must not burn eligibility (match server 8e53305).
  if (opts.cardAuthorized === false) {
    return entitlements
  }
  return {
    ...entitlements,
    tier,
    trialEligible: { ...entitlements.trialEligible, [tier]: false },
    trialActive: { tier, endsAt },
    export: { maxBitDepth: 24, sampleRateHz: 48000 },
    features: {
      advancedEditor: true,
      smartMix: tier === 'pro',
    },
    billing: { ...entitlements.billing, status: 'trialing' },
  }
}

export type { StudioPlan }
