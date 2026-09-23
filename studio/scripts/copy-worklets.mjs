import {copyFileSync, existsSync, mkdirSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
let pkg
try {
  pkg = dirname(require.resolve('bungee-pitch-shift/package.json'))
} catch {
  process.exit(0)
}
const pub = join(root, 'public')
mkdirSync(pub, {recursive: true})
const files = [
  [join(pkg, 'dist/bungee-processor-bundled.js'), 'bungee-processor-bundled.js'],
  [join(pkg, 'dist/worker/audio-processor.worker.bundle.js'), 'audio-processor.worker.bundle.js'],
]
for (const [src, name] of files) {
  if (!existsSync(src)) continue
  copyFileSync(src, join(pub, name))
}
