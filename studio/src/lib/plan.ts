/** Mirrors mobile-src/entitlements.js. Signed-in is Free. A trial lasts until trialEndsAt. */

export const BASIC_PLUS = [
  'precision_tune', 'precision_pocket', 'grim_rack',
  'core5_automation', 'core5_master', 'wav24',
  'smart_mix_local', 'project_lab', 'portable_project',
] as const

export const PRO_ONLY = [
  'stems', 'ai_mix_master', 'ai_autotune', 'ai_pocket', 'vocal_isolation',
] as const

const BASIC_SET = new Set<string>(BASIC_PLUS)
const PRO_SET = new Set<string>(PRO_ONLY)

const ALIAS: Record<string, string> = {
  precision: 'precision_tune',
  precision_tune: 'precision_tune',
  precision_pocket: 'precision_pocket',
  grim: 'grim_rack',
  grim_rack: 'grim_rack',
  core5: 'core5_automation',
  core5_automation: 'core5_automation',
  core5_master: 'core5_master',
  '24-bit': 'wav24',
  wav24: 'wav24',
  'smart-mix': 'smart_mix_local',
  smart_mix_local: 'smart_mix_local',
  'project-lab': 'project_lab',
  project_lab: 'project_lab',
  portable_project: 'portable_project',
  stems: 'stems',
  'ai-mix': 'ai_mix_master',
  ai_mix_master: 'ai_mix_master',
  'ai-tune': 'ai_autotune',
  ai_autotune: 'ai_autotune',
  'ai-beat': 'ai_pocket',
  ai_pocket: 'ai_pocket',
  isolate: 'vocal_isolation',
  vocal_isolation: 'vocal_isolation',
}

const NATION_SOCIAL = new Set(['infectious', 'plague'])
const TRIAL_MS = 7 * 24 * 60 * 60 * 1000
const memory = new Map<string, string>()

export type StudioPlan = 'free' | 'basic' | 'pro'

type Signal = {
  plan?: string
  kind?: string
  studioPlan?: string
  nationPlan?: string
  socialPlan?: string
  account?: string
  trialPlan?: string
  trialEnd?: string | number
  trialEndsAt?: string | number
  basicTrialUsedAt?: string | number
  proTrialUsedAt?: string | number
}

type TrialRecord = {
  basicTrialUsedAt: number
  proTrialUsedAt: number
  basicEndsAt: number
  proEndsAt: number
}

export function entitlementKey(id: string) {
  return ALIAS[id] || id
}

export function can(plan: string, entitlement: string) {
  const key = entitlementKey(entitlement)
  if (plan === 'pro') return true
  if (plan === 'basic') return !PRO_SET.has(key)
  return !BASIC_SET.has(key) && !PRO_SET.has(key)
}

export function planFromAccess(access: Signal = {}): StudioPlan {
  const social = String(access.nationPlan || access.socialPlan || access.kind || '').toLowerCase()
  const studio = String(access.studioPlan || '').toLowerCase()
  if (studio === 'free' || studio === 'basic' || studio === 'pro') return studio
  const named = String(access.plan || '').toLowerCase()
  if (NATION_SOCIAL.has(named) || NATION_SOCIAL.has(social)) return 'free'
  if (named === 'basic' || named === 'pro' || named === 'free') return named
  return 'free'
}

function storageGet(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return memory.has(key) ? memory.get(key)! : null
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    memory.set(key, value)
  }
}

function stamp(value: unknown) {
  if (value == null || value === '' || value === false) return 0
  const parsed = typeof value === 'number' ? value : Date.parse(String(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function emptyTrial(): TrialRecord {
  return { basicTrialUsedAt: 0, proTrialUsedAt: 0, basicEndsAt: 0, proEndsAt: 0 }
}

function usedStamp(raw: TrialRecord & { basicUsed?: boolean; proUsed?: boolean }, atKey: 'basicTrialUsedAt' | 'proTrialUsedAt', legacy: 'basicUsed' | 'proUsed') {
  const at = stamp(raw?.[atKey])
  if (at) return at
  return raw?.[legacy] === true ? 1 : 0
}

function trialAccount() {
  return storageGet('iv-active-account') || 'device'
}

function readTrial(account = trialAccount()): TrialRecord {
  try {
    const raw = JSON.parse(storageGet('iv-studio-trial:' + account) || 'null') as TrialRecord | null
    if (!raw || typeof raw !== 'object') return emptyTrial()
    return {
      basicTrialUsedAt: usedStamp(raw, 'basicTrialUsedAt', 'basicUsed'),
      proTrialUsedAt: usedStamp(raw, 'proTrialUsedAt', 'proUsed'),
      basicEndsAt: stamp(raw.basicEndsAt),
      proEndsAt: stamp(raw.proEndsAt),
    }
  } catch {
    return emptyTrial()
  }
}

function rank(plan: string) {
  if (plan === 'pro') return 2
  if (plan === 'basic') return 1
  return 0
}

function higher(a: string, b: string): StudioPlan {
  const winner = rank(a) >= rank(b) ? a : b
  return winner === 'basic' || winner === 'pro' ? winner : 'free'
}

/** Paid studioPlan is the floor. An active trialEnd can sit above it until that stamp. */
export function resolveTier(signal: Signal = {}, now = Date.now()): StudioPlan {
  const local = readTrial(signal.account || trialAccount())
  const serverPlan = signal.trialPlan === 'basic' || signal.trialPlan === 'pro' ? signal.trialPlan : ''
  const serverEnds = stamp(signal.trialEnd || signal.trialEndsAt)
  const basicEndsAt = Math.max(local.basicEndsAt, serverPlan === 'basic' ? serverEnds : 0)
  const proEndsAt = Math.max(local.proEndsAt, serverPlan === 'pro' ? serverEnds : 0)
  const trialPlan = proEndsAt > now ? 'pro' : basicEndsAt > now ? 'basic' : ''
  const paid = planFromAccess(signal)
  const floor = paid === 'basic' || paid === 'pro' ? paid : ''
  return higher(floor, trialPlan)
}

export function canUse(featureId: string, signal: Signal = {}) {
  return can(resolveTier(signal), featureId)
}

export function readClientSignal(): Signal {
  return { account: trialAccount() }
}

export function sessionTier() {
  return resolveTier(readClientSignal())
}

export function sessionCan(featureId: string) {
  return can(sessionTier(), featureId)
}

export function startTrial(
  kind: 'basic' | 'pro',
  account = trialAccount(),
  now = Date.now(),
  options: { introEligible?: boolean | null; tier?: string } = {},
) {
  if (options.introEligible === false) return { ok: false as const, reason: 'ineligible' as const, status: 403 }
  if (kind === 'basic' && options.tier === 'pro') return { ok: false as const, reason: 'higher' as const, status: 409 }
  const record = readTrial(account)
  if (kind === 'basic' && record.basicTrialUsedAt) return { ok: false as const, reason: 'used' as const, status: 409 }
  if (kind === 'pro' && record.proTrialUsedAt) return { ok: false as const, reason: 'used' as const, status: 409 }
  const ends = now + TRIAL_MS
  const next = {
    basicTrialUsedAt: kind === 'basic' ? now : record.basicTrialUsedAt,
    proTrialUsedAt: kind === 'pro' ? now : record.proTrialUsedAt,
    basicEndsAt: kind === 'basic' ? ends : record.basicEndsAt,
    proEndsAt: kind === 'pro' ? ends : record.proEndsAt,
  }
  const trialEnd = Math.max(next.basicEndsAt || 0, next.proEndsAt || 0) || null
  storageSet('iv-studio-trial:' + account, JSON.stringify({
    plan: next.proEndsAt >= next.basicEndsAt && next.proEndsAt ? 'pro' : next.basicEndsAt ? 'basic' : 'free',
    trialEnd,
    trialEndsAt: trialEnd,
    basicTrialUsedAt: next.basicTrialUsedAt || null,
    proTrialUsedAt: next.proTrialUsedAt || null,
    basicEndsAt: next.basicEndsAt,
    proEndsAt: next.proEndsAt,
  }))
  return { ok: true as const, ends, status: 200 }
}
