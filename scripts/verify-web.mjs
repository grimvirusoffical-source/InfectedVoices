import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const dist=path.join(root,'dist');
const required=['studio.html','mobile-entry.js','mobile-shell.js','mobile.css','workstation/app.js','workstation/producer-ui.js','workstation/precision-ui.js','workstation/mixer-ui.js','lab/index.html','lab/mobile-classic.js','lab/studio-runtime.js','lab/mp3-codec.js'];
for(const rel of required){const p=path.join(dist,rel);const st=await fs.stat(p).catch(()=>null);if(!st?.isFile()||st.size<20)throw Error('Missing native web payload: '+rel);}
const studio=await fs.readFile(path.join(dist,'studio.html'),'utf8');
if(!studio.includes("mobile-entry.js")||!studio.includes('mobile.css'))throw Error('Studio is not using mobile entry/CSS.');
if(studio.includes("src='./entry.js'"))throw Error('Web collaboration bootstrap leaked into native studio.');
const shell=await fs.readFile(path.join(dist,'mobile-shell.js'),'utf8');
for(const marker of ['saveFile','signIn','hostCheck','checkUpdates'])if(!shell.includes(marker))throw Error('Mobile bridge missing '+marker);
console.log(JSON.stringify({ok:true,files:required.length,studioBytes:(await fs.stat(path.join(dist,'studio.html'))).size,shellBytes:(await fs.stat(path.join(dist,'mobile-shell.js'))).size}));
