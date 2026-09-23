/** Basic ($20) includes the studio. These five actions are Pro ($40) only. */
export const PRO_FEATURES = [
  {id:'stems', name:'Export stems'},
  {id:'ai-mix', name:'AI Mix / Master'},
  {id:'ai-tune', name:'AI Auto-Tune'},
  {id:'ai-beat', name:'AI Beat-Lock'},
  {id:'isolate', name:'Vocal isolation'}
];

const PRO_IDS = new Set(PRO_FEATURES.map(feature => feature.id));

export function resolveTier(signal = {}) {
  const blob = [signal.plan, signal.kind, signal.tier, signal.badge].filter(Boolean).join(' ').toLowerCase();
  const pro = signal.pro === true || signal.capabilities?.stemSeparation === true || /\bpro\b|\bhighest\b/.test(blob);
  if (pro) return 'pro';
  const basic = signal.allowed === true || signal.basic === true || /basic|studio|lifetime|sub|member/.test(blob);
  return basic ? 'basic' : 'none';
}

export function canUse(featureId, signal = {}) {
  const tier = signal.tier || resolveTier(signal);
  if (tier === 'pro') return true;
  const caps = signal.capabilities || {};
  if (featureId === 'isolate' && caps.stemSeparation) return true;
  if ((featureId === 'ai-mix' || featureId === 'ai-tune' || featureId === 'ai-beat') && caps.aiAssist) return true;
  if (!PRO_IDS.has(featureId)) return true;
  return false;
}

export function lockBody(name) {
  return name + ' is on the $40 Pro plan.';
}

export function featureById(id) {
  return PRO_FEATURES.find(feature => feature.id === id) || null;
}

/** StoreKit / Play Billing is not wired. Cap builds must not present a fake charge. */
export function storeBillingReady() {
  return false;
}

export function selfCheck() {
  const basic = resolveTier({allowed:true, kind:'lifetime'});
  const pro = resolveTier({plan:'pro'});
  const none = resolveTier({});
  if (basic !== 'basic' || pro !== 'pro' || none !== 'none') throw Error('Tier resolution failed.');
  if (canUse('stems', {tier:basic}) || !canUse('stems', {tier:pro}) || canUse('isolate', {tier:none})) throw Error('Pro gate failed.');
  if (!canUse('ai-tune', {tier:'basic', capabilities:{aiAssist:true}})) throw Error('Existing AI capability should pass the AI gate.');
  if (canUse('stems', {tier:'basic', capabilities:{aiAssist:true}})) throw Error('AI assist must not unlock stem export.');
  if (lockBody('Export stems') !== 'Export stems is on the $40 Pro plan.') throw Error('Lock sheet copy drifted.');
  if (storeBillingReady()) throw Error('Store billing is not implemented.');
  return true;
}
