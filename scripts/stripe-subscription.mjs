/** Stripe subscription webhook → studio plan. Unpaid trial end falls back to free, or to a lower paid subscription that is still active. */

function stampSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed > 1e12 ? parsed : parsed * 1000;
}

function rank(plan) {
  if (plan === 'pro') return 2;
  if (plan === 'basic') return 1;
  return 0;
}

function higher(a, b) {
  return rank(a) >= rank(b) ? a || 'free' : b || 'free';
}

function planFromStripe(object) {
  const named = String(object?.metadata?.plan || object?.metadata?.studioPlan || '').toLowerCase();
  if (named === 'basic' || named === 'pro' || named === 'free') return named;
  const price = object?.items?.data?.[0]?.price || {};
  const fromPrice = String(price.metadata?.plan || price.nickname || '').toLowerCase();
  if (fromPrice.includes('pro')) return 'pro';
  if (fromPrice.includes('basic')) return 'basic';
  return '';
}

export function emptyBilling() {
  return {subs: {}, plan: 'free', trialEnd: null, basicTrialUsedAt: null, proTrialUsedAt: null};
}

/** Apply one customer.subscription.* event. trial_end is authoritative. */
export function applyStripeSubscription(state, event, now = Date.now()) {
  const current = state && typeof state === 'object' ? state : emptyBilling();
  const subs = {...(current.subs || {})};
  let basicTrialUsedAt = stampSeconds(current.basicTrialUsedAt) || null;
  let proTrialUsedAt = stampSeconds(current.proTrialUsedAt) || null;
  const object = event?.data?.object || {};
  const id = String(object.id || '');
  const status = String(object.status || '');
  const plan = planFromStripe(object);
  const trialEnd = stampSeconds(object.trial_end);
  const type = String(event?.type || '');
  if (id) {
    const trialing = status === 'trialing' && trialEnd > now && type !== 'customer.subscription.deleted';
    const paid = status === 'active' && type !== 'customer.subscription.deleted';
    if (trialing && (plan === 'basic' || plan === 'pro')) {
      subs[id] = {plan, status: 'trialing', trialEnd};
      if (plan === 'basic' && !basicTrialUsedAt) basicTrialUsedAt = now;
      if (plan === 'pro' && !proTrialUsedAt) proTrialUsedAt = now;
    } else if (paid && (plan === 'basic' || plan === 'pro')) {
      subs[id] = {plan, status: 'active', trialEnd: 0};
    } else {
      delete subs[id];
    }
  }
  let paidPlan = '';
  let trialPlan = '';
  let activeTrialEnd = 0;
  for (const sub of Object.values(subs)) {
    if (sub.status === 'active') paidPlan = higher(paidPlan, sub.plan);
    if (sub.status === 'trialing' && sub.trialEnd > now && rank(sub.plan) >= rank(trialPlan)) {
      trialPlan = sub.plan;
      activeTrialEnd = sub.trialEnd;
    }
  }
  const tier = higher(paidPlan, trialPlan);
  return {
    subs,
    plan: tier === 'basic' || tier === 'pro' ? tier : 'free',
    trialEnd: activeTrialEnd || null,
    basicTrialUsedAt,
    proTrialUsedAt
  };
}
