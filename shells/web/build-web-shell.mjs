// Web shell build: Core pin check -> existing `npm run build:browser` (which itself runs build-web.mjs + studio build:host)
// -> stamp browser-dist/core-pin.json -> parity verification of the built bundle.
// Run through npm (`npm --prefix shells/web run build`) so npm_execpath is set for build-browser.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {checkCorePin,root,pin} from './check-core-pin.mjs';

let status;
try{status=checkCorePin();}catch(err){console.error(err.message);process.exit(1);}

const npmCli=process.env.npm_execpath;
if(!npmCli)throw Error('Start this build through npm run (npm --prefix shells/web run build) so npm can be resolved.');
execFileSync(process.execPath,[npmCli,'run','build:browser'],{cwd:root,stdio:'inherit'});

const out=path.join(root,'browser-dist');
await fs.writeFile(path.join(out,'core-pin.json'),JSON.stringify({
  shell:'web',core:pin.core,coreShort:pin.coreShort,pinned:status.ok,builtFrom:status.head,studioVersion:pin.studioVersion
},null,2)+'\n');

execFileSync(process.execPath,[path.join(root,'shells','web','verify-web-shell.mjs')],{cwd:root,stdio:'inherit'});
console.log(`Prepared Infected Voices Web shell (Core ${pin.coreShort}${status.ok?'':' UNPINNED'}) in browser-dist/`);
