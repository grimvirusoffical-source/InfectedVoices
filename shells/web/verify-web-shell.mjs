// Asserts the built web shell (browser-dist/) carries the Core pin and every parity marker from Casey's bar.
// Reads build output only; it never edits Core.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const out=path.join(root,'browser-dist');
const pin=JSON.parse(await fs.readFile(path.join(here,'core-pin.json'),'utf8'));
const fail=m=>{throw Error('[web-shell] '+m);};

const stamp=JSON.parse(await fs.readFile(path.join(out,'core-pin.json'),'utf8').catch(()=>fail('browser-dist/core-pin.json missing; run the shell build.')));
if(stamp.core!==pin.core)fail(`Built shell is stamped ${stamp.core}, pin is ${pin.core}.`);
if(stamp.pinned!==true&&process.env.WEB_SHELL_ALLOW_UNPINNED!=='1')fail('Built shell is UNPINNED.');

for(const rel of ['index.html','studio.html','api.js','auth-choices.js','workstation/app.js','lab/index.html','lab/account-entry.js','favicon.svg','manifest.webmanifest','bungee-processor-bundled.js','audio-processor.worker.bundle.js','get/index.html','download/index.html']){
  const st=await fs.stat(path.join(out,rel)).catch(()=>null);
  if(!st?.isFile()||st.size<20)fail('Missing web shell file: '+rel);
}
const index=await fs.readFile(path.join(out,'index.html'),'utf8');
if(!index.includes(`content="${pin.studioVersion}"`))fail('index.html is not the canonical studio '+pin.studioVersion);
const scripts=[...index.matchAll(/src="\.\/(assets\/[^"]+\.js)"/g)].map(m=>m[1]);
if(!scripts.length)fail('index.html does not load a studio bundle.');
const bundle=(await Promise.all(scripts.map(s=>fs.readFile(path.join(out,s),'utf8')))).join('\n');

// Same data-testids as the browser studio (TIER_TEST_IDS in studio/src/lib/tierUiHooks.ts).
const testIds=['feature-lock','feature-lock-','trial-cta-basic','trial-cta-pro','export-bit-depth','password-hint','upgrade-cta','subscribe-panel'];
// Feature markers from the canonical StudioApp. Minified identifiers are not stable, so these are user-facing strings.
const markers={
  'plan prices':['Basic $20','Pro $40'],
  'export bit depth':['-bit · locked','16-bit WAV','48 kHz · 24-bit WAV'],
  'GRIM chain':['Tone (GRIM)','Grim abyss','GRIM settings as the live engine'],
  'Mic Master':['Ultimate Mic Master','Quick Mic Master'],
  'loop save':['Apply loop points','then save the pass'],
  'metronome out of export':['metronome stays cue-only','cue metronome stays out of the bounce'],
  'realtime + offline auto-tune':['Offline autotune','ai_autotune'],
  // useEntitlements focus path -> readCachedEntitlements (fail-closed to Free after the 15 min offline TTL).
  'offline entitlement fallback':['fetchedAt','window.addEventListener(`focus`'],
};
const missing=[];
for(const id of testIds)if(!bundle.includes(id))missing.push('testid '+id);
for(const [k,list] of Object.entries(markers))for(const m of list)if(!bundle.includes(m))missing.push(`${k}: "${m}"`);
if(missing.length)fail('Parity markers missing from built bundle:\n  '+missing.join('\n  '));

const api=await fs.readFile(path.join(out,'api.js'),'utf8');
for(const m of ['infectednation_session','emailLogin','iv-auth-request'])if(!api.includes(m))fail('Browser account adapter missing '+m);
console.log(JSON.stringify({ok:true,shell:'web',core:pin.coreShort,testIds:testIds.length,markerGroups:Object.keys(markers).length,bundles:scripts.length,bundleBytes:bundle.length}));
