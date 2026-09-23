import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { assertCorePin, root } from './core-pin.mjs';

const forbidden = /\.(ipa|aab|apk|exe|msi|dmg|app)$/i;

function failForbidden(dir) {
  const pending = [dir];
  while (pending.length) {
    const current = pending.pop();
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      if (fs.statSync(full).isDirectory()) pending.push(full);
      else if (forbidden.test(name)) throw new Error('Refusing to stage ' + full);
    }
  }
}

const args = new Set(process.argv.slice(2));
assertCorePin();

if (!args.has('--stage')) {
  console.log('web stage check ok. Shared payload is Core build:browser, written to gitignored site/voices.');
  process.exit(0);
}

const core = path.join(root, 'core');
if (!fs.existsSync(path.join(core, 'package.json'))) {
  console.error('Core submodule is missing. Run scripts/init-core.sh. This shell will not invent a studio payload.');
  process.exit(1);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['install', '--include=dev', '--ignore-scripts'], { cwd: core, stdio: 'inherit' });
const script = args.has('--cap') ? 'build:web' : 'build:browser';
execFileSync(npm, ['run', script], { cwd: core, stdio: 'inherit' });
const from = path.join(core, script === 'build:web' ? 'dist' : 'browser-dist');
const to = path.join(root, 'site', 'voices');
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
failForbidden(to);
console.log('Staged ' + from + ' -> ' + to);
console.log('site/voices is gitignored. Do not commit it.');
