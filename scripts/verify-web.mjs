import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const required=['studio.html','index.html','mobile-entry.js','mobile-shell.js','mobile.css','vocal-bridge.js','bungee-processor-bundled.js','workstation/app.js','workstation/producer-ui.js','workstation/precision-ui.js','workstation/mixer-ui.js','lab/index.html','lab/mobile-classic.js','lab/studio-runtime.js','lab/mp3-codec.js'];
for(const rel of required){const p=path.join(dist,rel);const st=await fs.stat(p).catch(()=>null);if(!st?.isFile()||st.size<20)throw Error('Missing native web payload: '+rel);}
const studio=await fs.readFile(path.join(dist,'studio.html'),'utf8');
if(!studio.includes("mobile-entry.js")||!studio.includes('mobile.css'))throw Error('Studio is not using mobile entry/CSS.');
if(studio.includes("src='./entry.js'"))throw Error('Web collaboration bootstrap leaked into native studio.');
const shell=await fs.readFile(path.join(dist,'mobile-shell.js'),'utf8');
for(const marker of ['saveFile','signIn','hostCheck','checkUpdates','nation.infectedvoices.space','purchaseSubscription','space.infectedvoices.studio.basic.monthly','space.infectedvoices.studio.pro.monthly','iv_studio_basic','iv_studio_pro','/api/health','0.6.6-mobile.2','Authorization'])if(!shell.includes(marker))throw Error('Mobile bridge missing '+marker);
const entry=await fs.readFile(path.join(dist,'mobile-entry.js'),'utf8');
if(entry.includes('Core6Collaboration'))throw Error('Unreleased Core 6 collaboration bootstrap leaked into the Core 5 mobile release.');
const chrome=await fs.readFile(path.join(dist,'mobile-chrome.js'),'utf8');
for(const marker of ['mobileHostSettings','mobileUpdates','mobileStore','mobileNationAccount','device-v1','hostCheck','checkUpdates','installUpdate','core3Mixer','core5Producer','Open store listing','Check RedXAIHost Studio','Search features','GRIM rack','Precision Tune','Vocal Lab','Apple signup','Studio Plus','Stripe is not used','ivOpenNativeStore'])if(!chrome.includes(marker))throw Error('Mobile chrome missing '+marker);
const home=await fs.readFile(path.join(dist,'index.html'),'utf8');
if(!home.includes('content="0.7.0"')||!home.includes('vocal-bridge.js'))throw Error('Cap home is not Vocal Lab 0.7.0.');
if(home.includes('Two voices'))throw Error('Core 6 collaboration pilot is still the Cap launch page.');
const css=await fs.readFile(path.join(dist,'mobile.css'),'utf8');
for(const marker of ['#09090B','#6E79D6','#27272A','--surface','--touch','--accent-muted','safe-area-inset','mobile-tabbar','--iv-accent','infected-auth-choices','apple-auth'])if(!css.includes(marker))throw Error('Mobile stylesheet missing '+marker);
const font=await fs.stat(path.join(dist,'fonts','InterVariable.woff2')).catch(()=>null);
if(!font?.isFile()||font.size<1000)throw Error('Inter font missing from mobile web payload.');
const create=await fs.readFile(path.join(dist,'mobile-create.js'),'utf8');
const entitlements=await fs.readFile(path.join(dist,'entitlements.js'),'utf8');
const flow=create+'\n'+entitlements;
for(const marker of ['ivModeCreate','ivModeStudio','Unlock Pro','needs Pro','Maybe later','Try Basic free for 7 days','Try Pro free for 7 days','Subscribe Basic $20/mo','Subscribe Pro $40/mo','basicTrialUsedAt','proTrialUsedAt','Trial ends','44.1 kHz · 16-bit','48 kHz · 24-bit','Open full Studio','Aim lead peaks around','Delivery note','Included in Basic $20','Preview, then Keep','Tour complete — open Studio for advanced.','Open advanced settings','Export stems','AI Beat-Lock','Vocal isolation','Prepare'])if(!flow.includes(marker))throw Error('Create flow missing '+marker);
const {selfCheck}=await import('../mobile-src/entitlements.js');
selfCheck();
const download=await fs.readFile(path.join(root,'download','index.html'),'utf8');
for(const marker of ['App Store','Google Play','SHA-256','/voices','No Mac .app','does not offer an ipa','does not offer an aab','not the Windows app','Make vocals that sound finished','Recommended','Download for Windows','Launch studio','Basic $20','Pro $40','44.1 kHz · 16-bit','48 kHz · 24-bit'])if(!download.includes(marker))throw Error('Download page missing '+marker);
const windows=await fs.readFile(path.join(root,'download','windows.html'),'utf8');
if(!windows.includes('Download .exe')||!windows.includes('{{WINDOWS_SHA256}}')||!windows.includes('44.1 kHz · 16-bit')||!windows.includes('48 kHz · 24-bit'))throw Error('Windows download page is missing the installer CTA or delivery labels.');
const pages={};
for(const file of ['index.html','windows.html','mac.html','ios.html','android.html','web.html'])pages[file]=await fs.readFile(path.join(root,'download',file),'utf8');
const {safeUrl,renderDownload,assertDownloadPages}=await import('./download-pages.mjs');
if(safeUrl('javascript:alert(1)','https://apps.apple.com/')!=='https://apps.apple.com/')throw Error('Download URLs must reject javascript:.');
if(safeUrl('//evil.example','/voices/')!=='/voices/')throw Error('Download URLs must reject protocol-relative links.');
const rendered=assertDownloadPages(pages,{});
if(rendered['index.html'].includes('{{')||!rendered['index.html'].includes('https://apps.apple.com/')||!rendered['index.html'].includes('https://play.google.com/store')||!rendered['index.html'].includes('https://github.com/grimvirusoffical-source/InfectedVoices-Windows/releases')||!rendered['index.html'].includes('SHA-256'))throw Error('Download placeholders were not filled.');
if(rendered['index.html'].includes('data-platform="mac"')||/href="https:\/\/apps\.apple\.com/.test(rendered['mac.html']))throw Error('Mac must recommend Open web, not an App Store app.');
const hostile=assertDownloadPages(pages,{
  IV_APP_STORE_URL:'https://evil.example/InfectedVoices.ipa',
  IV_PLAY_STORE_URL:'https://evil.example/app.aab',
  IV_DOWNLOAD_WINDOWS_URL:'https://github.com/grimvirusoffical-source/InfectedVoices/zipball/Release',
  IV_DOWNLOAD_WEB_URL:'https://evil.example/phish',
  IV_TESTFLIGHT_URL:'https://evil.example/internal.ipa',
  IV_DOWNLOAD_WINDOWS_SHA256:'not-a-real-digest'
});
if(/href="[^"]*\.(ipa|aab|apk)/i.test(hostile['index.html']+hostile['ios.html']+hostile['android.html']+hostile['windows.html']))throw Error('A raw ipa or aab survived the store allowlist.');
if(hostile['index.html'].includes('not-a-real-digest')||hostile['index.html'].includes('evil.example'))throw Error('A rejected download URL or digest was printed.');
const sha='ab'.repeat(32);
const published=renderDownload(windows,{IV_DOWNLOAD_WINDOWS_SHA256:sha,IV_DOWNLOAD_WINDOWS_URL:'https://github.com/grimvirusoffical-source/InfectedVoices-Windows/releases/download/v1/InfectedVoices-setup.exe'});
if(!published.includes(sha)||!published.includes('InfectedVoices-Windows/releases/download/v1/InfectedVoices-setup.exe'))throw Error('The Windows Releases installer was dropped.');
const coreRelease=renderDownload(windows,{IV_DOWNLOAD_WINDOWS_URL:'https://github.com/grimvirusoffical-source/InfectedVoices/releases'});
if(coreRelease.includes('github.com/grimvirusoffical-source/InfectedVoices/releases'))throw Error('The Core repo Releases page is not the Windows installer.');
const createSrc=await fs.readFile(path.join(root,'mobile-src','mobile-create.js'),'utf8');
const exportSrc=await fs.readFile(path.join(root,'studio','src','lib','exportAudio.ts'),'utf8');
const mount=await fs.readFile(path.join(root,'browser-src','create-mount.js'),'utf8');
for(const marker of ['44.1 kHz · 16-bit','48 kHz · 24-bit','Auto-Tune','Lock to Beat','Smart Mix'])if(!createSrc.includes(marker))throw Error('Shared Create chrome is missing '+marker);
if(!exportSrc.includes("label: '44.1 kHz · 16-bit WAV'")||!exportSrc.includes("label: '48 kHz · 24-bit WAV'"))throw Error('Vocal Lab export labels drifted from Free 16-bit and Basic+ 48 kHz / 24-bit.');
if(!mount.includes("from './mobile-create.js'"))throw Error('Browser studio is not mounting the Cap Create chrome.');
const browserBuild=await fs.readFile(path.join(root,'scripts','build-browser.mjs'),'utf8');
const webBuild=await fs.readFile(path.join(root,'scripts','build-web.mjs'),'utf8');
const capacitor=await fs.readFile(path.join(root,'capacitor.config.json'),'utf8');
if(!browserBuild.includes('build-web.mjs')||!browserBuild.includes('mobile-create.js')||!webBuild.includes('mobile-create.js')||!capacitor.includes('"webDir": "dist"'))throw Error('Cap and browser are not sharing the Core 5 web payload.');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
if(pkg.scripts['native:mac']||pkg.scripts['native:macos']||pkg.scripts.electron)throw Error('Do not invent a Mac Cap target.');
const channels=await fs.readFile(path.join(root,'docs','RELEASE-CHANNELS.md'),'utf8');
for(const marker of ['InfectedVoices-Windows','EAS','No `InfectedVoices-Mac` repo','not finished','/voices/'])if(!channels.includes(marker))throw Error('Release channels doc is missing '+marker);
if(!pages['mac.html'].includes('No Mac .app')||!pages['mac.html'].includes('44.1 kHz · 16-bit')||!pages['mac.html'].includes('48 kHz · 24-bit'))throw Error('Mac page is missing Create delivery honesty.');
const server=await fs.readFile(path.join(root,'scripts','redx-browser-server.mjs'),'utf8');
if(!server.includes('pathname==="/get"')||!server.includes('pathname==="/download"'))throw Error('/get is not the same page as /download.');
if(!server.includes('provider_not_configured')||!server.includes('503'))throw Error('Cloud AI routes must stay real 503s.');
console.log(JSON.stringify({ok:true,core:'5',files:required.length,studioBytes:(await fs.stat(path.join(dist,'studio.html'))).size,shellBytes:(await fs.stat(path.join(dist,'mobile-shell.js'))).size}));
