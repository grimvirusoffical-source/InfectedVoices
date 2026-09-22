import './mobile-shell-src.js';
const config=await window.ivShell.config();
window.ivNative={serverOrigin:config.serverOrigin,openExternal:window.ivShell.openExternal,onLink:window.ivShell.onLink,initialLink:window.ivShell.initialLink,shareInvite:window.ivShell.shareInvite,saveFile:async(name,blob)=>window.ivShell.saveFile(name,await blob.arrayBuffer())};
window.ivDesktop={onMenu:window.ivShell.onMenu,setSessionState:window.ivShell.setSessionState,checkUpdates:window.ivShell.checkUpdates,checkForUpdates:async()=>{await window.ivOpenNativeUpdates();return {message:'Mobile store update dialog opened.'};}};
const {mountMobileChrome}=await import('./mobile-chrome.js');await mountMobileChrome();
const {api,auth,openExternal}=await import('./desktop-session.js');
const {mount}=await import('./workstation/app.js');
const bridge=await mount({api,auth,openExternal,isDesktop:true});
window.ivPrepareNativeUpdate=()=>bridge.checkpointForNativeUpdate();
