import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=path.join(root,'app-source');
const out=path.join(root,'dist');
try{await Promise.all([fs.access(path.join(src,'classic-runtime.js')),fs.access(path.join(src,'source-web','studio.html')),fs.access(path.join(src,'classic-source','account.js'))]);}catch{await fs.rm(src,{recursive:true,force:true});const parts=(await fs.readdir(path.join(root,'vendor'))).filter(v=>/^studio-source\.part\d+\.b64$/.test(v)).sort();if(!parts.length)throw Error('Missing vendored Studio source shards.');const text=(await Promise.all(parts.map(v=>fs.readFile(path.join(root,'vendor',v),'utf8')))).join('').replace(/\s+/g,'');const tgz=path.join(root,'vendor','.studio-source.tar.gz');const bytes=Buffer.from(text,'base64');const digest=crypto.createHash('sha256').update(bytes).digest('hex');if(digest!=='e6288c29a180d8d6048fcc9117a6f6a50e7d3225920aadeb2fe48288adaf8967')throw Error('Pinned Studio source checksum mismatch.');await fs.writeFile(tgz,bytes);execFileSync('tar',['-xzf',tgz,'-C',root],{stdio:'inherit'});await fs.rm(tgz,{force:true});}
execFileSync(process.execPath,['scripts/generate-assets.mjs'],{stdio:'inherit'});await fs.mkdir(path.join(src,'source-web','resources'),{recursive:true});await fs.copyFile(path.join(root,'assets','app-icon.png'),path.join(src,'source-web','resources','infected-voices-icon.png'));
await fs.rm(out,{recursive:true,force:true});
await fs.cp(path.join(src,'source-web'),out,{recursive:true});
await fs.writeFile(path.join(out,'package.json'),'{'+'"type":"module"'+'}\n');
await fs.copyFile(path.join(src,'classic-runtime.js'),path.join(out,'lab','studio-runtime.js'));
await build({entryPoints:{'lab/account-entry':path.join(src,'classic-source','account.js'),'lab/mp3-codec':path.join(src,'classic-source','codec.js')},bundle:true,format:'esm',platform:'browser',outdir:out,target:['safari17','chrome120'],minify:false,legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'}});
await build({entryPoints:{'mobile-shell':path.join(root,'mobile-src','mobile-shell-src.js')},bundle:true,format:'esm',platform:'browser',outdir:out,target:['safari17','chrome120'],minify:false,legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'}});
await fs.copyFile(path.join(root,'mobile-src','mobile-chrome.js'),path.join(out,'mobile-chrome.js'));
await fs.copyFile(path.join(root,'mobile-src','mobile.css'),path.join(out,'mobile.css'));
const mobileEntry=(await fs.readFile(path.join(root,'mobile-src','mobile-entry-src.js'),'utf8')).replace("import './mobile-shell-src.js';","import './mobile-shell.js';");
await fs.writeFile(path.join(out,'mobile-entry.js'),mobileEntry);
const mobileClassic=(await fs.readFile(path.join(root,'mobile-src','mobile-classic-src.js'),'utf8')).replace("import './mobile-shell-src.js';","import '../mobile-shell.js';");
await fs.writeFile(path.join(out,'lab','mobile-classic.js'),mobileClassic);
let studio=await fs.readFile(path.join(out,'studio.html'),'utf8');
studio=studio.replace("<link rel='stylesheet' href='./workstation/studio.css'>","<link rel='stylesheet' href='./workstation/studio.css'>\n  <link rel='stylesheet' href='./mobile.css'>")
 .replace("src='./entry.js'","src='./mobile-entry.js'")
 .replace(/0\.6 COLLAB PILOT/g,'CORE 5 MOBILE')
 .replace(/Continue with Google/g,'Sign in / create account')
 .replace(/Sign in with Google to view and use Infected Voices\.[^<]*/g,'Sign in or create your InfectedNation account. Apple, Google, Android/passkey, and email all connect to the same account.')
 .replace(/This release is a preview; retain project backups\./g,'Keep portable project backups before major edits or app updates.');
await fs.writeFile(path.join(out,'studio.html'),studio);
const workstationPath=path.join(out,'workstation','app.js');
let workstation=await fs.readFile(workstationPath,'utf8');
workstation=workstation
 .replace("const guideAccount=el('button','Account','quiet');guideAccount.onclick=()=>status('This iOS build uses your existing Infected Voices account. Subscription purchases are not offered inside this build.');","const guideAccount=el('button','Account','quiet');guideAccount.onclick=()=>openExternal('https://nation.infectedvoices.space/');")
 .replace("$('accountButton').onclick=()=>status('Signed-in account status is checked securely with Infected Voices. Purchases and redemption are not offered inside the iOS build.');$('unlock').onclick=()=>status('Access must already be active on your account for this iOS build.');","$('accountButton').onclick=()=>openExternal('https://nation.infectedvoices.space/');$('unlock').onclick=()=>window.ivOpenNativeStore?.();")
 .replace("Sign in to use Infected Voices. This iOS build uses your existing account access.","Sign in or create an InfectedNation account to use Infected Voices.")
 .replace("The iOS app does not sell or redeem digital access inside the app.","Studio Plus is available through your platform store. Use Store to subscribe or restore purchases.")
 .replace("if(error.code==='popup_blocked')throw Error('Allow the Google sign-in popup and try again.');if(error.code==='popup_closed')throw Error('Google sign-in was closed. Try again.');","if(error.code==='popup_blocked')throw Error('Allow the InfectedNation sign-in window and try again.');if(error.code==='popup_closed')throw Error('Sign-in was closed. Try again.');");
await fs.writeFile(workstationPath,workstation);
let lab=await fs.readFile(path.join(out,'lab','index.html'),'utf8');
lab=lab.replace('</head>','  <link rel="stylesheet" href="../mobile.css">\n</head>')
 .replace(/<script type="module" src="\.\/account-entry\.js"><\/script>/,'<script type="module" src="./mobile-classic.js"></script>')
 .replace(/<script>if\('serviceWorker'[\s\S]*?<\/script>/g,'')
 .replace(/Sign in with Google to open Studio\./g,'Sign in or create your InfectedNation account to open Studio.')
 .replace(/<button id="labSignInHero" class="primary">Sign in with Google<\/button>/g,'<button id="labSignInHero" class="primary">Sign in / create account</button>')
 .replace(/<button id="signIn" class="primary">Continue with Google<\/button>/g,'<button id="signIn" class="primary">Sign in / create account</button>')
 .replace(/First time\? Continue with Google to create your studio account\.[^<]*/g,'Use Apple, Google, Android/passkey, or email. Every method connects to the same InfectedNation account.')
 .replace(/On iPhone, iPad or Android,[\s\S]*?loads updates when reopened\./,'This is the native mobile build. Projects and recordings remain local unless you explicitly export them. App updates are distributed through your platform app store.');
await fs.writeFile(path.join(out,'lab','index.html'),lab);
const accountEntryPath=path.join(out,'lab','account-entry.js');
let accountEntry=await fs.readFile(accountEntryPath,'utf8');
accountEntry=accountEntry
 .replace(/iOS existing-account access/g,'RedXAIHost account')
 .replace(/Purchases are not offered inside the iOS build\./g,'Use Store to subscribe through your platform or restore an existing purchase.')
 .replace(/Billing links are not offered inside the iOS build\./g,'Manage billing through your platform subscription settings.');
await fs.writeFile(accountEntryPath,accountEntry);
await fs.rm(path.join(out,'sw.js'),{force:true});
await fs.rm(path.join(out,'manifest.webmanifest'),{force:true});
for(const html of ['studio.html','lab/index.html']){const p=path.join(out,html),t=await fs.readFile(p,'utf8');if(/serviceWorker\.register|src=['"]\.\/?entry\.js/.test(t))throw Error('Native build still contains a web bootstrap/update path: '+html);}
console.log('Prepared Infected Voices Core 5 mobile web payload in dist/');
