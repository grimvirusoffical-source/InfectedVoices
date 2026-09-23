export async function mountStudioChrome(){
 const shell=window.ivShell;
 const config=await shell.config();
 const style=document.createElement('style');
 style.textContent=`
#ivNativeBar{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:calc(12px + env(safe-area-inset-bottom));z-index:40;display:flex;gap:8px}
#ivNativeBar button{font:600 12px/1.2 Inter,ui-sans-serif,system-ui,sans-serif;color:#fafafa;background:#18181b;border:1px solid #27272a;border-radius:999px;padding:8px 12px;min-height:36px}
#ivNativeBar button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(110,121,214,.4)}
.iv-native-dialog{border:1px solid #27272a;border-radius:12px;background:#111113;color:#fafafa;padding:0;width:min(440px,calc(100vw - 24px));max-height:calc(100dvh - 24px)}
.iv-native-dialog::backdrop{background:rgba(9,9,11,.72)}
.iv-native-dialog .dialog-top{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #27272a}
.iv-native-dialog h2{margin:0;font-size:16px}
.iv-native-dialog .dialog-top button{background:transparent;color:#a1a1aa;border:0;font-size:20px}
.iv-native-body{padding:16px;display:flex;flex-direction:column;gap:10px}
.iv-native-body p,.iv-native-body label{margin:0;color:#a1a1aa;font-size:13px}
.iv-native-body input{width:100%;box-sizing:border-box;margin-top:6px;background:#09090b;color:#fafafa;border:1px solid #27272a;border-radius:8px;padding:8px 10px}
.iv-native-body button{align-self:flex-start;background:#6e79d6;color:#fff;border:0;border-radius:8px;padding:8px 12px}
.iv-native-dialog [role=status]{margin:0;padding:0 16px 14px;color:#a1a1aa;font-size:12px}
`;
 document.head.append(style);
 const bar=document.createElement('div');
 bar.id='ivNativeBar';
 const updates=document.createElement('button');
 updates.type='button';
 updates.textContent='Updates';
 const settings=document.createElement('button');
 settings.type='button';
 settings.textContent='Server';
 bar.append(updates,settings);
 document.body.append(bar);
 const modal=document.createElement('dialog');
 modal.className='iv-native-dialog';
 document.body.append(modal);
 const E=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 let busy=false;
 function open(title){
  modal.replaceChildren();
  const h=E('div');h.className='dialog-top';
  const t=E('h2',title),x=E('button','×');
  x.type='button';
  x.onclick=()=>{if(!busy)modal.close();};
  h.append(t,x);
  const body=E('div');body.className='iv-native-body';
  const status=E('p');status.setAttribute('role','status');
  modal.append(h,body,status);
  if(!modal.open)modal.showModal();
  return {body,status};
 }
 const button=(label,fn)=>{
  const b=E('button',label);b.type='button';
  b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){statusAlert(e);}finally{b.disabled=false;}};
  return b;
 };
 function statusAlert(e){alert(e&&e.message?e.message:String(e));}
 async function showUpdates(){
  const {body,status}=open('App updates');
  const r=await shell.checkUpdates();
  const store=config.platform==='ios'?'Apple App Store':config.platform==='android'?'Google Play':'platform app store';
  body.append(E('p','Installed '+config.nativeVersion+'. Updates come through '+store+'. This build does not download a replacement studio.'));
  body.append(E('p',r.url?'Store listing configured.':'The store listing URL is set after the first approved release. Signing keys are not in the app.'));
  body.append(button('Open store listing',async()=>{busy=true;try{await shell.installUpdate();status.textContent='Opened '+store+'.';}finally{busy=false;}}));
 }
 async function showSettings(){
  const {body,status}=open('Account server');
  body.append(E('p','Projects stay on this device unless you export them. Changing the account server signs this device out.'));
  const label=E('label','HTTPS origin'),input=E('input');
  input.value=config.serverOrigin;
  label.append(input);
  body.append(label);
  body.append(button('Check server',async()=>{status.textContent='Checking…';status.textContent=(await shell.hostCheck({serverOrigin:input.value.trim()})).message;}));
  body.append(button('Save server and reload',async()=>{if(!confirm('Save this account server? You will be signed out if the origin changes.'))return;await shell.configure({serverOrigin:input.value.trim(),protocol:'device-v1'});}));
 }
 updates.onclick=()=>{void showUpdates();};
 settings.onclick=()=>{void showSettings();};
 window.ivOpenNativeUpdates=showUpdates;
 return {updates:showUpdates,settings:showSettings};
}
