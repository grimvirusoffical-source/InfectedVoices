import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dist = path.join(root, 'dist');
const required = [
  'index.html',
  'favicon.svg',
  'bungee-processor-bundled.js',
  'audio-processor.worker.bundle.js',
  'native-bridge.js',
  'arrangement/studio.html',
  'arrangement/mobile-entry.js',
  'arrangement/mobile-shell.js',
  'arrangement/mobile.css',
  'arrangement/workstation/app.js',
  'arrangement/lab/index.html',
  'arrangement/lab/mobile-classic.js',
  'arrangement/lab/studio-runtime.js',
  'arrangement/lab/mp3-codec.js',
];
for (const rel of required) {
  const p = path.join(dist, rel);
  const st = await fs.stat(p).catch(() => null);
  if (!st?.isFile() || st.size < 20) throw Error('Missing web payload: ' + rel);
}
const index = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
if (!index.includes('content="0.7.0"')) throw Error('Studio build is not marked 0.7.0.');
if (!index.includes('native-bridge.js')) throw Error('Capacitor bridge was not attached to the studio.');
if (/stripe|infectednation/i.test(index)) throw Error('Unrelated product identity leaked into the studio shell.');
const studio = await fs.readFile(path.join(dist, 'arrangement/studio.html'), 'utf8');
if (!studio.includes('mobile-entry.js') || !studio.includes('mobile.css')) throw Error('Arrangement studio is not using the mobile entry.');
if (studio.includes("src='./entry.js'")) throw Error('Web collaboration bootstrap leaked into the arrangement studio.');
const shell = await fs.readFile(path.join(dist, 'arrangement/mobile-shell.js'), 'utf8');
for (const marker of ['saveFile', 'signIn', 'hostCheck', 'checkUpdates']) {
  if (!shell.includes(marker)) throw Error('Mobile bridge missing ' + marker);
}
const bridge = await fs.readFile(path.join(dist, 'native-bridge.js'), 'utf8');
for (const marker of ['saveFile', 'checkUpdates', 'ivNative']) {
  if (!bridge.includes(marker)) throw Error('Studio native bridge missing ' + marker);
}
const entry = await fs.readFile(path.join(dist, 'arrangement/mobile-entry.js'), 'utf8');
if (entry.includes('Core6Collaboration')) throw Error('Unreleased Core 6 collaboration bootstrap leaked into the mobile release.');
const assets = await fs.readdir(path.join(dist, 'assets'));
if (!assets.some((name) => name.endsWith('.js'))) throw Error('Studio JavaScript bundle missing from dist/assets.');
console.log(JSON.stringify({
  ok: true,
  version: '0.7.0',
  files: required.length,
  studioBytes: (await fs.stat(path.join(dist, 'index.html'))).size,
  arrangementBytes: (await fs.stat(path.join(dist, 'arrangement/studio.html'))).size,
}));
