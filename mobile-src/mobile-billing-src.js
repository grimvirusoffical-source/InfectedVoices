import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import {
  ANDROID_BASIC_PRODUCT_ID,
  ANDROID_PRO_PRODUCT_ID,
  IOS_BASIC_PRODUCT_ID,
  IOS_PRO_PRODUCT_ID,
  applyServerAccess
} from './entitlements.js';

export const ANDROID_BASE_PLAN_ID='monthly';
const APP_ID='infected-voices';

async function stableUuid(value){
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value))));
  const id=bytes.slice(0,16);
  id[6]=(id[6]&0x0f)|0x50;
  id[8]=(id[8]&0x3f)|0x80;
  const hex=[...id].map(v=>v.toString(16).padStart(2,'0')).join('');
  return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
}
function productId(tx){return String(tx?.productIdentifier||tx?.productId||tx?.planIdentifier||'');}
function currentPlatform(){return Capacitor.getPlatform();}
function idsFor(platform){
  return platform==='android'
    ? {basic:ANDROID_BASIC_PRODUCT_ID, pro:ANDROID_PRO_PRODUCT_ID}
    : {basic:IOS_BASIC_PRODUCT_ID, pro:IOS_PRO_PRODUCT_ID};
}
function knownProduct(id){
  return id===IOS_BASIC_PRODUCT_ID||id===IOS_PRO_PRODUCT_ID||id===ANDROID_BASIC_PRODUCT_ID||id===ANDROID_PRO_PRODUCT_ID;
}
function matchProduct(list, platform, id){
  if(platform==='android'){
    return list.find(p=>p.planIdentifier===id&&p.identifier===ANDROID_BASE_PLAN_ID)
      ||list.find(p=>p.planIdentifier===id)
      ||list.find(p=>p.identifier===id)
      ||null;
  }
  return list.find(p=>p.identifier===id)||null;
}
function explicitIntro(product){
  const value=product?.isEligibleForIntroOffer??product?.eligibleForIntroOffer??product?.introEligibility;
  if(value===false||value===1||value==='ineligible'||value==='INTRO_ELIGIBILITY_STATUS_INELIGIBLE')return false;
  if(value===true||value===2||value==='eligible'||value==='INTRO_ELIGIBILITY_STATUS_ELIGIBLE')return true;
  return null;
}
function describe(product, id, title){
  const offer=freeTrialOffer(product);
  const explicit=explicitIntro(product);
  const introEligible=product?explicit===false?false:explicit===true?!!offer:!!offer:null;
  return {productId:id, title:product?.title||title, price:product?.priceString||'', available:!!product, introEligible, offerToken:offer?.token||''};
}
function phaseIsFree(phase){
  if(!phase||typeof phase!=='object')return false;
  const mode=String(phase.paymentMode||phase.recurrenceMode||'');
  if(mode==='freeTrial'||mode==='FREE_TRIAL'||phase.paymentMode===0)return true;
  if(phase.price===0||phase.priceAmountMicros===0||phase.priceMicros===0)return true;
  const label=String(phase.priceString||phase.formattedPrice||'').toLowerCase();
  return label==='free'||label.startsWith('free ');
}
function freeTrialOffer(product){
  if(!product)return null;
  const intro=product.introductoryPrice||product.introPrice;
  if(intro&&(intro.paymentMode==='freeTrial'||intro.price===0||phaseIsFree(intro)))return {token:product.offerToken?String(product.offerToken):''};
  const groups=[].concat(product.subscriptionOffers||[], product.offers||[], product.subscriptionOfferDetails||[]);
  for(const offer of groups){
    const phases=offer?.pricingPhases||offer?.pricingPhaseList||[];
    const free=(Array.isArray(phases)?phases:[]).some(phaseIsFree)||phaseIsFree(offer);
    if(!free)continue;
    const token=offer.offerToken||offer.token||'';
    return {token:token?String(token):''};
  }
  return null;
}

export function createStoreBilling(nation){
  async function support(){
    if(!['ios','android'].includes(currentPlatform()))return false;
    try{return !!(await NativePurchases.isBillingSupported()).isBillingSupported;}catch{return false;}
  }
  async function account(){
    const user=await nation.me();
    if(!user?.accountId)throw Error('Sign in to InfectedNation before using store billing.');
    return user;
  }
  async function accountToken(){
    const user=await account();
    return stableUuid(user.accountId);
  }
  async function loadProducts(){
    const platform=currentPlatform();
    const ids=idsFor(platform);
    const wanted=[ids.basic, ids.pro];
    if(!(await support()))return {platform, ids, list:[]};
    let list=[];
    try{
      const result=await NativePurchases.getProducts({productIdentifiers:wanted, productType:PURCHASE_TYPE.SUBS});
      list=result.products||[];
    }catch{
      for(const id of wanted){
        try{
          const result=await NativePurchases.getProducts({productIdentifiers:[id], productType:PURCHASE_TYPE.SUBS});
          list.push(...(result.products||[]));
        }catch{/* This product is not in the device catalog. */}
      }
    }
    return {platform, ids, list};
  }
  async function honorEligibility(product, id, described){
    if(!product||described.introEligible===false)return described;
    const fn=NativePurchases.isEligibleForIntroOffer||NativePurchases.checkTrialOrIntroductoryPriceEligibility;
    if(typeof fn!=='function')return described;
    try{
      const result=await fn.call(NativePurchases,{productIdentifier:id,productIdentifiers:[id]});
      const row=result&&result[id]||result||{};
      const status=row.status??row.eligibility??result?.status??result?.eligibility;
      if(status===2||status===true||status==='eligible'||status==='INTRO_ELIGIBILITY_STATUS_ELIGIBLE')return described;
      return {...described,introEligible:false};
    }catch{
      return described;
    }
  }
  async function summary(){
    const {platform, ids, list}=await loadProducts();
    const basicProduct=matchProduct(list, platform, ids.basic);
    const proProduct=matchProduct(list, platform, ids.pro);
    return {
      platform,
      basic:await honorEligibility(basicProduct, ids.basic, describe(basicProduct, ids.basic, 'Infected Voices Basic')),
      pro:await honorEligibility(proProduct, ids.pro, describe(proProduct, ids.pro, 'Infected Voices Pro'))
    };
  }
  async function verify(tx,kind){
    const token=await nation.currentToken();
    if(!token)throw Error('Sign in to InfectedNation before verifying a purchase.');
    const platform=currentPlatform();
    const payload={
      token,appId:APP_ID,platform,kind,
      productId:productId(tx),
      transactionId:String(tx?.transactionId||''),
      purchaseToken:String(tx?.purchaseToken||''),
      orderId:String(tx?.orderId||''),
      purchaseState:tx?.purchaseState??null,
      isAcknowledged:tx?.isAcknowledged??null,
      receipt:String(tx?.receipt||''),
      jwsRepresentation:String(tx?.jwsRepresentation||''),
      purchaseDate:String(tx?.purchaseDate||''),
      expirationDate:String(tx?.expirationDate||'')
    };
    const result=await nation.post('/api/v1/billing/mobile/verify',payload);
    if(!(result?.allowed||result?.verified))throw Error(result?.error||'The store purchase could not be verified.');
    applyServerAccess({...result, productId:payload.productId, allowed:result.allowed===true, verified:result.verified===true});
    const finishToken=platform==='android'?tx?.purchaseToken:tx?.transactionId;
    if(finishToken){
      try{await NativePurchases.acknowledgePurchase({purchaseToken:String(finishToken)});}catch{}
    }
    return result;
  }
  async function purchase(tier, mode){
    const plan=tier==='basic'?'basic':'pro';
    const trial=mode==='trial';
    const user=await account();
    if(!(await support()))throw Error('Store billing is not available on this device.');
    const platform=currentPlatform();
    const id=idsFor(platform)[plan];
    const {list}=await loadProducts();
    const product=matchProduct(list, platform, id);
    if(!product)throw Error((plan==='basic'?'Basic':'Pro')+' is not on this device yet.');
    const described=await honorEligibility(product, id, describe(product, id, plan==='basic'?'Basic':'Pro'));
    const offer=trial?freeTrialOffer(product):null;
    if(trial&&(described.introEligible===false||!offer))throw Error('Intro offer is not available for this account.');
    const tx=await NativePurchases.purchaseProduct({
      productIdentifier:id,
      productType:PURCHASE_TYPE.SUBS,
      appAccountToken:await stableUuid(user.accountId),
      autoAcknowledgePurchases:false,
      ...(platform==='android'?{planIdentifier:ANDROID_BASE_PLAN_ID}:{}),
      ...(offer?.token?{offerToken:offer.token}:{})
    });
    return verify(tx, trial?'trial':'purchase');
  }
  async function restore(){
    await account();
    if(!(await support()))throw Error('Store billing is not available on this device.');
    try{await NativePurchases.restorePurchases();}catch{}
    const uuid=await accountToken();
    const {purchases}=await NativePurchases.getPurchases({
      productType:PURCHASE_TYPE.SUBS,
      appAccountToken:uuid,
      onlyCurrentEntitlements:true
    });
    const matches=(purchases||[]).filter(tx=>knownProduct(productId(tx)));
    if(!matches.length)throw Error('No active Basic or Pro store purchase was found for this account.');
    let lastError=null;
    for(const tx of matches){
      try{
        const result=await verify(tx,'restore');
        if(result?.allowed||result?.verified)return result;
      }catch(error){lastError=error;}
    }
    throw lastError||Error('No active Basic or Pro entitlement could be restored.');
  }
  async function manage(){
    if(!(await support()))throw Error('Store billing is not available on this device.');
    await NativePurchases.manageSubscriptions();
    return {opened:true};
  }
  return Object.freeze({support,summary,purchase,restore,manage});
}
