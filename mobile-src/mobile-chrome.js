import {canUse, clientSignal, featureById, lockBody} from './entitlements.js';

export async function mountMobileChrome(){
 const shell=window.ivShell,config=await shell.config();
 const top=document.querySelector('.account-actions')||document.body;
 const host=document.createElement('button');host.id='mobileHostSettings';host.type='button';host.textContent='Settings';host.setAttribute('aria-label','Mobile settings');top.prepend(host);
 const updates=document.createElement('button');updates.id='mobileUpdates';updates.type='button';updates.textContent='Updates';updates.setAttribute('aria-label','App store updates');top.prepend(updates);
 const store=document.createElement('button');store.id='mobileStore';store.type='button';store.textContent='Store';store.setAttribute('aria-label','Studio Plus store');top.prepend(store);
 const account=document.createElement('button');account.id='mobileNationAccount';account.type='button';account.textContent='Account';account.setAttribute('aria-label','InfectedNation account');top.prepend(account);
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
  const b=E('button',label);b.type='button';
  if(primary===true)b.className='primary';
  else if(primary==='apple')b.className='apple-auth';
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
 async function authAction(flow,method){
  busy=true;
  try{await shell.signIn({flow,method});location.reload();}
  finally{busy=false;}
 }
 function keepHidden(target){
  const hide=()=>{if(!target.hidden)target.hidden=true;};
  hide();
  new MutationObserver(hide).observe(target,{attributes:true,attributeFilter:['hidden']});
 }
 function authChoices(target){
  if(!target||target.querySelector('.infected-auth-choices'))return;
  const box=E('section');box.className='infected-auth-choices';
  const createTitle=E('h3','Create an InfectedNation account');
  const create=E('div');create.className='infected-auth-grid';
  for(const [method,label] of [['apple','Apple signup'],['google','Google signup'],['android','Android / passkey signup'],['email','Email signup']])create.append(button(label,()=>authAction('signup',method),method==='apple'?'apple':false));
  const loginTitle=E('h3','Already have an account?');
  const login=E('div');login.className='infected-auth-grid';
  for(const [method,label] of [['apple','Apple login'],['google','Google login'],['android','Android / passkey login'],['email','Email login']])login.append(button(label,()=>authAction('login',method),method==='apple'?'apple':false));
  box.append(createTitle,create,loginTitle,login);
  target.prepend(box);
 }
 const loginSection=document.querySelector('#loginWall section');
 const signIn=document.getElementById('signIn');
 if(loginSection){if(signIn)keepHidden(signIn);authChoices(loginSection);}
 const classicWall=document.getElementById('labLoginWall');
 const labHero=document.getElementById('labSignInHero');
 if(classicWall){if(labHero)keepHidden(labHero);authChoices(classicWall);}
 const platformLabel=config.platform==='ios'?'iPhone / iPad':config.platform==='android'?'Android':'this device';
 const storeName=config.platform==='ios'?'Apple App Store':config.platform==='android'?'Google Play':'platform app store';
 async function showStore(){
  const {body,status}=open('Store','Studio Plus');
  let user=null;try{user=await shell.user();}catch{}
  if(!user){body.append(E('p','Sign in to InfectedNation before purchasing or restoring Studio Plus.'));return;}
  body.append(E('p','iPhone/iPad purchases use Apple In-App Purchase. Android purchases use Google Play Billing. Stripe is not used inside the mobile apps.'));
  let catalog=null;
  try{catalog=await shell.storeSummary();}catch(e){catalog=null;status.textContent=e.message||'Store billing is not available on this device.';}
  const offers=catalog?[
    ['basic','Basic','$20',catalog.basic],
    ['pro','Pro','$40',catalog.pro]
  ]:[['basic','Basic','$20',null],['pro','Pro','$40',null]];
  let any=false;
  for(const [id,name,price,info] of offers){
    if(info?.available){
      any=true;
      body.append(E('h3',(info.title||name)+(info.price?(' · '+info.price):(' · '+price))));
      body.append(button('Get '+name+' — '+price,async()=>{
        busy=true;status.textContent='Opening the store…';
        try{
          await shell.purchaseSubscription(id);
          status.textContent='Purchase verified. Refreshing access…';
          setTimeout(()=>location.reload(),500);
        }catch(e){status.textContent=e.message||'The purchase could not be completed.';}
        finally{busy=false;}
      },true));
    }else body.append(E('p',name+' is not on this device yet.'));
  }
  if(!any)body.append(E('p','Free has no in-app product. Basic and Pro appear here when the store catalog returns them.'));
  body.append(
    button('Restore purchases',async()=>{busy=true;status.textContent='Checking your store account…';try{await shell.restorePurchases();status.textContent='Purchase restored and verified.';setTimeout(()=>location.reload(),500);}catch(e){status.textContent=e.message||'No store purchase could be restored.';}finally{busy=false;}}),
    button('Manage subscription',async()=>{try{await shell.manageSubscription();status.textContent='Opened your platform subscription settings.';}catch(e){status.textContent=e.message||'Store billing is not available on this device.';}})
  );
 }
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
  const block=section('HTTPS origin','Projects and recordings stay on this device unless you explicitly export or join collaboration. Only an HTTPS Studio origin is accepted.');
  block.append(E('p','Studio: '+config.serverOrigin));
  block.append(E('p','Identity: '+(config.nationOrigin||'https://nation.infectedvoices.space')));
  const input=E('input');input.type='url';input.inputMode='url';input.autocomplete='off';input.spellcheck=false;input.value=config.serverOrigin;input.setAttribute('aria-label','Studio server HTTPS origin');input.placeholder='https://';
  const label=E('label');label.className='iv-field';const cap=E('span','Studio server HTTPS origin');cap.className='iv-field-label';label.append(cap,input);
  const meta=E('p',platformLabel+' · '+config.nativeVersion+' · device-v1');meta.className='iv-sheet-meta';
  block.append(label,actions(
   button('Check RedXAIHost Studio',async()=>{status.textContent='Checking…';status.textContent=(await shell.hostCheck({serverOrigin:input.value.trim()})).message;}),
   button('Save Studio server & reload',async()=>{if(!confirm('Save this Studio server? Export a project backup first if you have unsaved work.'))return;await shell.configure({serverOrigin:input.value.trim(),protocol:'device-v1'});},true)
  ),meta);
  body.append(block);
 }
 updates.onclick=showUpdates;host.onclick=showSettings;store.onclick=showStore;account.onclick=()=>shell.openExternal((config.nationOrigin||'https://nation.infectedvoices.space')+'/');
 const attach=()=>{const b=document.getElementById('studioUpdates');if(b&&b.dataset.ivBound!=='1'){b.dataset.ivBound='1';b.onclick=showUpdates;}};
 new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});attach();
 const meters=E('div');meters.id='ivMeters';meters.className='iv-meters';meters.setAttribute('aria-label','Producer meters');
 const trackPeak=E('span','Track peak —');trackPeak.id='ivTrackPeak';
 const masterPeak=E('span','Master peak —');masterPeak.id='ivMasterPeak';
 const masterLoud=E('span','LUFS — · true peak —');masterLoud.id='ivMasterLufs';
 meters.append(trackPeak,masterPeak,masterLoud);document.body.append(meters);
 function syncMeters(){
  const fill=document.getElementById('meterFill');
  const width=fill?parseFloat(fill.style.width)||0:0;
  if(width>0){
    const db=20*Math.log10(Math.max(1e-8,width/100));
    trackPeak.textContent='Track peak '+db.toFixed(1)+' dBFS'+(db>=-0.1?' · CLIP':'');
  }
  const status=document.getElementById('status')?.textContent||'';
  if(status.includes('Delivery note:')){
    const sample=status.match(/sample peak [^·]+/);
    const lufs=status.match(/integrated [^·]+/);
    const dbtp=status.match(/true peak [^·]+/);
    if(sample)masterPeak.textContent='Master '+sample[0];
    masterLoud.textContent=(lufs?lufs[0]:'LUFS —')+(dbtp?' · '+dbtp[0]:'');
  }
 }
 setInterval(syncMeters,250);
 const bar=E('nav');bar.className='mobile-tabbar';bar.setAttribute('aria-label','Mobile studio shortcuts');bar.hidden=true;
 const svg=(paths)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
 const icons={
  arrange:svg('<path d="M4 15c2-6 4-6 6 0s4 6 6 0 4-6 4 0"/>'),
  tracks:svg('<path d="M5 7h14M5 12h14M5 17h14"/><path d="M8 7v10M16 7v10"/>'),
  mix:svg('<path d="M6 4v16M12 4v16M18 4v16"/><circle cx="6" cy="9" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="15" r="2" fill="currentColor" stroke="none"/><circle cx="18" cy="8" r="2" fill="currentColor" stroke="none"/>'),
  tune:svg('<circle cx="12" cy="12" r="3"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2"/>'),
  more:svg('<circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/>'),
  export:svg('<path d="M12 4v11M8 8l4-4 4 4M5 20h14"/>')
 };
 const arrangement=!!document.querySelector('.arrangement');
 function clickStage(index){document.querySelectorAll('#steps button')[index]?.click();}
 function openFeatures(){
  const {body}=open('Core 5','More');
  const search=E('input');search.type='search';search.placeholder='Search features';search.setAttribute('aria-label','Search features');search.enterKeyHint='search';
  const list=E('div');list.className='iv-more-list';
  const go=fn=>()=>{const run=()=>fn();if(modal.open){modal.addEventListener('close',run,{once:true});modal.close();}else run();};
  const gate=(featureId,fn)=>go(()=>{
    if(canUse(featureId, clientSignal())){fn();return;}
    const feature=featureById(featureId);
    if(typeof window.ivOpenLock==='function'){window.ivOpenLock(featureId);return;}
    alert(lockBody(feature?.name||'This feature', featureId));
  });
  const items=arrangement?[
   ['Record',go(()=>document.getElementById('record')?.click())],
   ['Producer',gate('core5',()=>document.getElementById('core5Producer')?.click())],
   ['GRIM rack',gate('grim',()=>document.getElementById('core5Producer')?.click())],
   ['Automation',gate('core5',()=>document.getElementById('core5Producer')?.click())],
   ['Sidechain',gate('core5',()=>document.getElementById('core5Producer')?.click())],
   ['Precision Tune',gate('precision',()=>clickStage(4))],
   ['Precision Pocket',gate('precision_pocket',()=>clickStage(3))],
   ['Project Lab',gate('project-lab',()=>{location.href='index.html#lab';})],
   ['Pocket',go(()=>clickStage(3))],
   ['Mastering',gate('core5_master',()=>clickStage(6))],
   ['Export',go(()=>clickStage(7))],
   ['Plugins',go(()=>document.getElementById('pluginsTab')?.click())],
   ['Release & connect',go(()=>document.getElementById('integrationsTab')?.click())],
   ['AI tools',go(()=>document.getElementById('aiTab')?.click())],
   ['Tutorial',go(()=>document.getElementById('tutorial')?.click())],
   ['Saved projects',go(()=>document.getElementById('openSaved')?.click())],
   ['Classic Studio',go(()=>{location.href='lab/index.html';})],
   ['Vocal Lab',go(()=>{location.href='index.html';})],
   ['Studio Plus',go(showStore)],
   ['Settings',go(showSettings)],
   ['App updates',go(showUpdates)]
  ]:[
   ['Timing',go(()=>scrollTo('.panel.timing'))],
   ['Record',go(()=>document.getElementById('record')?.click())],
   ['Tune',go(()=>scrollTo('.panel.sound'))],
   ['Mix',go(()=>scrollTo('.mixbox'))],
   ['Export',go(()=>scrollTo('.panel.export'))],
   ['Arrangement Studio',go(()=>{location.href='../studio.html';})],
   ['Vocal Lab',go(()=>{location.href='../index.html';})],
   ['Studio Plus',go(showStore)],
   ['Settings',go(showSettings)],
   ['App updates',go(showUpdates)]
  ];
  const paint=()=>{
   const query=search.value.trim().toLowerCase();
   list.replaceChildren();
   for(const [label,fn] of items){
    if(query&&!label.toLowerCase().includes(query))continue;
    const b=E('button',label);b.type='button';b.onclick=fn;list.append(b);
   }
   if(!list.childElementCount)list.append(E('p','No matching features'));
  };
  search.oninput=paint;paint();body.append(search,list);
 }
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
 if(arrangement){
  const vocal=E('button','Vocal Lab');vocal.type='button';vocal.id='ivVocalLab';vocal.onclick=()=>{location.href='index.html';};
  document.querySelector('.top-nav')?.append(vocal);
 }
 if(arrangement){
  tab('arrange','Arrange',icons.arrange,()=>scrollTo('.arrangement'));
  tab('tracks','Tracks',icons.tracks,()=>scrollTo('.track-library'));
  tab('mix','Mix',icons.mix,()=>{const b=document.getElementById('core3Mixer');if(b)b.click();else scrollTo('.inspector');});
  tab('tune','Tune',icons.tune,()=>clickStage(4));
  tab('more','More',icons.more,()=>openFeatures(),{action:true});
  activate('arrange');
 }else{
  tab('arrange','Arrange',icons.arrange,()=>scrollTo('.panel.arrange'));
  tab('tune','Tune',icons.tune,()=>scrollTo('.panel.sound'));
  tab('mix','Mix',icons.mix,()=>scrollTo(document.querySelector('.mixbox')?'.mixbox':'.panel'));
  tab('export','Export',icons.export,()=>scrollTo('.panel.export'));
  tab('more','More',icons.more,()=>openFeatures(),{action:true});
  activate('arrange');
 }
 document.body.append(bar);
 const recordButton=document.getElementById('record');
 const markRecording=()=>bar.querySelector('[data-tab="more"]')?.classList.toggle('is-recording',!!recordButton?.classList.contains('active'));
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
  window.ivOpenNativeStore=showStore;
  window.ivStartStoreTrial=kind=>shell.purchaseSubscription(kind,'trial');
  return {updates:showUpdates,settings:showSettings,store:showStore};
}
