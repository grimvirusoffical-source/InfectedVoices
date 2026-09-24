import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { rememberStudioPlus } from './entitlements.js';

export const STORE_PRODUCTS=Object.freeze({
  basic:{ios:'infectedvoices.basic.monthly',android:'infectedvoices.basic.monthly',basePlan:'monthly'},
  pro:{ios:'infectedvoices.pro.monthly',android:'infectedvoices.pro.monthly',basePlan:'monthly'}
});
const APP_ID='infected-voices';
const tiers=['basic','pro'];

async function stableUuid(value){
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value))));
  const id=bytes.slice(0,16); id[6]=(id[6]&0x0f)|0x50; id[8]=(id[8]&0x3f)|0x80;
  const hex=[...id].map(v=>v.toString(16).padStart(2,'0')).join('');
  return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
}
function currentPlatform(){return Capacitor.getPlatform();}
function productId(tx){return String(tx?.productIdentifier||tx?.productId||'');}
function config(tier,platform=currentPlatform()){
  if(!tiers.includes(tier))throw Error('Choose Basic or Pro.');
  const row=STORE_PRODUCTS[tier]; return {tier,productId:platform==='ios'?row.ios:row.android,basePlanId:row.basePlan};
}
function tierForProduct(id){return tiers.find(t=>STORE_PRODUCTS[t].ios===id||STORE_PRODUCTS[t].android===id)||null;}

export function createStoreBilling(nation){
  async function support(){
    if(!['ios','android'].includes(currentPlatform()))return false;
    try{return !!(await NativePurchases.isBillingSupported()).isBillingSupported;}catch{return false;}
  }
  async function account(){const user=await nation.me();if(!user?.accountId)throw Error('Sign in to InfectedNation before using store billing.');return user;}
  async function accountToken(){return stableUuid((await account()).accountId);}
  async function products(){
    if(!(await support()))throw Error('Store billing is not available on this device.');
    const platform=currentPlatform();
    const productIdentifiers=tiers.map(t=>config(t,platform).productId);
    const {products}=await NativePurchases.getProducts({productIdentifiers,productType:PURCHASE_TYPE.SUBS});
    return products||[];
  }
  async function summary(){
    const list=await products(),platform=currentPlatform();
    return {platform,tiers:Object.fromEntries(tiers.map(t=>{const c=config(t,platform);const product=list.find(p=>p.identifier===c.productId||p.planIdentifier===c.productId)||null;return [t,{...c,title:product?.title||('Infected Voices '+(t==='pro'?'Pro':'Basic')),price:product?.priceString||'',product}]}))};
  }
  async function verify(tx,kind,requestedTier){
    const token=await nation.currentToken();if(!token)throw Error('Sign in to InfectedNation before verifying a purchase.');
    const platform=currentPlatform(),id=productId(tx)||config(requestedTier,platform).productId,tier=tierForProduct(id)||requestedTier;
    const payload={token,appId:APP_ID,platform,kind,tier,productId:id,transactionId:String(tx?.transactionId||''),purchaseToken:String(tx?.purchaseToken||''),orderId:String(tx?.orderId||''),purchaseState:tx?.purchaseState??null,isAcknowledged:tx?.isAcknowledged??null,receipt:String(tx?.receipt||''),jwsRepresentation:String(tx?.jwsRepresentation||''),purchaseDate:String(tx?.purchaseDate||''),expirationDate:String(tx?.expirationDate||'')};
    const result=await nation.post('/api/v1/billing/mobile/verify',payload);
    if(!(result?.allowed||result?.verified))throw Error(result?.error||'The store purchase could not be verified.');
    rememberStudioPlus({...result,tier,productId:id,allowed:result.allowed===true,verified:result.verified===true});
    const finishToken=platform==='android'?tx?.purchaseToken:tx?.transactionId;
    if(finishToken){try{await NativePurchases.acknowledgePurchase({purchaseToken:String(finishToken)});}catch{}}
    return {...result,tier};
  }
  async function purchase(tier='pro'){
    const user=await account();if(!(await support()))throw Error('Store billing is not available on this device.');
    const platform=currentPlatform(),uuid=await stableUuid(user.accountId),c=config(tier,platform);
    const options={productIdentifier:c.productId,productType:PURCHASE_TYPE.SUBS,appAccountToken:uuid,autoAcknowledgePurchases:false};
    if(platform==='android')options.planIdentifier=c.basePlanId;
    return verify(await NativePurchases.purchaseProduct(options),'purchase',tier);
  }
  async function restore(){
    await account();if(!(await support()))throw Error('Store billing is not available on this device.');
    try{await NativePurchases.restorePurchases();}catch{}
    const {purchases}=await NativePurchases.getPurchases({productType:PURCHASE_TYPE.SUBS,appAccountToken:await accountToken(),onlyCurrentEntitlements:true});
    const matches=(purchases||[]).filter(tx=>tierForProduct(productId(tx)));
    if(!matches.length)throw Error('No active Infected Voices store subscription was found for this account.');
    let lastError=null;for(const tx of matches){try{return await verify(tx,'restore',tierForProduct(productId(tx)));}catch(error){lastError=error;}}
    throw lastError||Error('No active store entitlement could be restored.');
  }
  async function manage(){if(!(await support()))throw Error('Store billing is not available on this device.');await NativePurchases.manageSubscriptions();return {opened:true};}
  return Object.freeze({support,summary,purchase,restore,manage});
}
