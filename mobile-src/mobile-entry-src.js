import './mobile-shell-src.js';
const config=await window.ivShell.config();
window.ivNative={serverOrigin:config.serverOrigin,openExternal:window.ivShell.openExternal,onLink:window.ivShell.onLink,initialLink:window.ivShell.initialLink,shareInvite:window.ivShell.shareInvite,saveFile:async(name,blob)=>window.ivShell.saveFile(name,await blob.arrayBuffer())};
window.ivDesktop={onMenu:window.ivShell.onMenu,setSessionState:window.ivShell.setSessionState,checkUpdates:window.ivShell.checkUpdates,checkForUpdates:async()=>{await window.ivOpenNativeUpdates();return {message:'Mobile store update dialog opened.'};}};
const {mountMobileChrome}=await import('./mobile-chrome.js');await mountMobileChrome();
const {api,auth,openExternal}=await import('./desktop-session.js');
const {mount}=await import('./workstation/app.js');
const bridge=await mount({api,auth,openExternal,isDesktop:true});
try{const {Core6Collaboration}=await import('./core6-collaboration.js');const current=bridge.currentUser();if(current)window.ivCore6Collab=new Core6Collaboration({bridge,api,status:t=>{const el=document.getElementById('status');if(el)el.textContent=t;}});}catch(e){console.warn('Core 6 collaboration client unavailable',e);}
window.ivPrepareNativeUpdate=()=>bridge.checkpointForNativeUpdate();
