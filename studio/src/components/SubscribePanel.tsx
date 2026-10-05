import type { Entitlements } from '../lib/entitlements'
import { TrialCtas } from './TrialCtas'
import { PasswordHint } from './PasswordHint'
import { useState } from 'react'

type Props = {
  entitlements: Entitlements
  onSelectPlan?: (plan: 'free' | 'basic' | 'pro') => void
  onStartTrial?: (tier: 'basic' | 'pro') => void
}

/** Minimal subscribe / paywall surface: Free / Basic($20) / Pro($40) + trial CTAs. */
export function SubscribePanel({ entitlements, onSelectPlan, onStartTrial }: Props) {
  const [signupPassword, setSignupPassword] = useState('')
  return (
    <section className="panel subscribe-panel" data-testid="subscribe-panel">
      <h2>Studio plan</h2>
      <p className="panel-lead">
        Free is signed-in. Basic is $20/mo. Pro is $40/mo. Trials are card-upfront and once per account.
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          className={entitlements.tier === 'free' ? 'primary' : ''}
          data-testid="upgrade-cta"
          onClick={() => onSelectPlan?.('free')}
        >
          Free
        </button>
        <button
          type="button"
          className={entitlements.tier === 'basic' ? 'primary' : ''}
          data-testid="upgrade-cta"
          onClick={() => onSelectPlan?.('basic')}
        >
          Basic $20
        </button>
        <button
          type="button"
          className={entitlements.tier === 'pro' ? 'primary' : ''}
          data-testid="upgrade-cta"
          onClick={() => onSelectPlan?.('pro')}
        >
          Pro $40
        </button>
      </div>
      <TrialCtas
        entitlements={entitlements}
        onStartBasic={() => onStartTrial?.('basic')}
        onStartPro={() => onStartTrial?.('pro')}
      />
      <div className="settings-group" style={{ marginTop: 16 }}>
        <h3>Create account password</h3>
        <label className="field">
          Password
          <input
            type="password"
            autoComplete="new-password"
            value={signupPassword}
            placeholder="Create a password"
            onChange={(e) => setSignupPassword(e.target.value)}
          />
        </label>
        <PasswordHint />
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        Current tier: <strong style={{ color: 'var(--text-primary)' }}>{entitlements.tier}</strong>
        {entitlements.billing.status !== 'none' ? ` · ${entitlements.billing.status}` : ''}
      </p>
    </section>
  )
}
