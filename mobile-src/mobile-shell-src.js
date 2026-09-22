import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const VERSION='0.6.5-ios.1';
const DEFAULT_ORIGIN='https://infectedvoices.space';
const MAX_EXPORT=268435456;
let pendingLink=null,lastState={at:Date.now()},authBusy=false;
const linkListeners=new Set(),authListeners=new Set(),menuListeners=new Set();

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const randomHex=bytes=>{const b=crypto.getRandomValues(new Uint8Array(bytes));return [...b].map(v=>v.toString(16).padStart(2,'0')).join('');};
const notifyAuth=t=>{for(const cb of authListeners)try{cb(t);}catch{}};
function safeOrigin(v){const u=new URL(String(v||'').trim());if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||(u.pathname!=='/'&&u.pathname!==''))throw Error('Use an HTTPS account-server origin only.');return u.origin;}
function apiPath(v){if(typeof v!=='string'||v.length>2000||!/^\/api\/[a-zA-Z0-9_/?=&.%:+-]+$/.test(v)||v.includes('..')||v.includes('\\')||/%(?:2f|5c)/i.test(v)||v.includes('/desktop/'))throw Error('Unsupported account request.');return v;}
const safeName=n=>typeof n==='string'&&n.length<161&&!/[\\/:\x00-\x1f]/.test(n)&&/\.(wav|mp3|json|ivp5|ivproject|ivweb|ivplugin|md|zip)$/i.test(n);
async function origin(){const {value}=await Preferences.get({key:'iv-server-origin'});return safeOrigin(value||DEFAULT_ORIGIN);}
async function sessionGet(){try{await SecureStorage.setKeyPrefix('infectedvoices_');const v=await SecureStorage.get('device_session');return v&&typeof v==='object'?v:null;}catch{return null;}}
async function sessionSet(v){await SecureStorage.setKeyPrefix('infectedvoices_');if(v)await SecureStorage.set('device_session',v);else await SecureStorage.remove('device_session');}
async function requestJSON(path,body){const base=await origin(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),redirect:'error',credentials:'omit',signal:controller.signal});const text=await r.text();if(text.length>8388608)throw Error('Account response is too large.');let data;try{data=JSON.parse(text);}catch{throw Error('The account server returned an unreadable response.');}if(!r.ok){const e=Error(String(data.error||'Account request failed.').slice(0,600));e.status=r.status;throw e;}return data;}finally{clearTimeout(timer);}}
async function currentUser(){const s=await sessionGet();if(!s)return null;try{return (await requestJSON('/api/desktop/session',s)).user||null;}catch(e){if(e.status===401)await sessionSet(null);throw e;}}
async function signIn(){if(authBusy)throw Error('Finish the sign-in already in progress.');authBusy=true;try{const secret=randomHex(32),r=await requestJSON('/api/desktop/start',{secret});if(!/^[\w-]{1,100}$/.test(r.id)||!/^[A-F0-9]{8}$/.test(r.code)||!Number.isFinite(r.expires))throw Error('The server returned an invalid login request.');const pending={id:r.id,secret};notifyAuth('In your browser, sign in and approve code '+r.code);await Browser.open({url:(await origin())+'/#connect/'+encodeURIComponent(r.id),presentationStyle:'popover'});while(Date.now()<r.expires){await sleep(2500);const s=await requestJSON('/api/desktop/session',pending);if(s.user){await sessionSet(pending);try{await Browser.close();}catch{}notifyAuth('Browser authorization verified.');return {user:s.user};}}throw Error('Sign-in expired. Start again.');}finally{authBusy=false;}}
async function signOut(){const old=await sessionGet();await sessionSet(null);if(!old)return {local:true,remote:true};try{await requestJSON('/api/desktop/logout',old);return {local:true,remote:true};}catch{return {local:true,remote:false,message:'Signed out on this device. Remote revocation could not be confirmed.'};}}
async function accountCall(method,path,data){const s=await sessionGet();if(!s)throw Error('Sign in with your authorized account first.');if(!['GET','POST','PUT','DELETE'].includes(method))throw Error('Unsupported request method.');apiPath(path);if(JSON.stringify(data??{}).length>2097152)throw Error('Account request is too large.');return requestJSON('/api/desktop/call',{...s,method,path,data});}
function allowedExternal(url,server){const u=new URL(url),allowed=[new URL(server).hostname,'infectedvoices.space','www.image-line.com','www.roexaudio.com','roexaudio.com','soundcloud.com','www.soundcloud.com','distrokid.com','www.distrokid.com','www.gnu.org','storage.googleapis.com','tonn-portal.roexaudio.com'];if(u.protocol!=='https:'||u.username||u.password||!allowed.includes(u.hostname)||u.href.length>3000)throw Error('External destination is not allowlisted.');return u.href;}
async function bufferToBase64(bytes){const blob=new Blob([bytes]),reader=new FileReader();return new Promise((res,rej)=>{reader.onerror=()=>rej(reader.error||Error('Could not encode export.'));reader.onload=()=>res(String(reader.result).split(',')[1]||'');reader.readAsDataURL(blob);});}
async function saveFile(name,bytes){if(!safeName(name)||!(bytes instanceof ArrayBuffer)||bytes.byteLength>MAX_EXPORT)throw Error('Invalid or oversized mobile export. Use stems or a shorter render for files above 256 MB.');const data=await bufferToBase64(bytes),folder='InfectedVoices',path=folder+'/'+name;await Filesystem.mkdir({path:folder,directory:Directory.Cache,recursive:true}).catch(()=>{});await Filesystem.writeFile({path,directory:Directory.Cache,data,recursive:true});const {uri}=await Filesystem.getUri({path,directory:Directory.Cache});await Haptics.impact({style:ImpactStyle.Light}).catch(()=>{});await Share.share({title:'Infected Voices export',text:name,url:uri,dialogTitle:'Save or share '+name});return {saved:true,uri};}
async function hostCheck(candidate){const base=safeOrigin(candidate?.serverOrigin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const r=await fetch(base+'/api/_healthcheck',{redirect:'error',signal:controller.signal,cache:'no-store'});if(!r.ok)throw Error('Host health endpoint returned HTTP '+r.status+'.');const text=await r.text();JSON.parse(text);return {reachable:true,message:'HTTPS and the JSON health route responded. Sign-in, entitlements and migration still need account-level verification.'};}finally{clearTimeout(timer);}}
async function configure(candidate){if(lastState.recording||lastState.starting||lastState.finalizing||lastState.playing||lastState.busy||lastState.pendingWrites||lastState.dirty)throw Error('Finish recording/playback/export and save the project before changing servers.');const next=safeOrigin(candidate?.serverOrigin),prior=await origin();if(next!==prior){await sessionSet(null);await Preferences.set({key:'iv-server-origin',value:next});}await Preferences.set({key:'iv-protocol',value:candidate?.protocol==='collab-v1'?'collab-v1':'device-v1'});location.reload();return {saved:true};}
async function storeURL(){const {value}=await Preferences.get({key:'iv-app-store-url'});return value||'';}

await SecureStorage.setKeyPrefix('infectedvoices_').catch(()=>{});
App.addListener('appUrlOpen',({url})=>{try{const u=new URL(url);if(u.protocol!=='infectedvoices:'||!['auth','collab'].includes(u.hostname))return;pendingLink=url;for(const cb of linkListeners)cb(url);}catch{}});

window.ivShell=Object.freeze({
  config:async()=>({serverOrigin:await origin(),protocol:(await Preferences.get({key:'iv-protocol'})).value||'device-v1',nativeVersion:VERSION,nativeSequence:2026092201,packaged:true,platform:Capacitor.getPlatform(),updatesConfigured:true,mobile:true,network:(await Network.getStatus()).connected}),
  user:currentUser,signIn,signOut,request:accountCall,
  openExternal:async url=>Browser.open({url:allowedExternal(url,await origin()),presentationStyle:'popover'}),
  saveFile,hostCheck,configure,
  checkUpdates:async()=>({version:VERSION,ready:false,notes:'iOS updates are distributed through the Apple App Store.',storeManaged:true,url:await storeURL()}),
  downloadUpdate:async()=>{const url=await storeURL();if(!url)throw Error('Store listing URL is not configured until the first store release is published.');await Browser.open({url});return {ready:false,storeManaged:true};},
  cancelUpdate:async()=>({canceled:true}),installUpdate:async()=>{const url=await storeURL();if(!url)throw Error('Store listing URL is not configured yet.');await Browser.open({url});return {started:true,storeManaged:true};},
  setSessionState:s=>{lastState={...s,at:Date.now()};},
  onAuthStatus:cb=>{authListeners.add(cb);return()=>authListeners.delete(cb);},onUpdateProgress:()=>()=>{},
  initialLink:async()=>{const v=pendingLink;pendingLink=null;return v;},
  shareInvite:async address=>{const u=new URL(address);if(u.origin!==await origin())throw Error('Invalid collaboration invitation.');await Share.share({title:'Infected Voices collaboration',text:'Join my Infected Voices session',url:u.href});return {shared:true};},
  onLink:cb=>{linkListeners.add(cb);return()=>linkListeners.delete(cb);},onMenu:cb=>{menuListeners.add(cb);return()=>menuListeners.delete(cb);}
});
