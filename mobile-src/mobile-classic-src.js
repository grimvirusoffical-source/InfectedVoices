import './mobile-shell-src.js';
const c=await window.ivShell.config();
window.ivNative={serverOrigin:c.serverOrigin,openExternal:window.ivShell.openExternal,saveFile:async(name,blob)=>window.ivShell.saveFile(name,await blob.arrayBuffer())};
window.ivDesktop={setSessionState:window.ivShell.setSessionState,onMenu:window.ivShell.onMenu,checkUpdates:window.ivShell.checkUpdates,checkForUpdates:async()=>{await window.ivOpenNativeUpdates();return {message:'Mobile store update dialog opened.'};}};
window.ivGetSessionState=()=>({dirty:false});window.ivShell.setSessionState(window.ivGetSessionState());
const top=document.createElement('div');top.className='account-actions mobile-classic-top';document.body.prepend(top);const back=document.createElement('button');back.textContent='Arrangement Studio';back.onclick=()=>location.href='../studio.html';top.append(back);
const {mountMobileChrome}=await import('../mobile-chrome.js');await mountMobileChrome();
await import('./account-entry.js');
