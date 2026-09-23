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
let sessionPlan = '';

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

/** QA flip until store products are live. Server basic|pro still wins. */
export function setDemoPlan(plan) {
  if (plan === 'free') localStorage.removeItem('iv-studio-demo-plan');
  else if (plan === 'basic' || plan === 'pro') localStorage.setItem('iv-studio-demo-plan', plan);
  return plan;
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

/** Signed-in, allowed, lifetime, Nation social, or a client boolean is Free. */
export function resolveTier(signal = {}) {
  const server = planFromAccess(signal);
  if (server === 'basic' || server === 'pro') return server;
  if (sessionPlan === 'basic' || sessionPlan === 'pro') return sessionPlan;
  if (signal.demoPlan === 'basic' || signal.demoPlan === 'pro') return signal.demoPlan;
  const demo = readDemoPlan();
  if (demo === 'basic' || demo === 'pro') return demo;
  return 'free';
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

export function clientSignal() {
  return {demoPlan:readDemoPlan(), studioPlan:sessionPlan || undefined};
}

export function storeBillingReady() {
  return false;
}

export function selfCheck() {
  if (resolveTier({allowed:true, kind:'lifetime'}) !== 'free') throw Error('Signed-in became a paid plan.');
  if (resolveTier({plan:'infectious'}) !== 'free' || resolveTier({kind:'plague', plan:'pro', pro:true, verified:true}) !== 'free') throw Error('Nation social plan unlocked the studio.');
  if (resolveTier({pro:true, verified:true, productId:'infectedvoices.studio.monthly'}) !== 'free') throw Error('Client flag unlocked Pro.');
  if (resolveTier({studioPlan:'basic'}) !== 'basic' || resolveTier({studioPlan:'pro'}) !== 'pro') throw Error('Server studio plan was ignored.');
  if (resolveTier({demoPlan:'pro'}) !== 'pro') throw Error('QA demo flip did not apply.');
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
