import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { assertCorePin, root } from './core-pin.mjs';

const args = process.argv.slice(2);
const banned = new Set([
  '--submit', '--upload', '--eas', '--release', '--mac', '--catalyst', '--macos',
  'submit', 'upload', 'eas', 'release', 'mac', 'catalyst', 'macos',
]);
if (args.some((arg) => banned.has(arg))) {
  console.error('Refusing store upload or a Mac target. This shell does not run EAS submit, and it does not build a Mac .app.');
  process.exit(2);
}

assertCorePin();
console.log('iOS shell pin ok.');
console.log('Native project stays in Core: core/ios');
console.log('iPhone and iPad only. Mac is Open web or Designed for iPad, not a Mac shell.');
console.log('Later sync (no upload): npm run native:ios inside core');

if (!args.includes('--sync')) process.exit(0);

const core = path.join(root, 'core');
if (!fs.existsSync(path.join(core, 'package.json'))) {
  console.error('Core submodule is missing. Run scripts/init-core.sh.');
  process.exit(1);
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['install', '--ignore-scripts'], { cwd: core, stdio: 'inherit' });
execFileSync(npm, ['run', 'native:ios'], { cwd: core, stdio: 'inherit' });
console.log('Core iOS project synced. No IPA was uploaded.');
