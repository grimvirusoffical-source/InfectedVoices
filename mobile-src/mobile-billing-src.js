import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';

export const STORE_PRODUCT_ID='infectedvoices.studio.monthly';
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
function productId(tx){return String(tx?.productIdentifier||tx?.productId||'');}
function currentPlatform(){return Capacitor.getPlatform();}

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
  async function products(){
    if(!(await support()))throw Error('Store billing is not available on this device.');
    const {products}=await NativePurchases.getProducts({
      productIdentifiers:[STORE_PRODUCT_ID],
      productType:PURCHASE_TYPE.SUBS
    });
    return products||[];
  }
  async function summary(){
    const list=await products();
    const platform=currentPlatform();
    let product=null;
    if(platform==='android'){
      product=list.find(p=>p.planIdentifier===STORE_PRODUCT_ID&&p.identifier===ANDROID_BASE_PLAN_ID)
        ||list.find(p=>p.planIdentifier===STORE_PRODUCT_ID)||list[0]||null;
    }else product=list.find(p=>p.identifier===STORE_PRODUCT_ID)||list[0]||null;
    return {
      platform,productId:STORE_PRODUCT_ID,basePlanId:ANDROID_BASE_PLAN_ID,
      title:product?.title||'Infected Voices Studio Plus',
      price:product?.priceString||'',product
    };
  }
  async function verify(tx,kind){
    const token=await nation.currentToken();
    if(!token)throw Error('Sign in to InfectedNation before verifying a purchase.');
    const platform=currentPlatform();
    const payload={
      token,appId:APP_ID,platform,kind,
      productId:productId(tx)||STORE_PRODUCT_ID,
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
    const finishToken=platform==='android'?tx?.purchaseToken:tx?.transactionId;
    if(finishToken){
      try{await NativePurchases.acknowledgePurchase({purchaseToken:String(finishToken)});}catch{}
    }
    return result;
  }
  async function purchase(){
    const user=await account();
    if(!(await support()))throw Error('Store billing is not available on this device.');
    const platform=currentPlatform(),uuid=await stableUuid(user.accountId);
    const options={
      productIdentifier:STORE_PRODUCT_ID,
      productType:PURCHASE_TYPE.SUBS,
      appAccountToken:uuid,
      autoAcknowledgePurchases:false
    };
    if(platform==='android')options.planIdentifier=ANDROID_BASE_PLAN_ID;
    const tx=await NativePurchases.purchaseProduct(options);
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
    const matches=(purchases||[]).filter(tx=>productId(tx)===STORE_PRODUCT_ID);
    if(!matches.length)throw Error('No active Studio Plus store purchase was found for this account.');
    let lastError=null;
    for(const tx of matches){
      try{
        const result=await verify(tx,'restore');
        if(result?.allowed||result?.verified)return result;
      }catch(error){lastError=error;}
    }
    throw lastError||Error('No active Studio Plus entitlement could be restored.');
  }
  async function manage(){
    if(!(await support()))throw Error('Store billing is not available on this device.');
    await NativePurchases.manageSubscriptions();
    return {opened:true};
  }
  return Object.freeze({support,summary,purchase,restore,manage});
}
