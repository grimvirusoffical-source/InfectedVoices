/**
 * Morgan P0 UI hooks — maps Entitlements → Jordan's data-testid contract.
 * Pure (no DOM). E2E/integration can assert the same keys after render.
 */

import type { Entitlements } from './entitlements.ts'
import {
  canUseAdvancedEditor,
  canUseSmartMix,
  exportBitDepthLabel,
  isFeatureLocked,
  trialCtaVisibility,
} from './gates.ts'

/** Stable selectors Jordan landed on Core PR #4. */
export const TIER_TEST_IDS = {
  featureLock: 'feature-lock',
  featureLockAdvanced: 'feature-lock-advanced',
  featureLockSmartMix: 'feature-lock-smart-mix',
  trialCtaBasic: 'trial-cta-basic',
  trialCtaPro: 'trial-cta-pro',
  exportBitDepth: 'export-bit-depth',
  passwordHint: 'password-hint',
  upgradeCta: 'upgrade-cta',
  subscribePanel: 'subscribe-panel',
} as const

export type TierUiSnapshot = {
  /** FeatureLock for advanced editor should mount when locked. */
  showFeatureLockAdvanced: boolean
  /** FeatureLock for Smart Mix should mount when locked. */
  showFeatureLockSmartMix: boolean
  showTrialCtaBasic: boolean
  showTrialCtaPro: boolean
  exportBitDepthText: string
  exportLockedAt16: boolean
  /** Always-on signup helper. */
  showPasswordHint: boolean
  /** Subscribe / paywall surface always available for upgrade paths. */
  showSubscribePanel: boolean
  /** data-testid values expected when the corresponding UI is shown. */
  testIds: {
    featureLockAdvanced: typeof TIER_TEST_IDS.featureLockAdvanced | null
    featureLockSmartMix: typeof TIER_TEST_IDS.featureLockSmartMix | null
    trialCtaBasic: typeof TIER_TEST_IDS.trialCtaBasic | null
    trialCtaPro: typeof TIER_TEST_IDS.trialCtaPro | null
    exportBitDepth: typeof TIER_TEST_IDS.exportBitDepth
    passwordHint: typeof TIER_TEST_IDS.passwordHint
    subscribePanel: typeof TIER_TEST_IDS.subscribePanel
  }
}

/** Expected lock / CTA / export UI for a given entitlements snapshot. */
export function expectedTierUi(entitlements: Entitlements): TierUiSnapshot {
  const advancedLocked = isFeatureLocked('advanced', entitlements)
  const smartMixLocked = isFeatureLocked('smart-mix', entitlements)
  const trials = trialCtaVisibility(entitlements)
  const exportLockedAt16 = entitlements.export.maxBitDepth < 24

  return {
    showFeatureLockAdvanced: advancedLocked,
    showFeatureLockSmartMix: smartMixLocked,
    showTrialCtaBasic: trials.showBasic,
    showTrialCtaPro: trials.showPro,
    exportBitDepthText: exportBitDepthLabel(entitlements),
    exportLockedAt16,
    showPasswordHint: true,
    showSubscribePanel: true,
    testIds: {
      featureLockAdvanced: advancedLocked ? TIER_TEST_IDS.featureLockAdvanced : null,
      featureLockSmartMix: smartMixLocked ? TIER_TEST_IDS.featureLockSmartMix : null,
      trialCtaBasic: trials.showBasic ? TIER_TEST_IDS.trialCtaBasic : null,
      trialCtaPro: trials.showPro ? TIER_TEST_IDS.trialCtaPro : null,
      exportBitDepth: TIER_TEST_IDS.exportBitDepth,
      passwordHint: TIER_TEST_IDS.passwordHint,
      subscribePanel: TIER_TEST_IDS.subscribePanel,
    },
  }
}

/** Convenience: gate flags used by FeatureLock mount sites. */
export function lockMountFlags(entitlements: Entitlements) {
  return {
    advanced: !canUseAdvancedEditor(entitlements),
    smartMix: !canUseSmartMix(entitlements),
  }
}
