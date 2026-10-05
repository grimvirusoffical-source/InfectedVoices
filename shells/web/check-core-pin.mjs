// Fails when Core differs from the commit in core-pin.json.
// Shell-owned paths (shells/web/, the web-shell workflow) are excluded from the comparison.
// Set WEB_SHELL_ALLOW_UNPINNED=1 to downgrade a mismatch to a warning (local experiments only; CI never sets it).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const here=path.dirname(fileURLToPath(import.meta.url));
export const root=path.resolve(here,'..','..');
export const pin=JSON.parse(fs.readFileSync(path.join(here,'core-pin.json'),'utf8'));
export const SHELL_PATHS=['shells/web','.github/workflows/web-shell.yml'];

const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();

export function checkCorePin(){
  const allowUnpinned=process.env.WEB_SHELL_ALLOW_UNPINNED==='1';
  const problems=[];
  let head='unknown';
  if(!/^[0-9a-f]{40}$/.test(pin.core))problems.push(`core-pin.json "core" must be a full 40-char SHA, got ${pin.core}`);
  try{
    head=git('rev-parse','HEAD');
    try{git('cat-file','-e',`${pin.core}^{commit}`);}catch{problems.push(`Pinned Core ${pin.core} is not in this clone (use fetch-depth: 0).`);}
    if(!problems.length){
      try{git('merge-base','--is-ancestor',pin.core,'HEAD');}catch{problems.push(`HEAD ${head} does not descend from pinned Core ${pin.core}.`);}
      const excludes=SHELL_PATHS.map(p=>`:(exclude)${p}`);
      const changed=git('diff','--name-only',pin.core,'--','.',...excludes);
      if(changed)problems.push(`Core files differ from pin ${pin.coreShort}:\n  ${changed.split('\n').join('\n  ')}`);
    }
  }catch(err){
    problems.push(`Cannot verify Core pin without git: ${err.message.split('\n')[0]}`);
  }
  if(problems.length){
    const msg=`[web-shell] Core pin check FAILED (pin ${pin.core}):\n- ${problems.join('\n- ')}`;
    if(!allowUnpinned)throw Error(msg);
    console.warn(msg+'\n[web-shell] WEB_SHELL_ALLOW_UNPINNED=1 set: continuing with an UNPINNED build.');
    return {ok:false,core:pin.core,head};
  }
  console.log(`[web-shell] Core pin OK: ${pin.coreShort} (HEAD ${head.slice(0,7)}; no Core drift outside shell paths)`);
  return {ok:true,core:pin.core,head};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{checkCorePin();}catch(err){console.error(err.message);process.exit(1);}
}
