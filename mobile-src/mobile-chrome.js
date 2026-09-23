export async function mountMobileChrome(){
 const shell=window.ivShell,config=await shell.config();
 const E=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const top=document.querySelector('.account-actions')||document.body;
 const host=E('button','Settings');host.id='mobileHostSettings';top.prepend(host);
 const updates=E('button','Updates');updates.id='mobileUpdates';top.prepend(updates);
 const store=E('button','Store');store.id='mobileStore';top.prepend(store);
 const account=E('button','Account');account.id='mobileNationAccount';top.prepend(account);
 const modal=E('dialog');modal.className='detail-dialog mobile-native-dialog';document.body.append(modal);
 let busy=false;
 function open(title){modal.replaceChildren();const h=E('div');h.className='dialog-top';const t=E('h2',title),x=E('button','×');x.onclick=()=>{if(!busy)modal.close();};h.append(t,x);const body=E('div');body.className='mobile-native-body';const status=E('p');status.setAttribute('role','status');modal.append(h,body,status);if(!modal.open)modal.showModal();return {body,status};}
 const button=(label,fn,className='')=>{const b=E('button',label);if(className)b.className=className;b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){alert(e.message);}finally{b.disabled=false;}};return b;};
 async function authAction(flow,method){
   busy=true;
   try{await shell.signIn({flow,method});location.reload();}
   finally{busy=false;}
 }
 function authChoices(target){
   if(!target||target.querySelector('.infected-auth-choices'))return;
   const box=E('section');box.className='infected-auth-choices';
   const createTitle=E('h3','Create an InfectedNation account');
   const create=E('div');create.className='infected-auth-grid';
   for(const [method,label] of [['apple','Apple signup'],['google','Google signup'],['android','Android / passkey signup'],['email','Email signup']])create.append(button(label,()=>authAction('signup',method),method==='apple'?'apple-auth':''));
   const loginTitle=E('h3','Already have an account?');
   const login=E('div');login.className='infected-auth-grid';
   for(const [method,label] of [['apple','Apple login'],['google','Google login'],['android','Android / passkey login'],['email','Email login']])login.append(button(label,()=>authAction('login',method),method==='apple'?'apple-auth':''));
   box.append(createTitle,create,loginTitle,login);
   target.prepend(box);
 }
 const loginSection=document.querySelector('#loginWall section');
 if(loginSection){document.getElementById('signIn')?.setAttribute('hidden','');authChoices(loginSection);}
 const classicWall=document.getElementById('labLoginWall');
 if(classicWall){document.getElementById('labSignInHero')?.setAttribute('hidden','');authChoices(classicWall);}
 async function showStore(){
   const {body,status}=open('Studio Plus');
   let user=null;try{user=await shell.user();}catch{}
   if(!user){body.append(E('p','Sign in to InfectedNation before purchasing or restoring Studio Plus.'));return;}
   body.append(E('p','iPhone/iPad purchases use Apple In-App Purchase. Android purchases use Google Play Billing. Stripe is not used inside the mobile apps.'));
   try{
     const info=await shell.storeSummary();
     const price=info.price?(' · '+info.price):'';
     body.append(E('h3',(info.title||'Infected Voices Studio Plus')+price));
   }catch(e){body.append(E('p','The store product is not available yet: '+e.message));}
   body.append(
     button('Subscribe',async()=>{busy=true;status.textContent='Opening the store…';try{await shell.purchaseSubscription();status.textContent='Purchase verified. Refreshing access…';setTimeout(()=>location.reload(),500);}finally{busy=false;}},'primary'),
     button('Restore purchases',async()=>{busy=true;status.textContent='Checking your store account…';try{await shell.restorePurchases();status.textContent='Purchase restored and verified.';setTimeout(()=>location.reload(),500);}finally{busy=false;}}),
     button('Manage subscription',async()=>{await shell.manageSubscription();status.textContent='Opened your platform subscription settings.';})
   );
 }
 async function showUpdates(){const {body,status}=open('App updates');const r=await shell.checkUpdates();const storeName=config.platform==='ios'?'Apple App Store':config.platform==='android'?'Google Play':'platform app store';body.append(E('p','Installed '+config.nativeVersion+'. Updates come through '+storeName+' so signing and rollback stay under the store account.'));body.append(E('p',r.url?'Store listing configured.':'The store listing URL will be configured after the first approved release.'));body.append(button('Open store listing',async()=>{busy=true;try{await shell.installUpdate();status.textContent='Opened '+storeName+'.';}finally{busy=false;}}));}
 async function showSettings(){const {body,status}=open('Mobile app settings');body.append(E('p','Studio: '+config.serverOrigin));body.append(E('p','Identity: '+config.nationOrigin));body.append(E('p','Projects and recordings stay on this device unless you explicitly export or join collaboration.'));const label=E('label','Studio server HTTPS origin'),input=E('input');input.value=config.serverOrigin;label.className='field';label.append(input);body.append(label);body.append(button('Check RedXAIHost Studio',async()=>{status.textContent='Checking…';status.textContent=(await shell.hostCheck({serverOrigin:input.value.trim()})).message;}));body.append(button('Save Studio server & reload',async()=>{if(!confirm('Save this Studio server? Export a project backup first if you have unsaved work.'))return;await shell.configure({serverOrigin:input.value.trim(),protocol:'device-v1'});}));}
 updates.onclick=showUpdates;host.onclick=showSettings;store.onclick=showStore;account.onclick=()=>shell.openExternal(config.nationOrigin+'/');
 window.ivOpenNativeUpdates=showUpdates;window.ivOpenNativeStore=showStore;
 const attach=()=>{const b=document.getElementById('studioUpdates');if(b)b.onclick=showUpdates;};new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});attach();
 const bar=E('nav');bar.className='mobile-tabbar';bar.setAttribute('aria-label','Mobile studio shortcuts');
 const jump=(label,fn)=>{const b=E('button',label);b.onclick=()=>{try{fn();}catch(e){alert(e.message);}};bar.append(b);};
 jump('Studio',()=>document.querySelector('.arrangement')?.scrollIntoView({behavior:'smooth',block:'start'}));
 jump('Tracks',()=>document.querySelector('.track-library')?.scrollIntoView({behavior:'smooth',block:'start'}));
 jump('Record',()=>document.getElementById('record')?.click());
 jump('Mix',()=>document.getElementById('core3Mixer')?.click());
 jump('Producer',()=>document.getElementById('core5Producer')?.click());
 document.body.append(bar);
 return {updates:showUpdates,settings:showSettings,store:showStore};
}
