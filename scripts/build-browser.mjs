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

const studioOut=path.join(root,'.browser-studio');
const npmBin=process.platform==='win32'?'npm.cmd':'npm';
execFileSync(npmBin,['install','--include=dev','--ignore-scripts','--prefix',path.join(root,'studio')],{cwd:root,stdio:'inherit'});
execFileSync(npmBin,['run','build:host','--prefix',path.join(root,'studio')],{cwd:root,stdio:'inherit'});
await fs.copyFile(path.join(studioOut,'index.html'),path.join(out,'index.html'));
await fs.cp(path.join(studioOut,'assets'),path.join(out,'assets'),{recursive:true});
for(const file of ['favicon.svg','bungee-processor-bundled.js','audio-processor.worker.bundle.js','manifest.webmanifest']){
  await fs.copyFile(path.join(studioOut,file),path.join(out,file));
}

const apiText=await fs.readFile(path.join(out,'api.js'),'utf8');
if(!apiText.includes('infectednation_session'))throw Error('Browser account adapter was overwritten.');
const indexText=await fs.readFile(path.join(out,'index.html'),'utf8');
if(!indexText.includes('content="0.7.0"'))throw Error('Canonical studio was not copied into browser-dist.');
for(const required of ['index.html','studio.html','api.js','workstation/app.js','lab/index.html','lab/account-entry.js','favicon.svg','manifest.webmanifest']){
  await fs.access(path.join(out,required));
}
console.log('Prepared Infected Voices browser payload in browser-dist/');
