/** Studio plans. InfectedNation free|infectious|plague is not a studio plan. */
export const BASIC_PLUS = [
  'precision_tune', 'precision_pocket', 'grim_rack',
  'core5_automation', 'core5_master', 'wav24',
  'smart_mix_local', 'project_lab', 'portable_project'
];

export const PRO_ONLY = [
  'stems', 'ai_mix_master', 'ai_autotune', 'ai_pocket', 'vocal_isolation'
];

export const BASIC_FEATURES = [
  {id:'precision_tune', name:'Precision Tune'},
  {id:'precision_pocket', name:'Precision Pocket'},
  {id:'grim_rack', name:'GRIM'},
  {id:'core5_automation', name:'Core 5 automation'},
  {id:'core5_master', name:'Core 5 master'},
  {id:'wav24', name:'24-bit WAV'},
  {id:'smart_mix_local', name:'Smart Mix + Master'},
  {id:'project_lab', name:'Project Lab'},
  {id:'portable_project', name:'Portable project'}
];

export const PRO_FEATURES = [
  {id:'stems', name:'Export stems'},
  {id:'ai_mix_master', name:'AI Mix / Master'},
  {id:'ai_autotune', name:'AI Auto-Tune'},
  {id:'ai_pocket', name:'AI Beat-Lock'},
  {id:'vocal_isolation', name:'Vocal isolation'}
];

export const IOS_BASIC_PRODUCT_ID = 'space.infectedvoices.studio.basic.monthly';
export const IOS_PRO_PRODUCT_ID = 'space.infectedvoices.studio.pro.monthly';
export const ANDROID_BASIC_PRODUCT_ID = 'iv_studio_basic';
export const ANDROID_PRO_PRODUCT_ID = 'iv_studio_pro';
export const STORE_PRODUCT_ID = IOS_PRO_PRODUCT_ID;

const ALIAS = {
  precision:'precision_tune',
  precision_tune:'precision_tune',
  precision_pocket:'precision_pocket',
  grim:'grim_rack',
  grim_rack:'grim_rack',
  core5:'core5_automation',
  core5_automation:'core5_automation',
  core5_master:'core5_master',
  '24-bit':'wav24',
  wav24:'wav24',
  'smart-mix':'smart_mix_local',
  smart_mix_local:'smart_mix_local',
  'project-lab':'project_lab',
  project_lab:'project_lab',
  portable_project:'portable_project',
  stems:'stems',
  'ai-mix':'ai_mix_master',
  ai_mix_master:'ai_mix_master',
  'ai-tune':'ai_autotune',
  ai_autotune:'ai_autotune',
  'ai-beat':'ai_pocket',
  ai_pocket:'ai_pocket',
  isolate:'vocal_isolation',
  vocal_isolation:'vocal_isolation'
};

const NATION_SOCIAL = new Set(['infectious', 'plague']);
const TRIAL_MS = 7 * 24 * 60 * 60 * 1000;
const memory = new Map();
let sessionPlan = '';

export const TRIAL_COPY = {
  basic: '7 days of Basic — then Free unless you subscribe.',
  pro: '7 days of Pro — then Free unless you subscribe.'
};
export const TRIAL_CTA = {
  basic: 'Start 7-day Basic trial',
  pro: 'Start 7-day Pro trial'
};

export function entitlementKey(id) {
  return ALIAS[id] || id;
}

/** pro unlocks everything. basic unlocks local pro tools. free keeps the local starter set. */
export function can(plan, entitlement) {
  const key = entitlementKey(entitlement);
  if (plan === 'pro') return true;
  if (plan === 'basic') return !PRO_ONLY.includes(key);
  return !BASIC_PLUS.includes(key) && !PRO_ONLY.includes(key);
}

export function planFromAccess(access = {}) {
  const social = String(access.nationPlan || access.socialPlan || access.kind || '').toLowerCase();
  const studio = String(access.studioPlan || '').toLowerCase();
  if (studio === 'free' || studio === 'basic' || studio === 'pro') return studio;
  const named = String(access.plan || '').toLowerCase();
  if (NATION_SOCIAL.has(named) || NATION_SOCIAL.has(social)) return 'free';
  if (named === 'basic' || named === 'pro' || named === 'free') return named;
  return 'free';
}

export function readDemoPlan() {
  try {
    const value = localStorage.getItem('iv-studio-demo-plan');
    if (value === 'basic' || value === 'pro' || value === 'free') return value;
  } catch { /* storage unavailable */ }
  return '';
}

function storageGet(key) {
  try { return localStorage.getItem(key); }
  catch { return memory.has(key) ? memory.get(key) : null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); }
  catch { memory.set(key, value); }
}
function stamp(value) {
  if (value == null || value === '' || value === false) return 0;
  const parsed = typeof value === 'number' ? value : Date.parse(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
function emptyTrial() {
  return {basicUsed:false, proUsed:false, basicEndsAt:0, proEndsAt:0};
}
export function trialAccount() {
  return storageGet('iv-active-account') || 'device';
}
function trialStorageKey(account) {
  return 'iv-studio-trial:' + (account || trialAccount());
}
export function readTrial(account = trialAccount()) {
  try {
    const raw = JSON.parse(storageGet(trialStorageKey(account)) || 'null');
    if (!raw || typeof raw !== 'object') return emptyTrial();
    return {
      basicUsed: raw.basicUsed === true,
      proUsed: raw.proUsed === true,
      basicEndsAt: stamp(raw.basicEndsAt),
      proEndsAt: stamp(raw.proEndsAt)
    };
  } catch { return emptyTrial(); }
}
function writeTrial(account, record) {
  storageSet(trialStorageKey(account), JSON.stringify({
    plan: record.proEndsAt >= record.basicEndsAt && record.proEndsAt ? 'pro' : record.basicEndsAt ? 'basic' : 'free',
    trialEndsAt: Math.max(record.basicEndsAt || 0, record.proEndsAt || 0) || null,
    basicUsed: record.basicUsed === true,
    proUsed: record.proUsed === true,
    basicEndsAt: record.basicEndsAt || 0,
    proEndsAt: record.proEndsAt || 0
  }));
}
function rank(plan) {
  if (plan === 'pro') return 2;
  if (plan === 'basic') return 1;
  return 0;
}
function higher(a, b) {
  return rank(a) >= rank(b) ? a || 'free' : b || 'free';
}
function paidPlan(signal) {
  const server = planFromAccess(signal);
  if (server === 'basic' || server === 'pro') return server;
  if (sessionPlan === 'basic' || sessionPlan === 'pro') return sessionPlan;
  return '';
}
/** Once per account. An active window unlocks that plan. Expiry does not delete the used flag. */
export function startTrial(kind, account = trialAccount(), now = Date.now()) {
  if (kind !== 'basic' && kind !== 'pro') return {ok:false, reason:'unknown'};
  const record = readTrial(account);
  if (kind === 'basic' && record.basicUsed) return {ok:false, reason:'used', record};
  if (kind === 'pro' && record.proUsed) return {ok:false, reason:'used', record};
  const ends = now + TRIAL_MS;
  const next = {
    basicUsed: kind === 'basic' ? true : record.basicUsed,
    proUsed: kind === 'pro' ? true : record.proUsed,
    basicEndsAt: kind === 'basic' ? ends : record.basicEndsAt,
    proEndsAt: kind === 'pro' ? ends : record.proEndsAt
  };
  writeTrial(account, next);
  return {ok:true, record:next, ends};
}
export function formatTrialEnd(ms) {
  const date = new Date(ms);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
}
export function accessState(signal = {}, now = Date.now()) {
  const local = readTrial(signal.account || trialAccount());
  const serverPlan = signal.trialPlan === 'basic' || signal.trialPlan === 'pro' ? signal.trialPlan : '';
  const serverEnds = stamp(signal.trialEndsAt);
  const basicEndsAt = Math.max(local.basicEndsAt, serverPlan === 'basic' ? serverEnds : 0);
  const proEndsAt = Math.max(local.proEndsAt, serverPlan === 'pro' ? serverEnds : 0);
  const trialPlan = proEndsAt > now ? 'pro' : basicEndsAt > now ? 'basic' : '';
  const trialEndsAt = trialPlan === 'pro' ? proEndsAt : trialPlan === 'basic' ? basicEndsAt : 0;
  const paid = paidPlan(signal);
  return {
    tier: higher(paid, trialPlan),
    paid,
    trialPlan,
    trialEndsAt,
    basicUsed: local.basicUsed || signal.basicTrialUsed === true || (serverPlan === 'basic' && serverEnds > 0),
    proUsed: local.proUsed || signal.proTrialUsed === true || (serverPlan === 'pro' && serverEnds > 0)
  };
}

export function applyServerAccess(result) {
  const plan = planFromVerify(result);
  if (plan === 'basic' || plan === 'pro') sessionPlan = plan;
  return plan;
}

export function planFromVerify(result) {
  if (!result || result.allowed !== true && result.verified !== true) return 'free';
  const named = planFromAccess(result);
  if (named === 'basic' || named === 'pro') return named;
  const product = String(result.productId || result.product || '');
  if (product === IOS_PRO_PRODUCT_ID || product === ANDROID_PRO_PRODUCT_ID) return 'pro';
  if (product === IOS_BASIC_PRODUCT_ID || product === ANDROID_BASIC_PRODUCT_ID) return 'basic';
  return 'free';
}

/** Paid server plan is the floor. A trial applies only until trialEndsAt. A bare flag is Free. */
export function resolveTier(signal = {}, now = Date.now()) {
  return accessState(signal, now).tier;
}

export function canUse(featureId, signal = {}) {
  return can(signal.tier || resolveTier(signal), entitlementKey(featureId));
}

export function lockBody(name, featureId) {
  if (featureId && BASIC_PLUS.includes(entitlementKey(featureId))) return name + ' — Included in Basic $20.';
  return name + ' — Included in Pro $40.';
}

export function featureById(id) {
  const key = entitlementKey(id);
  return PRO_FEATURES.find(feature => feature.id === key) || BASIC_FEATURES.find(feature => feature.id === key) || null;
}

export function clientSignal(now = Date.now()) {
  const access = accessState({studioPlan:sessionPlan || undefined}, now);
  return {
    studioPlan:sessionPlan || undefined,
    trialPlan:access.trialPlan || undefined,
    trialEndsAt:access.trialEndsAt || undefined
  };
}

export function storeBillingReady() {
  return false;
}

export function selfCheck() {
  if (resolveTier({allowed:true, kind:'lifetime'}) !== 'free') throw Error('Signed-in became a paid plan.');
  if (resolveTier({plan:'infectious'}) !== 'free' || resolveTier({kind:'plague', plan:'pro', pro:true, verified:true}) !== 'free') throw Error('Nation social plan unlocked the studio.');
  if (resolveTier({pro:true, verified:true, productId:'infectedvoices.studio.monthly'}) !== 'free') throw Error('Client flag unlocked Pro.');
  if (resolveTier({studioPlan:'basic'}) !== 'basic' || resolveTier({studioPlan:'pro'}) !== 'pro') throw Error('Server studio plan was ignored.');
  if (resolveTier({demoPlan:'pro'}) !== 'free') throw Error('Bare demo flag unlocked Pro.');
  const future = Date.now() + 60 * 60 * 1000;
  const past = Date.now() - 60 * 60 * 1000;
  if (resolveTier({trialPlan:'pro', trialEndsAt:future}) !== 'pro') throw Error('Active Pro trial did not apply.');
  if (resolveTier({trialPlan:'basic', trialEndsAt:future}) !== 'basic') throw Error('Active Basic trial did not apply.');
  if (resolveTier({trialPlan:'pro', trialEndsAt:past}) !== 'free') throw Error('Expired trial stayed Pro.');
  if (resolveTier({studioPlan:'basic', trialPlan:'pro', trialEndsAt:past}) !== 'basic') throw Error('Expired trial removed a paid plan.');
  if (resolveTier({studioPlan:'basic', trialPlan:'pro', trialEndsAt:future}) !== 'pro') throw Error('Pro trial did not sit above paid Basic.');
  if (canUse('stems', {trialPlan:'basic', trialEndsAt:future})) throw Error('Basic trial unlocked a Pro tool.');
  if (!canUse('project_lab', {trialPlan:'basic', trialEndsAt:future})) throw Error('Basic trial missed a Basic tool.');
  const started = startTrial('pro', 'self-check', Date.now());
  if (!started.ok || startTrial('pro', 'self-check', Date.now()).ok) throw Error('Pro trial was not once per account.');
  if (resolveTier({account:'self-check'}) !== 'pro') throw Error('Stored trial did not resolve.');
  if (startTrial('basic', 'self-check-basic', past).ok !== true) throw Error('Basic trial did not start.');
  for (const id of PRO_ONLY) {
    if (can('free', id) || can('basic', id) || !can('pro', id)) throw Error('Pro gate failed for ' + id);
  }
  for (const id of BASIC_PLUS) {
    if (can('free', id) || !can('basic', id) || !can('pro', id)) throw Error('Basic gate failed for ' + id);
  }
  if (!can('free', 'local_tune')) throw Error('Free local studio was gated.');
  if (lockBody('Export stems', 'stems') !== 'Export stems — Included in Pro $40.') throw Error('Pro lock copy drifted.');
  if (lockBody('Project Lab', 'project_lab') !== 'Project Lab — Included in Basic $20.') throw Error('Basic lock copy drifted.');
  if (storeBillingReady()) throw Error('Entitlements must not mark store billing ready before a verified purchase.');
  return true;
}
