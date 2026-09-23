/** Mirrors mobile-src/entitlements.js for the Vocal Lab bundle. Signed-in is not Basic. */

export const TRIAL_MS = 7 * 24 * 60 * 60 * 1000
const STORE_PRODUCT_ID = 'infectedvoices.studio.monthly'
const BASIC_IDS = new Set(['grim', 'precision', 'core5', '24-bit', 'smart-mix', 'project-lab'])
const PRO_IDS = new Set(['stems', 'ai-mix', 'ai-tune', 'ai-beat', 'isolate'])

function stamp(value: unknown) {
  if (value == null || value === '' || value === false) return 0
  const parsed = typeof value === 'number' ? value : Date.parse(String(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function trialActive(usedAt: unknown, now: number) {
  const start = stamp(usedAt)
  return start > 0 && now >= start && now - start < TRIAL_MS
}

type Signal = {
  plan?: string
  kind?: string
  tier?: string
  badge?: string
  pro?: boolean
  basic?: boolean
  verified?: boolean
  productId?: string
  basicTrialUsedAt?: unknown
  proTrialUsedAt?: unknown
  capabilities?: { stemSeparation?: boolean; aiAssist?: boolean }
}

export function resolveTier(signal: Signal = {}, now = Date.now()) {
  const blob = [signal.plan, signal.kind, signal.badge].filter(Boolean).join(' ').toLowerCase()
  const pro = signal.pro === true || signal.verified === true || signal.productId === STORE_PRODUCT_ID
    || signal.capabilities?.stemSeparation === true || /\bpro\b|\bhighest\b/.test(blob)
  if (pro || trialActive(signal.proTrialUsedAt, now)) return 'pro'
  if (signal.basic === true || /\bbasic\b/.test(blob) || trialActive(signal.basicTrialUsedAt, now)) return 'basic'
  const explicit = String(signal.tier || '').toLowerCase()
  if (explicit === 'pro' || explicit === 'basic' || explicit === 'free') return explicit
  return 'free'
}

export function canUse(featureId: string, signal: Signal = {}) {
  const tier = signal.tier || resolveTier(signal)
  if (tier === 'pro') return true
  const caps = signal.capabilities || {}
  if (featureId === 'isolate' && caps.stemSeparation) return true
  if ((featureId === 'ai-mix' || featureId === 'ai-tune' || featureId === 'ai-beat') && caps.aiAssist) return true
  if (PRO_IDS.has(featureId)) return false
  if (BASIC_IDS.has(featureId)) return tier === 'basic'
  return tier === 'free' || tier === 'basic'
}

export function readClientSignal(): Signal {
  let plus: Signal | null = null
  try {
    plus = JSON.parse(localStorage.getItem('iv-studio-plus') || 'null')
  } catch {
    plus = null
  }
  const account = localStorage.getItem('iv-active-account') || 'device'
  let trials: Signal = {}
  try {
    trials = JSON.parse(localStorage.getItem('iv-create-trials:' + account) || '{}') || {}
  } catch {
    trials = {}
  }
  return {
    plan: plus?.plan,
    pro: plus?.plan === 'pro',
    verified: plus?.verified === true,
    productId: plus?.productId,
    basicTrialUsedAt: trials.basicTrialUsedAt,
    proTrialUsedAt: trials.proTrialUsedAt,
  }
}

export function sessionTier() {
  return resolveTier(readClientSignal())
}

export function sessionCan(featureId: string) {
  return canUse(featureId, readClientSignal())
}
