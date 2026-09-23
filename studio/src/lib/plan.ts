/** Mirrors mobile-src/entitlements.js. Signed-in is Free. Nation social plans are not studio plans. */

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

export type StudioPlan = 'free' | 'basic' | 'pro'

type Signal = {
  plan?: string
  kind?: string
  studioPlan?: string
  nationPlan?: string
  socialPlan?: string
  demoPlan?: string
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

export function readDemoPlan(): StudioPlan | '' {
  try {
    const value = localStorage.getItem('iv-studio-demo-plan')
    if (value === 'basic' || value === 'pro' || value === 'free') return value
  } catch {
    /* storage unavailable */
  }
  return ''
}

/** Server studioPlan wins. The QA demo flip is the only client plan write. */
export function resolveTier(signal: Signal = {}): StudioPlan {
  const server = planFromAccess(signal)
  if (server === 'basic' || server === 'pro') return server
  if (signal.demoPlan === 'basic' || signal.demoPlan === 'pro') return signal.demoPlan
  const demo = readDemoPlan()
  if (demo === 'basic' || demo === 'pro') return demo
  return 'free'
}

export function canUse(featureId: string, signal: Signal = {}) {
  return can(resolveTier(signal), featureId)
}

export function readClientSignal(): Signal {
  const demo = readDemoPlan()
  return demo ? { demoPlan: demo } : {}
}

export function sessionTier() {
  return resolveTier(readClientSignal())
}

export function sessionCan(featureId: string) {
  return can(sessionTier(), featureId)
}
