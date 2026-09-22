import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import zlib from 'node:zlib';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=path.join(root,'app-source');
const out=path.join(root,'dist');
try{await fs.access(src);}catch{const parts=(await fs.readdir(path.join(root,'vendor'))).filter(v=>/^studio-source\.part\d+\.b64$/.test(v)).sort();if(!parts.length)throw Error('Missing vendored Studio source shards.');const text=(await Promise.all(parts.map(v=>fs.readFile(path.join(root,'vendor',v),'utf8')))).join('').replace(/\s+/g,'');const tgz=path.join(root,'vendor','.studio-source.tar.gz');await fs.writeFile(tgz,Buffer.from(text,'base64'));execFileSync('tar',['-xzf',tgz,'-C',root],{stdio:'inherit'});await fs.rm(tgz,{force:true});}
execFileSync(process.execPath,['scripts/generate-assets.mjs'],{stdio:'inherit'});await fs.mkdir(path.join(src,'source-web','resources'),{recursive:true});await fs.copyFile(path.join(root,'assets','app-icon.png'),path.join(src,'source-web','resources','infected-voices-icon.png'));
await fs.rm(out,{recursive:true,force:true});
await fs.cp(path.join(src,'source-web'),out,{recursive:true});
await fs.writeFile(path.join(out,'package.json'),'{'+'"type":"module"'+'}\n');
await fs.copyFile(path.join(src,'classic-runtime.js'),path.join(out,'lab','studio-runtime.js'));
await build({entryPoints:{'lab/account-entry':path.join(src,'classic-source','account.js'),'lab/mp3-codec':path.join(src,'classic-source','codec.js')},bundle:true,format:'esm',platform:'browser',outdir:out,target:'safari17',minify:false,legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'}});
await build({entryPoints:{'mobile-shell':path.join(root,'mobile-src','mobile-shell-src.js')},bundle:true,format:'esm',platform:'browser',outdir:out,target:'safari17',minify:false,legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'}});
await fs.copyFile(path.join(root,'mobile-src','mobile-chrome.js'),path.join(out,'mobile-chrome.js'));
await fs.copyFile(path.join(root,'mobile-src','mobile.css'),path.join(out,'mobile.css'));
const mobileEntry=(await fs.readFile(path.join(root,'mobile-src','mobile-entry-src.js'),'utf8')).replace("import './mobile-shell-src.js';","import './mobile-shell.js';");
await fs.writeFile(path.join(out,'mobile-entry.js'),mobileEntry);
const mobileClassic=(await fs.readFile(path.join(root,'mobile-src','mobile-classic-src.js'),'utf8')).replace("import './mobile-shell-src.js';","import '../mobile-shell.js';");
await fs.writeFile(path.join(out,'lab','mobile-classic.js'),mobileClassic);
let studio=await fs.readFile(path.join(out,'studio.html'),'utf8');
studio=studio.replace("<link rel='stylesheet' href='./workstation/studio.css'>","<link rel='stylesheet' href='./workstation/studio.css'>\n  <link rel='stylesheet' href='./mobile.css'>")
 .replace("src='./entry.js'","src='./mobile-entry.js'")
 .replace(/0\.6 COLLAB PILOT/g,'iOS MOBILE')
 .replace(/Continue with Google/g,'Continue to account')
 .replace(/Sign in with Google to view and use Infected Voices\.[^<]*/g,'Sign in to use your Infected Voices account. Authorization opens securely in your browser and returns you to the app.')
 .replace(/This release is a preview; retain project backups\./g,'Keep portable project backups before major edits or app updates.');
await fs.writeFile(path.join(out,'studio.html'),studio);
let lab=await fs.readFile(path.join(out,'lab','index.html'),'utf8');
lab=lab.replace('</head>','  <link rel="stylesheet" href="../mobile.css">\n</head>')
 .replace(/<script type="module" src="\.\/account-entry\.js"><\/script>/,'<script type="module" src="./mobile-classic.js"></script>')
 .replace(/<script>if\('serviceWorker'[\s\S]*?<\/script>/g,'')
 .replace(/On iPhone, iPad or Android,[\s\S]*?loads updates when reopened\./,'This is the native iPhone/iPad build. Projects and recordings remain local unless you explicitly export or join collaboration. App updates are distributed through the App Store.');
await fs.writeFile(path.join(out,'lab','index.html'),lab);
await fs.rm(path.join(out,'sw.js'),{force:true});
await fs.rm(path.join(out,'manifest.webmanifest'),{force:true});
for(const html of ['studio.html','lab/index.html']){const p=path.join(out,html),t=await fs.readFile(p,'utf8');if(/serviceWorker\.register|src=['"]\.\/?entry\.js/.test(t))throw Error('Native build still contains a web bootstrap/update path: '+html);}
console.log('Prepared Infected Voices iOS web payload in dist/');
