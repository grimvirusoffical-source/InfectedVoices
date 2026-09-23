import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { assertCorePin, root } from './core-pin.mjs';

const args = process.argv.slice(2);
const banned = new Set(['--submit', '--upload', '--eas', '--release', 'submit', 'upload', 'eas', 'release']);
if (args.some((arg) => banned.has(arg))) {
  console.error('Refusing store upload. This shell does not run EAS submit or a Play upload.');
  process.exit(2);
}

assertCorePin();
console.log('Android shell pin ok.');
console.log('Native project stays in Core: core/android');
console.log('Later sync (no upload): npm run native:android inside core');

if (!args.includes('--sync')) process.exit(0);

const core = path.join(root, 'core');
if (!fs.existsSync(path.join(core, 'package.json'))) {
  console.error('Core submodule is missing. Run scripts/init-core.sh.');
  process.exit(1);
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['install', '--ignore-scripts'], { cwd: core, stdio: 'inherit' });
execFileSync(npm, ['run', 'native:android'], { cwd: core, stdio: 'inherit' });
console.log('Core Android project synced. No AAB was uploaded.');
