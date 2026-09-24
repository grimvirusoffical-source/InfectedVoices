import type { Entitlements } from '../lib/entitlements'
import { trialCtaVisibility } from '../lib/gates'

type Props = {
  entitlements: Entitlements
  onStartBasic?: () => void
  onStartPro?: () => void
}

/** 7-day trial CTAs — only when trialEligible from entitlements. */
export function TrialCtas({ entitlements, onStartBasic, onStartPro }: Props) {
  const { showBasic, showPro } = trialCtaVisibility(entitlements)
  if (!showBasic && !showPro) return null
  return (
    <div className="cta-row trial-ctas">
      {showBasic && (
        <button type="button" data-testid="trial-cta-basic" onClick={onStartBasic}>
          7-day Basic trial
        </button>
      )}
      {showPro && (
        <button type="button" className="primary" data-testid="trial-cta-pro" onClick={onStartPro}>
          7-day Pro trial
        </button>
      )}
    </div>
  )
}
