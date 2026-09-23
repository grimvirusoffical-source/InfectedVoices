import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'app-source');
const sourceWeb=path.join(source,'source-web');
const classic=path.join(source,'classic-source');
const out=path.join(root,'browser-dist');
const redxApi=path.join(root,'browser-src','redx-api.js');
const classicSession=path.join(root,'browser-src','classic-session.js');

execFileSync(process.execPath,[path.join(root,'scripts','build-web.mjs')],{cwd:root,stdio:'inherit'});
await fs.rm(out,{recursive:true,force:true});
await fs.cp(sourceWeb,out,{recursive:true});
await fs.writeFile(path.join(out,'package.json'),JSON.stringify({type:'module'})+'\n');
await fs.copyFile(path.join(source,'classic-runtime.js'),path.join(out,'lab','studio-runtime.js'));
await fs.copyFile(redxApi,path.join(out,'api.js'));

const accountPath=path.join(classic,'account.js');
const browserPlugin={
  name:'infected-voices-browser',
  setup(ctx){
    ctx.onResolve({filter:/^\.\/session\.js$/},args=>
      path.resolve(args.importer)===accountPath?{path:classicSession}:null
    );
    ctx.onLoad({filter:/account\.js$/},async args=>{
      if(path.resolve(args.path)!==accountPath)return;
      let text=await fs.readFile(args.path,'utf8');
      text=text
        .replace(
          "    $('subscribe').hidden=true;\n    $('billing').hidden=true;\n    $('subscribe').disabled=true;\n    $('billing').disabled=true;",
          "    $('subscribe').hidden=!!data.allowed;\n    $('billing').hidden=true;\n    $('subscribe').disabled=!!data.allowed;\n    $('billing').disabled=true;"
        )
        .replace("        ' · iOS existing-account access',","        ' · RedXAIHost account',")
        .replace("  $('subscribe').onclick=()=>message('Purchases are not offered inside the iOS build.');","  $('subscribe').onclick=()=>task(()=>navigateBilling('/api/billing/checkout'));")
        .replace("  $('billing').onclick=()=>message('Billing links are not offered inside the iOS build.');","  $('billing').onclick=()=>message('Manage billing from your Stripe receipt or account portal.');");
      return {contents:text,loader:'js'};
    });
  }
};

await build({
  entryPoints:{'lab/account-entry':accountPath,'lab/mp3-codec':path.join(classic,'codec.js')},
  bundle:true,format:'esm',platform:'browser',outdir:out,target:['safari17','chrome120'],
  minify:false,legalComments:'eof',plugins:[browserPlugin],define:{'process.env.NODE_ENV':'"production"'}
});

let index=await fs.readFile(path.join(out,'index.html'),'utf8');
index=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#101014"><title>Infected Voices · Vocal Production Studio</title>
<link rel="stylesheet" href="./collaboration.css"></head>
<body class="pilot-home"><main>
<p class="eyebrow">INFECTED VOICES · CORE 5</p>
<h1>Your voice.<br>Your <em>studio.</em></h1>
<p>Record, arrange, tune, pocket, mix and master vocals in the browser. Accounts and access are secured by InfectedNation on RedXAIHost.</p>
<a class="primary entry-link" href="./studio.html">Open Arrangement Studio →</a>
<p class="fine">Projects and recordings stay on this device unless you explicitly use a cloud or collaboration feature.</p>
<p><a href="https://nation.infectedvoices.space/" rel="noopener">Account / sign in ↗</a></p>
</main></body></html>`;
await fs.writeFile(path.join(out,'index.html'),index);

let studio=await fs.readFile(path.join(out,'studio.html'),'utf8');
studio=studio
  .replace("<meta name='robots' content='noindex,nofollow'>",'')
  .replace(/0\.6 COLLAB PILOT/g,'CORE 5 · REDXAIHOST')
  .replace(/Sign in with Google to view and use Infected Voices\.[^<]*/g,'Sign in or create your InfectedNation account to use Infected Voices. Apple, Google, passkey and email identities all map to the same account.')
  .replace(/Continue with Google/g,'Sign in / create account')
  .replace(/This release is a preview; retain project backups\./g,'Keep portable project backups before major edits or updates.');
await fs.writeFile(path.join(out,'studio.html'),studio);

const workstationPath=path.join(out,'workstation','app.js');
let workstation=await fs.readFile(workstationPath,'utf8');
workstation=workstation
  .replace("const guideAccount=el('button','Account','quiet');guideAccount.onclick=()=>status('This iOS build uses your existing Infected Voices account. Subscription purchases are not offered inside this build.');",
    "const guideAccount=el('button','Account','quiet');guideAccount.onclick=()=>openExternal('https://nation.infectedvoices.space/');")
  .replace("  $('accountButton').onclick=()=>status('Signed-in account status is checked securely with Infected Voices. Purchases and redemption are not offered inside the iOS build.');$('unlock').onclick=()=>status('Access must already be active on your account for this iOS build.');",
    "  $('accountButton').onclick=()=>openExternal('https://nation.infectedvoices.space/');$('unlock').onclick=()=>run(async()=>{const {data}=await api.post('/api/billing/checkout',{});openExternal(data.url);});")
  .replace("Sign in to use Infected Voices. This iOS build uses your existing account access.","Sign in with InfectedNation to use Infected Voices.")
  .replace("The iOS app does not sell or redeem digital access inside the app.","Activate Studio Plus from the browser to continue.")
  .replace("if(error.code==='popup_blocked')throw Error('Allow the Google sign-in popup and try again.');if(error.code==='popup_closed')throw Error('Google sign-in was closed. Try again.');",
    "if(error.code==='popup_blocked')throw Error('Allow the InfectedNation sign-in popup and try again.');if(error.code==='popup_closed')throw Error('Sign-in was closed. Try again.');");
await fs.writeFile(workstationPath,workstation);

const labPath=path.join(out,'lab','index.html');
let lab=await fs.readFile(labPath,'utf8');
lab=lab.replace(/<script>if\('serviceWorker'[\s\S]*?<\/script>/g,'');
await fs.writeFile(labPath,lab);
await fs.rm(path.join(out,'sw.js'),{force:true});

for(const required of ['index.html','studio.html','api.js','workstation/app.js','lab/index.html','lab/account-entry.js']){
  await fs.access(path.join(out,required));
}
console.log('Prepared Infected Voices browser payload in browser-dist/');
