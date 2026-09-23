import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { createNationClient } from './mobile-nation-src.js';
import { createStoreBilling } from './mobile-billing-src.js';

const VERSION='0.6.6-mobile.2';
const DEFAULT_ORIGIN='https://infectedvoices.space';
const MAX_EXPORT=268435456;
let pendingLink=null,lastState={at:Date.now()},authBusy=false;
const linkListeners=new Set(),authListeners=new Set(),menuListeners=new Set();
const notifyAuth=t=>{for(const cb of authListeners)try{cb(t);}catch{}};
function safeOrigin(v){const u=new URL(String(v||'').trim());if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||(u.pathname!=='/'&&u.pathname!==''))throw Error('Use an HTTPS Studio origin only.');return u.origin;}
function apiPath(v){if(typeof v!=='string'||v.length>2000||!/^\/api\/[a-zA-Z0-9_/?=&.%:+-]+$/.test(v)||v.includes('..')||v.includes('\\'))throw Error('Unsupported Studio request.');return v;}
const safeName=n=>typeof n==='string'&&n.length<161&&!/[\\/:\x00-\x1f]/.test(n)&&/\.(wav|mp3|json|ivp5|ivproject|ivweb|ivplugin|md|zip)$/i.test(n);
async function origin(){const {value}=await Preferences.get({key:'iv-server-origin'});return safeOrigin(value||DEFAULT_ORIGIN);}

await SecureStorage.setKeyPrefix('infectedvoices_').catch(()=>{});
const nation=createNationClient({Browser,SecureStorage});
const billing=createStoreBilling(nation);

function mappedUser(account){
  if(!account)return null;
  return {...account,id:account.accountId,userId:account.accountId,name:[account.firstName,account.middleInitial,account.lastName].filter(Boolean).join(' ')};
}
async function currentUser(){return mappedUser(await nation.me());}
async function signIn(options={}){
  if(authBusy)throw Error('Finish the sign-in already in progress.');
  authBusy=true;
  try{
    notifyAuth('Opening InfectedNation secure sign-in…');
    const account=await nation.signIn(options);
    notifyAuth('InfectedNation account verified.');
    return {user:mappedUser(account)};
  }finally{authBusy=false;}
}
async function signOut(){
  await nation.signOut();
  return {local:true,remote:true};
}
async function requestStudio(method,path,data){
  if(!['GET','POST','PUT','DELETE'].includes(method))throw Error('Unsupported request method.');
  apiPath(path);
  const token=await nation.currentToken();
  if(!token)throw Error('Sign in with InfectedNation first.');
  if(JSON.stringify(data??{}).length>2097152)throw Error('Studio request is too large.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
    const response=await fetch((await origin())+path,{
      method,headers:{Accept:'application/json',Authorization:'Bearer '+token,...(method!=='GET'?{'Content-Type':'application/json'}:{})},
      body:method==='GET'?undefined:JSON.stringify(data??{}),credentials:'omit',redirect:'error',signal:controller.signal
    });
    const text=await response.text();
    let body={};
    try{body=text?JSON.parse(text):{};}catch{throw Error('The RedXAIHost Studio service returned an unreadable response.');}
    if(!response.ok){const error=Error(String(body.error||'Studio request failed.').slice(0,600));error.status=response.status;error.code=body.code;throw error;}
    return body;
  }finally{clearTimeout(timer);}
}
function allowedExternal(url,server){
  const u=new URL(url),allowed=[new URL(server).hostname,'infectedvoices.space','nation.infectedvoices.space','www.image-line.com','www.roexaudio.com','roexaudio.com','soundcloud.com','www.soundcloud.com','distrokid.com','www.distrokid.com','www.gnu.org','storage.googleapis.com','tonn-portal.roexaudio.com'];
  if(u.protocol!=='https:'||u.username||u.password||!allowed.includes(u.hostname)||u.href.length>3000)throw Error('External destination is not allowlisted.');
  return u.href;
}
async function bufferToBase64(bytes){const blob=new Blob([bytes]),reader=new FileReader();return new Promise((res,rej)=>{reader.onerror=()=>rej(reader.error||Error('Could not encode export.'));reader.onload=()=>res(String(reader.result).split(',')[1]||'');reader.readAsDataURL(blob);});}
async function saveFile(name,bytes){
  if(!safeName(name)||!(bytes instanceof ArrayBuffer)||bytes.byteLength>MAX_EXPORT)throw Error('Invalid or oversized mobile export. Use stems or a shorter render for files above 256 MB.');
  const data=await bufferToBase64(bytes),folder='InfectedVoices',path=folder+'/'+name;
  await Filesystem.mkdir({path:folder,directory:Directory.Cache,recursive:true}).catch(()=>{});
  await Filesystem.writeFile({path,directory:Directory.Cache,data,recursive:true});
  const {uri}=await Filesystem.getUri({path,directory:Directory.Cache});
  await Haptics.impact({style:ImpactStyle.Light}).catch(()=>{});
  await Share.share({title:'Infected Voices export',text:name,url:uri,dialogTitle:'Save or share '+name});
  return {saved:true,uri};
}
async function hostCheck(candidate){
  const base=safeOrigin(candidate?.serverOrigin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const r=await fetch(base+'/api/health',{redirect:'error',signal:controller.signal,cache:'no-store'});if(!r.ok)throw Error('Host health endpoint returned HTTP '+r.status+'.');const data=await r.json();if(data.service!=='InfectedVoices')throw Error('This HTTPS origin is not an Infected Voices RedXAIHost service.');return {reachable:true,message:'RedXAIHost Studio API is reachable.'};}
  finally{clearTimeout(timer);}
}
async function configure(candidate){
  if(lastState.recording||lastState.starting||lastState.finalizing||lastState.playing||lastState.busy||lastState.pendingWrites||lastState.dirty)throw Error('Finish recording/playback/export and save the project before changing servers.');
  const next=safeOrigin(candidate?.serverOrigin);
  await Preferences.set({key:'iv-server-origin',value:next});
  await Preferences.set({key:'iv-protocol',value:candidate?.protocol==='collab-v1'?'collab-v1':'device-v1'});
  location.reload();return {saved:true};
}
async function storeURL(){const {value}=await Preferences.get({key:'iv-app-store-url'});return value||'';}

App.addListener('appUrlOpen',({url})=>{try{const u=new URL(url);if(u.protocol!=='infectedvoices:'||!['auth','collab'].includes(u.hostname))return;pendingLink=url;for(const cb of linkListeners)cb(url);}catch{}});
window.ivShell=Object.freeze({
  config:async()=>({serverOrigin:await origin(),nationOrigin:nation.origin,protocol:(await Preferences.get({key:'iv-protocol'})).value||'device-v1',nativeVersion:VERSION,nativeSequence:2026092302,packaged:true,platform:Capacitor.getPlatform(),updatesConfigured:true,mobile:true,network:(await Network.getStatus()).connected}),
  user:currentUser,signIn,signOut,request:requestStudio,
  storeSummary:billing.summary,purchaseSubscription:billing.purchase,restorePurchases:billing.restore,manageSubscription:billing.manage,
  openExternal:async url=>Browser.open({url:allowedExternal(url,await origin()),presentationStyle:'popover'}),
  saveFile,hostCheck,configure,
  checkUpdates:async()=>({version:VERSION,ready:false,notes:'Updates are distributed through your platform app store.',storeManaged:true,url:await storeURL()}),
  downloadUpdate:async()=>{const url=await storeURL();if(!url)throw Error('Store listing URL is not configured until the first store release is published.');await Browser.open({url});return {ready:false,storeManaged:true};},
  cancelUpdate:async()=>({canceled:true}),installUpdate:async()=>{const url=await storeURL();if(!url)throw Error('Store listing URL is not configured yet.');await Browser.open({url});return {started:true,storeManaged:true};},
  setSessionState:s=>{lastState={...s,at:Date.now()};},
  onAuthStatus:cb=>{authListeners.add(cb);return()=>authListeners.delete(cb);},onUpdateProgress:()=>()=>{},
  initialLink:async()=>{const v=pendingLink;pendingLink=null;return v;},
  shareInvite:async address=>{const u=new URL(address);if(u.origin!==await origin())throw Error('Invalid collaboration invitation.');await Share.share({title:'Infected Voices collaboration',text:'Join my Infected Voices session',url:u.href});return {shared:true};},
  onLink:cb=>{linkListeners.add(cb);return()=>linkListeners.delete(cb);},onMenu:cb=>{menuListeners.add(cb);return()=>menuListeners.delete(cb);}
});
