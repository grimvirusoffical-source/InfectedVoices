import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const expectedPin = {
  name: 'InfectedVoices',
  url: 'https://github.com/grimvirusoffical-source/InfectedVoices',
  branch: 'main',
  commit: '2fb04c2ce1ac4e49ea9105207f436b8b6cf1d80d',
  subject: 'Merge Cap PR #3: Core mobile clear bar (Stress PASS)',
  stress: 'CLEAR BAR PASS',
  packageVersion: '0.7.0',
  nativeShell: '0.6.6-mobile.2',
  vendorPayload: '0.6.6-core6.1',
  vendorSha256: 'e6288c29a180d8d6048fcc9117a6f6a50e7d3225920aadeb2fe48288adaf8967',
  appId: 'space.infectedvoices.studio',
  webBuild: 'npm run build:web',
  browserBuild: 'npm run build:browser',
  tiers: ['Free', 'Basic', 'Pro'],
  trials: { basic: 'basicTrialUsedAt', pro: 'proTrialUsedAt' },
};

const readmePhrases = [
  'feature parity source',
  'A signed-in account is Free',
  'Free, Basic, and Pro',
  '7-day trials',
  'basicTrialUsedAt',
  'proTrialUsedAt',
  '`/get` is store-only',
  'same page as `/download`',
  'No raw `.ipa`',
  'no raw `.aab`',
  'CDN',
  'Windows is signed',
  'SHA-256',
  'placeholder until a real Release',
  'Open web goes to `/voices`',
  'no Mac `.app`',
  'Designed for iPad',
  'no InfectedVoices-Mac',
];

const forbiddenName = /\.(ipa|aab|apk|exe|msi|dmg|app)$/i;

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

export function assertCorePin() {
  const pin = JSON.parse(fs.readFileSync(path.join(root, 'core-pin.json'), 'utf8'));
  const mismatches = [];
  for (const [key, value] of Object.entries(expectedPin)) {
    if (JSON.stringify(pin[key]) !== JSON.stringify(value)) mismatches.push(key);
  }
  if (mismatches.length) {
    throw new Error('core-pin.json does not match the Cap PR #3 pin: ' + mismatches.join(', '));
  }

  const modules = fs.readFileSync(path.join(root, '.gitmodules'), 'utf8');
  if (modules.includes('@') || /token|ghs_|github_pat_/i.test(modules)) {
    throw new Error('.gitmodules must use a clean https URL with no credentials');
  }
  if (!modules.includes('url = https://github.com/grimvirusoffical-source/InfectedVoices.git')) {
    throw new Error('.gitmodules must point at InfectedVoices Core');
  }

  const link = git(['ls-files', '-s', 'core']).trim();
  const [mode, sha] = link.split(/\s+/);
  if (mode !== '160000' || sha !== expectedPin.commit) {
    throw new Error('core gitlink must be 160000 ' + expectedPin.commit + ' (got ' + link + ')');
  }

  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const missing = readmePhrases.filter((phrase) => !readme.includes(phrase));
  if (missing.length) throw new Error('README is missing contract phrases: ' + missing.join(' | '));

  const tracked = git(['ls-files']).split('\n').filter(Boolean);
  for (const file of tracked) {
    if (file.startsWith('vendor/') || file.startsWith('core/') || file.includes('studio-source.part')) {
      throw new Error('DSP or Core contents must not be copied into this shell: ' + file);
    }
    if (forbiddenName.test(file)) throw new Error('Refusing tracked store or desktop binary: ' + file);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  assertCorePin();
  console.log('core pin ok', expectedPin.commit);
}
