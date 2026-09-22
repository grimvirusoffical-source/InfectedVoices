import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const platform=process.argv[2];
if(platform!=='ios')throw Error('Only iOS is prepared in this repository.');
try{await fs.access('ios');}catch{execFileSync(process.platform==='win32'?'npx.cmd':'npx',['cap','add','ios'],{stdio:'inherit'});}
execFileSync(process.platform==='win32'?'npx.cmd':'npx',['cap','sync','ios'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/patch-native.mjs','ios'],{stdio:'inherit'});
