export async function mountMobileChrome(){
 const shell=window.ivShell,config=await shell.config();
 const top=document.querySelector('.account-actions')||document.body;
 const host=document.createElement('button');host.id='mobileHostSettings';host.textContent='Settings';top.prepend(host);
 const updates=document.createElement('button');updates.id='mobileUpdates';updates.textContent='Updates';top.prepend(updates);
 const modal=document.createElement('dialog');modal.className='detail-dialog mobile-native-dialog';document.body.append(modal);
 const E=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 let busy=false;
 function open(title){modal.replaceChildren();const h=E('div');h.className='dialog-top';const t=E('h2',title),x=E('button','×');x.onclick=()=>{if(!busy)modal.close();};h.append(t,x);const body=E('div');body.className='mobile-native-body';const status=E('p');status.setAttribute('role','status');modal.append(h,body,status);if(!modal.open)modal.showModal();return {body,status};}
 const button=(label,fn)=>{const b=E('button',label);b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){alert(e.message);}finally{b.disabled=false;}};return b;};
 async function showUpdates(){const {body,status}=open('App updates');const r=await shell.checkUpdates();const store=config.platform==='ios'?'Apple App Store':config.platform==='android'?'Google Play':'platform app store';body.append(E('p','Installed '+config.nativeVersion+'. Updates come through '+store+' so signing and rollback stay under the store account.'));body.append(E('p',r.url?'Store listing configured.':'The store listing URL will be configured after the first approved release.'));body.append(button('Open store listing',async()=>{busy=true;try{await shell.installUpdate();status.textContent='Opened '+store+'.';}finally{busy=false;}}));}
 async function showSettings(){const {body,status}=open('Mobile app settings');body.append(E('p','Projects and recordings stay on this device unless you explicitly export or join collaboration. Changing account servers signs this device out; export a project backup first.'));const label=E('label','Account server HTTPS origin'),input=E('input');input.value=config.serverOrigin;label.className='field';label.append(input);body.append(label);body.append(button('Check server',async()=>{status.textContent='Checking…';status.textContent=(await shell.hostCheck({serverOrigin:input.value.trim()})).message;}));body.append(button('Save server & reload',async()=>{if(!confirm('Save this account server? You will be signed out if the origin changes.'))return;await shell.configure({serverOrigin:input.value.trim(),protocol:'device-v1'});}));}
 updates.onclick=showUpdates;host.onclick=showSettings;
 const attach=()=>{const b=document.getElementById('studioUpdates');if(b)b.onclick=showUpdates;};new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});attach();
 const bar=E('nav');bar.className='mobile-tabbar';bar.setAttribute('aria-label','Mobile studio shortcuts');
 const jump=(label,fn)=>{const b=E('button',label);b.onclick=()=>{try{fn();}catch(e){alert(e.message);}};bar.append(b);};
 jump('Studio',()=>document.querySelector('.arrangement')?.scrollIntoView({behavior:'smooth',block:'start'}));
 jump('Tracks',()=>document.querySelector('.track-library')?.scrollIntoView({behavior:'smooth',block:'start'}));
 jump('Record',()=>document.getElementById('record')?.click());
 jump('Mix',()=>document.getElementById('core3Mixer')?.click());
 jump('Producer',()=>document.getElementById('core5Producer')?.click());
 document.body.append(bar);
 window.ivOpenNativeUpdates=showUpdates;return {updates:showUpdates,settings:showSettings};
}
