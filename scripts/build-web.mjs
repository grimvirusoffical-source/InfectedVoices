import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['run', 'build', '-w', 'infected-voices-studio'], {stdio: 'inherit', cwd: root});
execFileSync(process.execPath, ['scripts/build-arrangement.mjs'], {stdio: 'inherit', cwd: root});
execFileSync(process.execPath, ['scripts/build-native-bridge.mjs'], {stdio: 'inherit', cwd: root});
execFileSync(process.execPath, ['scripts/verify-web.mjs'], {stdio: 'inherit', cwd: root});
