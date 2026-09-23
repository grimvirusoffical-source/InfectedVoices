/** Basic ($20) includes the studio tools below. These five actions are Pro ($40) only. */
export const PRO_FEATURES = [
  {id:'stems', name:'Export stems'},
  {id:'ai-mix', name:'AI Mix / Master'},
  {id:'ai-tune', name:'AI Auto-Tune'},
  {id:'ai-beat', name:'AI Beat-Lock'},
  {id:'isolate', name:'Vocal isolation'}
];

/** Free does not include these. Basic, Pro, and an active trial do. */
export const BASIC_FEATURES = [
  {id:'grim', name:'GRIM'},
  {id:'precision', name:'Precision Tune'},
  {id:'core5', name:'Core 5 Producer'},
  {id:'24-bit', name:'24-bit export'},
  {id:'smart-mix', name:'Smart Mix + Master'},
  {id:'project-lab', name:'Project Lab'}
];

export const STORE_PRODUCT_ID = 'infectedvoices.studio.monthly';
export const TRIAL_MS = 7 * 24 * 60 * 60 * 1000;

const PRO_IDS = new Set(PRO_FEATURES.map(feature => feature.id));
const BASIC_IDS = new Set(BASIC_FEATURES.map(feature => feature.id));

export function trialStamp(value) {
  if (value == null || value === '' || value === false) return 0;
  const stamp = typeof value === 'number' ? value : Date.parse(String(value));
  return Number.isFinite(stamp) && stamp > 0 ? stamp : 0;
}

export function trialActive(usedAt, now = Date.now()) {
  const start = trialStamp(usedAt);
  return start > 0 && now >= start && now - start < TRIAL_MS;
}

export function trialUsed(usedAt) {
  return trialStamp(usedAt) > 0;
}

function paidPro(signal) {
  const blob = [signal.plan, signal.kind, signal.badge].filter(Boolean).join(' ').toLowerCase();
  return signal.pro === true
    || signal.verified === true
    || signal.productId === STORE_PRODUCT_ID
    || signal.capabilities?.stemSeparation === true
    || /\bpro\b|\bhighest\b/.test(blob);
}

function paidBasic(signal) {
  const blob = [signal.plan, signal.kind, signal.badge].filter(Boolean).join(' ').toLowerCase();
  return signal.basic === true || /\bbasic\b/.test(blob);
}

/** Signed-in, allowed, lifetime, or member is not a plan. */
export function resolveTier(signal = {}, now = Date.now()) {
  if (paidPro(signal) || trialActive(signal.proTrialUsedAt, now)) return 'pro';
  if (paidBasic(signal) || trialActive(signal.basicTrialUsedAt, now)) return 'basic';
  const explicit = String(signal.tier || '').toLowerCase();
  if (explicit === 'pro' || explicit === 'basic' || explicit === 'free') return explicit;
  return 'free';
}

export function canUse(featureId, signal = {}) {
  const tier = signal.tier || resolveTier(signal);
  if (tier === 'pro') return true;
  const caps = signal.capabilities || {};
  if (featureId === 'isolate' && caps.stemSeparation) return true;
  if ((featureId === 'ai-mix' || featureId === 'ai-tune' || featureId === 'ai-beat') && caps.aiAssist) return true;
  if (PRO_IDS.has(featureId)) return false;
  if (BASIC_IDS.has(featureId)) return tier === 'basic';
  return tier === 'free' || tier === 'basic';
}

export function lockBody(name, featureId) {
  if (featureId && BASIC_IDS.has(featureId)) return name + ' is on the $20 Basic plan.';
  return name + ' is on the $40 Pro plan.';
}

export function featureById(id) {
  return PRO_FEATURES.find(feature => feature.id === id) || BASIC_FEATURES.find(feature => feature.id === id) || null;
}

export function claimTrial(kind, record = {}, now = Date.now()) {
  const key = kind === 'pro' ? 'proTrialUsedAt' : 'basicTrialUsedAt';
  if (trialUsed(record[key])) return {ok:false, reason:'used', record};
  const next = {...record, [key]: now};
  return {ok:true, record:next, tier:resolveTier(next, now)};
}

/** A verified Studio Plus store receipt is Pro. A failed or empty verify is not. */
export function tierFromStoreVerify(result) {
  if (!result || result.allowed !== true && result.verified !== true) return 'free';
  const product = String(result.productId || result.product || STORE_PRODUCT_ID);
  if (product && product !== STORE_PRODUCT_ID) return 'free';
  return 'pro';
}

export function rememberStudioPlus(result) {
  if (tierFromStoreVerify(result) !== 'pro') return null;
  const record = {plan:'pro', productId:STORE_PRODUCT_ID, verified:true, at:Date.now()};
  localStorage.setItem('iv-studio-plus', JSON.stringify(record));
  return record;
}

export function readStudioPlus() {
  try {
    const value = JSON.parse(localStorage.getItem('iv-studio-plus') || 'null');
    if (value?.verified === true && value.productId === STORE_PRODUCT_ID) return value;
  } catch { /* ignore unreadable storage */ }
  return null;
}

export function clientSignal(now = Date.now()) {
  const plus = readStudioPlus();
  const account = localStorage.getItem('iv-active-account') || 'device';
  let trials = {};
  try { trials = JSON.parse(localStorage.getItem('iv-create-trials:' + account) || '{}') || {}; }
  catch { trials = {}; }
  return {
    plan: plus?.plan,
    pro: plus?.plan === 'pro',
    verified: plus?.verified === true,
    productId: plus?.productId,
    basicTrialUsedAt: trials.basicTrialUsedAt,
    proTrialUsedAt: trials.proTrialUsedAt,
    now
  };
}

/** Entitlements never mark a charge complete before verify. */
export function storeBillingReady() {
  return false;
}

export function selfCheck() {
  const signedIn = resolveTier({allowed:true, kind:'lifetime'});
  const basic = resolveTier({plan:'basic'});
  const pro = resolveTier({plan:'pro'});
  const free = resolveTier({});
  if (signedIn !== 'free' || basic !== 'basic' || pro !== 'pro' || free !== 'free') throw Error('Tier resolution failed.');
  if (canUse('stems', {tier:'basic'}) || !canUse('stems', {tier:'pro'}) || canUse('isolate', {tier:'free'})) throw Error('Pro gate failed.');
  if (!canUse('ai-tune', {tier:'basic', capabilities:{aiAssist:true}})) throw Error('Existing AI capability should pass the AI gate.');
  if (canUse('stems', {tier:'basic', capabilities:{aiAssist:true}})) throw Error('AI assist must not unlock stem export.');
  for (const id of BASIC_FEATURES.map(feature => feature.id)) {
    if (canUse(id, {tier:'free'})) throw Error('Free unlocked ' + id);
    if (!canUse(id, {tier:'basic'}) || !canUse(id, {tier:'pro'})) throw Error('Paid tier missing ' + id);
  }
  const start = Date.parse('2026-09-01T00:00:00Z');
  if (resolveTier({basicTrialUsedAt:start}, start + 1000) !== 'basic') throw Error('Basic trial did not start.');
  if (resolveTier({basicTrialUsedAt:start}, start + TRIAL_MS) !== 'free') throw Error('Basic trial did not expire.');
  if (resolveTier({proTrialUsedAt:start}, start + 1000) !== 'pro') throw Error('Pro trial did not start.');
  const again = claimTrial('basic', {basicTrialUsedAt:start}, start + 1000);
  if (again.ok) throw Error('Basic trial can be claimed twice.');
  const first = claimTrial('pro', {}, start);
  if (!first.ok || first.record.proTrialUsedAt !== start) throw Error('Pro trial did not record proTrialUsedAt.');
  if (tierFromStoreVerify({allowed:true, verified:true, productId:STORE_PRODUCT_ID}) !== 'pro') throw Error('Studio Plus verify did not map to pro.');
  if (tierFromStoreVerify({allowed:true, productId:STORE_PRODUCT_ID}) !== 'pro') throw Error('Allowed Studio Plus receipt did not map to pro.');
  if (tierFromStoreVerify({verified:false}) !== 'free') throw Error('Unverified store result mapped to a paid tier.');
  if (tierFromStoreVerify({allowed:false}) !== 'free') throw Error('Denied store result mapped to a paid tier.');
  if (lockBody('Export stems') !== 'Export stems is on the $40 Pro plan.') throw Error('Lock sheet copy drifted.');
  if (lockBody('Project Lab', 'project-lab') !== 'Project Lab is on the $20 Basic plan.') throw Error('Basic lock copy drifted.');
  if (storeBillingReady()) throw Error('Entitlements must not mark store billing ready before a verified purchase.');
  return true;
}
