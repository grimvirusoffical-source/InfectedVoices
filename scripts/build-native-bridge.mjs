import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
await fs.access(path.join(out, 'index.html'));
await build({
  entryPoints: { 'native-bridge': path.join(root, 'mobile-src', 'native-bridge-src.js') },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outdir: out,
  target: ['safari17', 'chrome120'],
  minify: false,
  legalComments: 'eof',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const indexPath = path.join(out, 'index.html');
let html = await fs.readFile(indexPath, 'utf8');
const snippet = `<script type="module">if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){import('./native-bridge.js');}</script>`;
if (!html.includes('native-bridge.js')) {
  html = html.replace('</body>', `    ${snippet}\n  </body>`);
  await fs.writeFile(indexPath, html);
}
console.log('Attached Capacitor bridge to dist/index.html');
