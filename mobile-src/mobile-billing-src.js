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
function describe(product, id, title){
  return {productId:id, title:product?.title||title, price:product?.priceString||'', available:!!product};
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
  async function summary(){
    const {platform, ids, list}=await loadProducts();
    return {
      platform,
      basic:describe(matchProduct(list, platform, ids.basic), ids.basic, 'Infected Voices Basic'),
      pro:describe(matchProduct(list, platform, ids.pro), ids.pro, 'Infected Voices Pro')
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
  async function purchase(tier){
    const plan=tier==='basic'?'basic':'pro';
    const user=await account();
    if(!(await support()))throw Error('Store billing is not available on this device.');
    const platform=currentPlatform();
    const id=idsFor(platform)[plan];
    const {list}=await loadProducts();
    if(!matchProduct(list, platform, id))throw Error((plan==='basic'?'Basic':'Pro')+' is not on this device yet.');
    const tx=await NativePurchases.purchaseProduct({
      productIdentifier:id,
      productType:PURCHASE_TYPE.SUBS,
      appAccountToken:await stableUuid(user.accountId),
      autoAcknowledgePurchases:false,
      ...(platform==='android'?{planIdentifier:ANDROID_BASE_PLAN_ID}:{})
    });
    return verify(tx,'purchase');
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
