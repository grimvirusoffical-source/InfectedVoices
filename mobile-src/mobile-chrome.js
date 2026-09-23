export async function mountMobileChrome(){
 const shell=window.ivShell,config=await shell.config();
 const top=document.querySelector('.account-actions')||document.body;
 const host=document.createElement('button');host.id='mobileHostSettings';host.type='button';host.textContent='Settings';host.setAttribute('aria-label','Mobile settings');top.prepend(host);
 const updates=document.createElement('button');updates.id='mobileUpdates';updates.type='button';updates.textContent='Updates';updates.setAttribute('aria-label','App store updates');top.prepend(updates);
 const modal=document.createElement('dialog');modal.className='detail-dialog mobile-native-dialog';document.body.append(modal);
 const E=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 let busy=false;
 function open(kicker,title){
  modal.replaceChildren();
  const h=E('div');h.className='dialog-top iv-sheet-top';
  const titles=E('div');titles.className='iv-sheet-titles';
  const k=E('p',kicker);k.className='iv-kicker';
  const t=E('h2',title);
  titles.append(k,t);
  const x=E('button','Close');x.type='button';x.className='iv-sheet-close';x.setAttribute('aria-label','Close');x.onclick=()=>{if(!busy)modal.close();};
  h.append(titles,x);
  const body=E('div');body.className='mobile-native-body';
  const status=E('p');status.setAttribute('role','status');
  modal.append(h,body,status);
  if(!modal.open)modal.showModal();
  return {body,status};
 }
 const button=(label,fn,primary)=>{
  const b=E('button',label);b.type='button';if(primary)b.className='primary';
  b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){alert(e.message);}finally{b.disabled=false;}};
  return b;
 };
 function section(title,copy){
  const s=E('section');s.className='iv-sheet-section';
  s.append(E('h3',title));
  if(copy){const p=E('p',copy);p.className='iv-sheet-copy';s.append(p);}
  return s;
 }
 function actions(...nodes){const row=E('div');row.className='iv-sheet-actions';row.append(...nodes);return row;}
 const platformLabel=config.platform==='ios'?'iPhone / iPad':config.platform==='android'?'Android':'this device';
 const storeName=config.platform==='ios'?'Apple App Store':config.platform==='android'?'Google Play':'platform app store';
 async function showUpdates(){
  const {body,status}=open('Store updates','App updates');
  const block=section('Installed build','Version '+config.nativeVersion+' on '+platformLabel+'. Updates come through the '+storeName+' so signing and rollback stay with the store account.');
  const listing=await shell.checkUpdates();
  block.append(E('p',listing.url?'Store listing configured.':'The store listing URL will be configured after the first approved release.'));
  block.append(actions(button('Open store listing',async()=>{busy=true;try{await shell.installUpdate();status.textContent='Opened '+storeName+'.';}finally{busy=false;}},true)));
  body.append(block);
 }
 async function showSettings(){
  const {body,status}=open('Mobile settings','Account server');
  const block=section('HTTPS origin','Projects and recordings stay on this device unless you explicitly export them. Changing account servers signs this device out. Export a project backup first. Only an HTTPS origin is accepted.');
  const input=E('input');input.type='url';input.inputMode='url';input.autocomplete='off';input.spellcheck=false;input.value=config.serverOrigin;input.setAttribute('aria-label','Account server HTTPS origin');input.placeholder='https://';
  const label=E('label');label.className='iv-field';const cap=E('span','Account server HTTPS origin');cap.className='iv-field-label';label.append(cap,input);
  const meta=E('p',platformLabel+' · '+config.nativeVersion+' · device-v1');meta.className='iv-sheet-meta';
  block.append(label,actions(
   button('Check server',async()=>{status.textContent='Checking…';status.textContent=(await shell.hostCheck({serverOrigin:input.value.trim()})).message;}),
   button('Save server & reload',async()=>{if(!confirm('Save this account server? You will be signed out if the origin changes.'))return;await shell.configure({serverOrigin:input.value.trim(),protocol:'device-v1'});},true)
  ),meta);
  body.append(block);
 }
 updates.onclick=showUpdates;host.onclick=showSettings;
 const attach=()=>{const b=document.getElementById('studioUpdates');if(b&&b.dataset.ivBound!=='1'){b.dataset.ivBound='1';b.onclick=showUpdates;}};
 new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});attach();
 const bar=E('nav');bar.className='mobile-tabbar';bar.setAttribute('aria-label','Mobile studio shortcuts');bar.hidden=true;
 const svg=(paths)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
 const icons={
  studio:svg('<path d="M4 7h16M4 12h16M4 17h10"/>'),
  tracks:svg('<path d="M5 7h14M5 12h14M5 17h14"/><path d="M8 7v10M16 7v10"/>'),
  record:svg('<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8"/>'),
  mix:svg('<path d="M6 4v16M12 4v16M18 4v16"/><circle cx="6" cy="9" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="15" r="2" fill="currentColor" stroke="none"/><circle cx="18" cy="8" r="2" fill="currentColor" stroke="none"/>'),
  producer:svg('<path d="M5 16l4-8 3 5 3-6 4 9"/>'),
  arrange:svg('<path d="M4 15c2-6 4-6 6 0s4 6 6 0 4-6 4 0"/>'),
  sound:svg('<circle cx="12" cy="12" r="3"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2"/>'),
  timing:svg('<circle cx="12" cy="13" r="7"/><path d="M12 10v4l2 2M9 4h6"/>'),
  export:svg('<path d="M12 4v11M8 8l4-4 4 4M5 20h14"/>')
 };
 function activate(id){for(const b of bar.querySelectorAll('button')){const on=b.dataset.tab===id;b.classList.toggle('is-current',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}}
 function tab(id,label,icon,fn,{action=false}={}){
  const b=E('button');b.type='button';b.className='mobile-tab';b.dataset.tab=id;
  const glyph=E('span');glyph.className='mobile-tab-icon';glyph.innerHTML=icon;
  const text=E('span',label);text.className='mobile-tab-label';
  b.append(glyph,text);
  b.onclick=()=>{try{fn();if(!action)activate(id);}catch(e){alert(e.message);}};
  bar.append(b);
 }
 const scrollTo=sel=>document.querySelector(sel)?.scrollIntoView({behavior:'smooth',block:'start'});
 if(document.querySelector('.arrangement')){
  tab('studio','Studio',icons.studio,()=>scrollTo('.arrangement'));
  tab('tracks','Tracks',icons.tracks,()=>scrollTo('.track-library'));
  tab('record','Record',icons.record,()=>document.getElementById('record')?.click(),{action:true});
  tab('mix','Mix',icons.mix,()=>{const b=document.getElementById('core3Mixer');if(b)b.click();else scrollTo('.inspector');});
  tab('producer','Producer',icons.producer,()=>{const b=document.getElementById('core5Producer');if(b)b.click();else scrollTo('.inspector');});
  activate('studio');
 }else{
  tab('arrange','Arrange',icons.arrange,()=>scrollTo('.panel.arrange'));
  tab('sound','Sound',icons.sound,()=>scrollTo('.panel.sound'));
  tab('timing','Timing',icons.timing,()=>scrollTo('.panel.timing'));
  tab('record','Record',icons.record,()=>document.getElementById('record')?.click(),{action:true});
  tab('export','Export',icons.export,()=>scrollTo('.panel.export'));
  activate('arrange');
 }
 document.body.append(bar);
 const recordButton=document.getElementById('record');
 const markRecording=()=>bar.querySelector('[data-tab="record"]')?.classList.toggle('is-recording',!!recordButton?.classList.contains('active'));
 if(recordButton)new MutationObserver(markRecording).observe(recordButton,{attributes:true,attributeFilter:['class']});
 function workspaceReady(){
  const studio=document.getElementById('appShell');
  const classic=document.getElementById('studioShell');
  if(studio)return !studio.hidden;
  if(classic)return !classic.hidden;
  return true;
 }
 function syncTabbar(){const on=workspaceReady();bar.hidden=!on;document.body.classList.toggle('iv-tabbar-on',on);}
 const shellNode=document.getElementById('appShell')||document.getElementById('studioShell');
 if(shellNode)new MutationObserver(syncTabbar).observe(shellNode,{attributes:true,attributeFilter:['hidden']});
  syncTabbar();
  const {mountCreate}=await import('./mobile-create.js');
  await mountCreate({shell,config});
  window.ivOpenNativeUpdates=showUpdates;
  return {updates:showUpdates,settings:showSettings};
}
