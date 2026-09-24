/** Server-side Entitlements shape (mirrors studio/src/lib/entitlements.ts). */

const BASIC_FEATURES = new Set([
  'precision_tune',
  'precision_pocket',
  'grim_rack',
  'core5_automation',
  'core5_master',
  'wav24',
  'smart_mix_local',
  'project_lab',
  'portable_project',
]);

const PRO_FEATURES = new Set([
  'stems',
  'ai_mix_master',
  'ai_autotune',
  'ai_pocket',
  'vocal_isolation',
]);

function stamp(value) {
  if (value == null || value === '' || value === false) return 0;
  const parsed = typeof value === 'number' ? value : Date.parse(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function used(value) {
  return stamp(value) > 0;
}

function can(tier, feature) {
  if (tier === 'pro') return true;
  if (tier === 'basic') return !PRO_FEATURES.has(feature);
  return !BASIC_FEATURES.has(feature) && !PRO_FEATURES.has(feature);
}

function billingStatusFromRecord(record, now = Date.now()) {
  if (record?.billingStatus === 'past_due' || record?.billingStatus === 'canceled') {
    return record.billingStatus;
  }
  const trialEnd = stamp(record?.trialEnd);
  if (trialEnd > now && (record?.plan === 'basic' || record?.plan === 'pro')) return 'trialing';
  if (record?.plan === 'basic' || record?.plan === 'pro') return 'active';
  return 'none';
}

export function freeEntitlements(overrides = {}) {
  return {
    tier: 'free',
    trialEligible: overrides.trialEligible || { basic: true, pro: true },
    trialActive: null,
    export: { maxBitDepth: 16, sampleRateHz: 44100 },
    features: { advancedEditor: false, smartMix: false },
    billing: overrides.billing || { status: 'none' },
  };
}

/** Map studio_billing row → Entitlements. past_due/canceled fail-closed to Free. */
export function entitlementsFromBilling(record = {}, now = Date.now()) {
  const status = billingStatusFromRecord(record, now);
  const trialEligible = {
    basic: !used(record.basicTrialUsedAt),
    pro: !used(record.proTrialUsedAt),
  };

  if (status === 'past_due' || status === 'canceled') {
    return freeEntitlements({
      trialEligible,
      billing: { status, stripeCustomerId: record.stripeCustomerId || undefined },
    });
  }

  const tier = record.plan === 'basic' || record.plan === 'pro' ? record.plan : 'free';
  const trialEnd = stamp(record.trialEnd);
  const trialActive =
    status === 'trialing' && (tier === 'basic' || tier === 'pro') && trialEnd > now
      ? { tier, endsAt: new Date(trialEnd).toISOString() }
      : null;
  const paid = tier === 'basic' || tier === 'pro';

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
      status,
      stripeCustomerId: record.stripeCustomerId || undefined,
    },
  };
}

/** Card-upfront trial stub: requires cardAuthorized; flips trialEligible immediately. */
export function startTrialOnBilling(record = {}, tier, opts = {}, now = Date.now()) {
  const plan = tier === 'pro' ? 'pro' : 'basic';
  const usedKey = plan === 'pro' ? 'proTrialUsedAt' : 'basicTrialUsedAt';
  if (opts.cardAuthorized === false) {
    return {
      ok: false,
      status: 402,
      reason: 'card_required',
      record: {
        ...record,
        [usedKey]: stamp(record[usedKey]) || now,
      },
    };
  }
  if (stamp(record[usedKey])) {
    return { ok: false, status: 409, reason: 'used', record };
  }
  const trialDays = Math.max(1, Number(opts.trialDays || process.env.IV_STRIPE_TRIAL_DAYS || 7));
  const trialEnd = now + trialDays * 24 * 60 * 60 * 1000;
  const next = {
    ...record,
    plan,
    trialEnd,
    [usedKey]: now,
    billingStatus: 'trialing',
  };
  return { ok: true, status: 200, record: next };
}
