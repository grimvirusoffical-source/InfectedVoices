import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const platform = process.argv[2];
const action = process.argv[3] || 'build';

if (!['ios', 'android'].includes(platform)) {
  throw new Error('Use ios or android.');
}
if (!['build', 'submit', 'auto-submit', 'status', 'credentials'].includes(action)) {
  throw new Error('Use build, submit, auto-submit, status, or credentials.');
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

async function ensureNativeProject() {
  try {
    await fs.access(platform);
  } catch {
    execFileSync(npm, ['run', 'native:' + platform], { stdio: 'inherit' });
  }
}

if (action === 'credentials') {
  await ensureNativeProject();
  execFileSync(npx, ['eas-cli@latest', 'credentials:configure-build', '--platform', platform, '--profile', 'production'], { stdio: 'inherit' });
} else if (action === 'status') {
  execFileSync(npx, ['eas-cli@latest', 'submit:status', '--platform', platform, '--profile', 'production'], { stdio: 'inherit' });
} else if (action === 'submit') {
  execFileSync(npx, ['eas-cli@latest', 'submit', '--platform', platform, '--profile', 'production'], { stdio: 'inherit' });
} else {
  await ensureNativeProject();
  const args = ['eas-cli@latest', 'build', '--platform', platform, '--profile', 'production'];
  if (action === 'auto-submit') args.push('--auto-submit');
  execFileSync(npx, args, { stdio: 'inherit' });
}
