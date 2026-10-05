import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { assertCorePin, root } from './core-pin.mjs';

const args = new Set(process.argv.slice(2));
const banned = ['--release', '--sign', 'release', 'sign'];
if ([...args].some((arg) => banned.includes(arg))) {
  console.error('Refusing to sign or cut a Windows Release from this shell.');
  process.exit(2);
}

assertCorePin();

const sums = fs.readFileSync(path.join(root, 'release', 'SHA256SUMS.txt'), 'utf8');
const hashLines = sums.split('\n').filter((line) => /^[a-f0-9]{64}\s+\S+/.test(line));
if (hashLines.length) {
  for (const line of hashLines) {
    const name = line.trim().split(/\s+/)[1];
    if (!fs.existsSync(path.join(root, 'release', name))) {
      console.error('SHA-256 names a missing installer: ' + name);
      process.exit(1);
    }
  }
} else if (!sums.includes('UNPROVISIONED')) {
  console.error('release/SHA256SUMS.txt must stay UNPROVISIONED until a real installer exists');
  process.exit(1);
}

const host = JSON.parse(fs.readFileSync(path.join(root, 'packaging', 'host.json'), 'utf8'));
if (host.selectedHost !== 'webview2' || host.cutsRelease !== false || host.signing !== 'placeholder') {
  console.error('packaging/host.json must stay a WebView2 placeholder that does not cut a Release');
  process.exit(1);
}
for (const name of host.alternatesNotImplemented || []) {
  if (!['electron', 'tauri'].includes(name)) {
    console.error('Unexpected alternate host: ' + name);
    process.exit(1);
  }
}

if (!args.has('--build')) {
  console.log('windows hook check ok. SHA-256 remains a placeholder. No installer was produced.');
  process.exit(0);
}

const core = path.join(root, 'core');
if (!fs.existsSync(path.join(core, 'package.json'))) {
  console.error('Core submodule is missing. Run scripts/init-core.sh. This shell will not invent a studio payload.');
  process.exit(1);
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['install', '--include=dev', '--ignore-scripts'], { cwd: core, stdio: 'inherit' });
execFileSync(npm, ['run', 'build:web'], { cwd: core, stdio: 'inherit' });
const from = path.join(core, 'dist');
const to = path.join(root, 'payload', 'app');
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
const pending = [to];
while (pending.length) {
  const current = pending.pop();
  for (const name of fs.readdirSync(current)) {
    const full = path.join(current, name);
    if (fs.statSync(full).isDirectory()) pending.push(full);
    else if (/\.(ipa|aab|apk|exe|msi|dmg|app)$/i.test(name)) throw new Error('Refusing to stage ' + full);
  }
}
console.log('Staged Core dist into gitignored payload/app. Checksum file was not rewritten.');
