import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const stage = path.join(root, 'release', 'InfectedVoices-Windows');
await fs.access(path.join(dist, 'index.html'));
await fs.rm(stage, {recursive: true, force: true});
await fs.mkdir(stage, {recursive: true});
await fs.cp(dist, path.join(stage, 'dist'), {recursive: true});
await fs.copyFile(path.join(root, 'desktop', 'main.cjs'), path.join(stage, 'main.cjs'));
await fs.copyFile(path.join(root, 'desktop', 'preload.cjs'), path.join(stage, 'preload.cjs'));
await fs.writeFile(path.join(stage, 'package.json'), JSON.stringify({
  name: 'infected-voices',
  productName: 'Infected Voices',
  version: '0.7.0',
  private: true,
  main: 'main.cjs',
  description: 'Infected Voices Studio 0.7.0 desktop shell',
}, null, 2) + '\n');
await fs.writeFile(path.join(stage, 'Run Infected Voices.bat'), `@echo off
cd /d "%~dp0"
where npx >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer, then run this file again.
  pause
  exit /b 1
)
npx --yes electron .
`);
await fs.writeFile(path.join(stage, 'Run Infected Voices.command'), `#!/bin/sh
cd "$(dirname "$0")"
exec npx --yes electron .
`);
await fs.chmod(path.join(stage, 'Run Infected Voices.command'), 0o755);
console.log('Windows shell staged at release/InfectedVoices-Windows');
console.log('On Windows: open that folder and run "Run Infected Voices.bat".');
console.log('Installer packaging is intentionally separate from signing keys. Add electron-builder on a Windows machine when you are ready to ship an .exe.');
