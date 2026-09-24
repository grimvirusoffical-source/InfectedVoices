/** UI gate helpers — Entitlements is the only source of truth (no client-only unlock). */

import type { Entitlements } from './entitlements.ts'

export type GateFeature =
  | 'advanced'
  | 'advancedEditor'
  | 'advanced-editor'
  | 'smart-mix'
  | 'smartMix'
  | 'smart_mix'
  | 'export24'
  | 'wav24'

const ADVANCED_IDS = new Set(['advanced', 'advancedEditor', 'advanced-editor', 'precision_tune', 'grim', 'project-lab', 'project_lab'])
const SMART_MIX_IDS = new Set(['smart-mix', 'smartMix', 'smart_mix', 'ai_mix_master', 'ai-mix'])
const EXPORT24_IDS = new Set(['export24', 'wav24', '24-bit'])

/** Basic+ advanced editor (precision / GRIM / Project Lab). */
export function canUseAdvancedEditor(entitlements: Entitlements): boolean {
  return entitlements.features.advancedEditor === true
}

/** Pro Smart Mix (ai_mix_master). */
export function canUseSmartMix(entitlements: Entitlements): boolean {
  return entitlements.features.smartMix === true
}

/** Export bit-depth / sample-rate limits from entitlements. */
export function exportLimits(entitlements: Entitlements): Entitlements['export'] {
  return entitlements.export
}

/**
 * True when the named feature is locked for this entitlement snapshot.
 * Never consults localStorage / sessionTier — entitlements only.
 */
export function isFeatureLocked(feature: string, entitlements: Entitlements): boolean {
  const id = String(feature || '').trim()
  if (ADVANCED_IDS.has(id)) return !canUseAdvancedEditor(entitlements)
  if (SMART_MIX_IDS.has(id)) return !canUseSmartMix(entitlements)
  if (EXPORT24_IDS.has(id)) return entitlements.export.maxBitDepth < 24
  return true
}

/** Which 7-day trial CTAs to show (card-upfront; eligibility from entitlements). */
export function trialCtaVisibility(entitlements: Entitlements): {
  basic: boolean
  pro: boolean
  showBasic: boolean
  showPro: boolean
} {
  const basic = entitlements.trialEligible.basic === true
  const pro = entitlements.trialEligible.pro === true
  return { basic, pro, showBasic: basic, showPro: pro }
}

/** Human label for export bit-depth display. */
export function exportBitDepthLabel(entitlements: Entitlements): string {
  const { maxBitDepth, sampleRateHz } = entitlements.export
  if (maxBitDepth >= 24) {
    return `${maxBitDepth}-bit / ${Math.round(sampleRateHz / 1000)}kHz`
  }
  return `${maxBitDepth}-bit · locked`
}
