// Copies third-party audio code into public/ as separate, unmodified files (LGPL: never bundled or patched).
//   public/vendor/soundtouchjs/soundtouch.js  <- node_modules/soundtouchjs/dist/soundtouch.js (byte-for-byte)
//   public/vendor/soundtouchjs/LICENSE.txt    <- node_modules/soundtouchjs/LICENSE (LGPL-2.1 text)
//   public/vendor/soundtouchjs/SOURCE.txt     <- name, version, license and where to get the source
// public/iv-pitch-processor.js (our worklet, committed) imports soundtouch.js from vendor/ at runtime.
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkgDir = join(root, 'node_modules', 'soundtouchjs')
if (!existsSync(join(pkgDir, 'package.json'))) {
  console.error('copy-worklets: soundtouchjs is not installed (run npm ci in studio/)')
  process.exit(1)
}
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
const out = join(root, 'public', 'vendor', 'soundtouchjs')
mkdirSync(out, {recursive: true})
copyFileSync(join(pkgDir, 'dist', 'soundtouch.js'), join(out, 'soundtouch.js'))
copyFileSync(join(pkgDir, 'LICENSE'), join(out, 'LICENSE.txt'))
writeFileSync(
  join(out, 'SOURCE.txt'),
  [
    `${pkg.name} ${pkg.version}`,
    `License: ${pkg.license} (GNU Lesser General Public License v2.1, full text in LICENSE.txt)`,
    'Copyright (c) Olli Parviainen, Ryan Berdeen, Jakub Fiala, Steve \'Cutter\' Blades',
    `Source: https://github.com/cutterbl/SoundTouchJS/tree/v${pkg.version}`,
    `npm: https://www.npmjs.com/package/${pkg.name}/v/${pkg.version}`,
    'soundtouch.js is shipped unmodified and loaded as its own file by iv-pitch-processor.js.',
    'You may replace it with a compatible (modified) build of the library.',
    '',
  ].join('\n'),
)
console.log(`copy-worklets: ${pkg.name} ${pkg.version} -> public/vendor/soundtouchjs/`)
