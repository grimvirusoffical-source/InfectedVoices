import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const platform=process.argv[2];
if(!['ios','android'].includes(platform))throw Error('Choose ios or android.');

const runCap=(args)=>process.platform==='win32'
  ? execFileSync('cmd.exe',['/d','/s','/c',`npx cap ${args.join(' ')}`],{stdio:'inherit'})
  : execFileSync('npx',['cap',...args],{stdio:'inherit'});

try{
  await fs.access(platform);
}catch{
  runCap(['add',platform]);
}

runCap(['sync',platform]);
execFileSync(process.execPath,['scripts/patch-native.mjs',platform],{stdio:'inherit'});
