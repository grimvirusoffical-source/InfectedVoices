import { useState } from 'react'
import { markTrialStarted, type EntitlementSignal } from './lib/entitlements'
import { useEntitlements } from './hooks/useEntitlements'
import { ExportBitDepth, FeatureLock, PasswordHint, SubscribePanel } from './components'
import { canUseSmartMix, isFeatureLocked } from './lib/gates'
import './index.css'
import './styles/gates.css'

/** Increment-1 gating shell with Morgan testids. Full Studio App.tsx is in local working tree (Jordan). */
export default function App() {
  const [signal, setSignal] = useState<EntitlementSignal>({})
  const { entitlements, refresh } = useEntitlements(signal)
  const apply = (next: EntitlementSignal) => {
    setSignal(next)
    refresh(next)
  }
  const startTrial = (tier: 'basic' | 'pro') => {
    const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const next = markTrialStarted(entitlements, tier, endsAt, { cardAuthorized: true })
    apply({
      studioPlan: next.tier,
      trialPlan: tier,
      trialEndsAt: endsAt,
      billingStatus: 'trialing',
      basicTrialUsedAt: tier === 'basic' ? Date.now() : signal.basicTrialUsedAt,
      proTrialUsedAt: tier === 'pro' ? Date.now() : signal.proTrialUsedAt,
    })
  }
  const free = entitlements.tier === 'free'
  return (
    <div className="app">
      <main className="main">
        <section className="panel">
          <h2>Increment-1 gating</h2>
          <p className="panel-lead">
            Entitlements-driven UI gates (FeatureLock, trial CTAs, export bit-depth, password hint).
          </p>
          <label className="field">
            Signup password
            <input type="password" autoComplete="new-password" placeholder="Create a password" />
          </label>
          <PasswordHint />
          <ExportBitDepth entitlements={entitlements} />
          {isFeatureLocked('advanced', entitlements) && (
            <FeatureLock id="advanced" title="Advanced editor locked" onUpgrade={() => undefined} />
          )}
          {isFeatureLocked('smart-mix', entitlements) && (
            <FeatureLock id="smart-mix" title="Smart Mix locked" onUpgrade={() => undefined} />
          )}
          {!canUseSmartMix(entitlements) && free && <p className="muted">Smart Mix stays Pro.</p>}
        </section>
        <SubscribePanel
          entitlements={entitlements}
          onSelectPlan={(plan) => {
            if (plan === 'free') apply({})
            else apply({ studioPlan: plan, billingStatus: 'active' })
          }}
          onStartTrial={startTrial}
        />
      </main>
    </div>
  )
}
