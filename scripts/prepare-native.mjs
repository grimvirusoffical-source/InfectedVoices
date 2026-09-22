import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const platform=process.argv[2];
if(!['ios','android'].includes(platform))throw Error('Choose ios or android.');

try{
  await fs.access(platform);
}catch{
  execFileSync(process.platform==='win32'?'npx.cmd':'npx',['cap','add',platform],{stdio:'inherit'});
}

execFileSync(process.platform==='win32'?'npx.cmd':'npx',['cap','sync',platform],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/patch-native.mjs',platform],{stdio:'inherit'});
