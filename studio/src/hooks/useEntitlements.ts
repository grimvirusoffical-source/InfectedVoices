import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildEntitlements,
  readCachedEntitlements,
  type CachedEntitlements,
  type EntitlementSignal,
  type Entitlements,
} from '../lib/entitlements'

/** Tiny entitlements hook: build from signal; focus path uses offline TTL fail-closed. */
export function useEntitlements(signal: EntitlementSignal = {}) {
  const signalKey = useMemo(
    () =>
      JSON.stringify({
        studioPlan: signal.studioPlan,
        plan: signal.plan,
        billingStatus: signal.billingStatus,
        trialPlan: signal.trialPlan,
        trialEndsAt: signal.trialEndsAt ?? signal.trialEnd,
        basicTrialUsedAt: signal.basicTrialUsedAt,
        proTrialUsedAt: signal.proTrialUsedAt,
      }),
    [
      signal.studioPlan,
      signal.plan,
      signal.billingStatus,
      signal.trialPlan,
      signal.trialEndsAt,
      signal.trialEnd,
      signal.basicTrialUsedAt,
      signal.proTrialUsedAt,
    ],
  )

  const [cache, setCache] = useState<CachedEntitlements>(() => ({
    entitlements: buildEntitlements(signal),
    fetchedAt: Date.now(),
  }))

  const refresh = useCallback((nextSignal: EntitlementSignal = signal) => {
    const entitlements = buildEntitlements(nextSignal)
    const next = { entitlements, fetchedAt: Date.now() }
    setCache(next)
    return entitlements
  }, [signal])

  useEffect(() => {
    refresh(signal)
    // signalKey captures relevant signal fields
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalKey])

  useEffect(() => {
    const onFocus = () => {
      setCache((prev) => {
        const entitlements = readCachedEntitlements(prev)
        return { entitlements, fetchedAt: prev.fetchedAt }
      })
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  return {
    entitlements: cache.entitlements as Entitlements,
    refresh,
    cache,
  }
}