/** Lock icon + upgrade CTA for gated features. */

type Props = {
  id: string
  title?: string
  message?: string
  onUpgrade?: () => void
}

export function FeatureLock({
  id,
  title = 'Upgrade to unlock',
  message = 'This feature is locked on Free. Basic unlocks the advanced editor; Pro unlocks Smart Mix.',
  onUpgrade,
}: Props) {
  return (
    <div className="feature-lock" data-testid="feature-lock">
      <div className="feature-lock-inner" data-testid={`feature-lock-${id}`}>
        <span className="feature-lock-icon" aria-hidden="true">
          🔒
        </span>
        <div>
          <strong>{title}</strong>
          <p className="muted" style={{ margin: '6px 0 10px' }}>
            {message}
          </p>
          <button type="button" className="primary" data-testid="upgrade-cta" onClick={onUpgrade}>
            Upgrade
          </button>
        </div>
      </div>
    </div>
  )
}
