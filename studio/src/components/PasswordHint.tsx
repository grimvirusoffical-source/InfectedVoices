/** Always-visible signup password helper. */
export function PasswordHint() {
  return (
    <p className="muted password-hint" data-testid="password-hint">
      At least 12 characters
    </p>
  )
}
