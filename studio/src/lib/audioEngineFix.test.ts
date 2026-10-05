import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { existsSync } from 'node:fs'

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8')

test('engine gives Tone a native AudioContext before loading the pitch worklet', () => {
  const code = read('./audioEngine.ts')
  assert.ok(code.includes("new AudioContext({ latencyHint: 'interactive' })"))
  assert.ok(code.includes('Tone.setContext(new Tone.Context(this.nativeCtx))'))
  assert.ok(code.indexOf('Tone.setContext(') < code.indexOf('RealtimePitchShifter.create('))
  assert.equal(code.includes('toneCtx.rawContext as AudioContext'), false)
  assert.equal(code.includes("from 'bungee-pitch-shift"), false)
})

test('pitch failures are surfaced, never silently passed through', () => {
  const shifter = read('./pitchShifter.ts')
  const worklet = read('../../public/iv-pitch-processor.js')
  const parts = [0, 3].map((n) => read(`../studioAppParts/part${n}.txt`)).join('\n')
  assert.ok(shifter.includes("export const PITCH_ERROR_EVENT = 'iv-pitch-error'"))
  assert.ok(shifter.includes('Pitch shifter returned near-silence'))
  assert.ok(worklet.includes('Pitch shifter stalled'))
  assert.ok(worklet.includes("'Pitch shifter forced to fail (test hook)'"))
  assert.ok(parts.includes('data-testid="pitch-error"'))
  assert.ok(parts.includes('window.addEventListener(PITCH_ERROR_EVENT, onPitchError)'))
})

test('loop toggle applies the new loop state immediately', () => {
  const part1 = read('../studioAppParts/part1.txt')
  const part5 = read('../studioAppParts/part5.txt')
  assert.ok(part1.includes('const applyLoop = (on: boolean = loopOn) => {'))
  assert.ok(part1.includes('engineRef.current?.setLoop(on, loopStart, loopEnd)'))
  assert.ok(part5.includes('applyLoop(next)'))
  assert.ok(part5.includes('onClick={() => applyLoop()}'))
  assert.equal(part5.includes('onClick={applyLoop}'), false)
})

test('pitch worklet keeps the engine-neutral contract and loads SoundTouch as a separate unmodified file', () => {
  const shifter = read('./pitchShifter.ts')
  const worklet = read('../../public/iv-pitch-processor.js')
  assert.ok(shifter.includes("export const PITCH_WORKLET_FILE = 'iv-pitch-processor.js'"))
  assert.ok(shifter.includes("export const PITCH_PROCESSOR_NAME = 'iv-pitch-processor'"))
  assert.ok(worklet.includes("registerProcessor('iv-pitch-processor', IvPitchProcessor)"))
  // LGPL: imported at runtime from its own file, never inlined into our code.
  assert.ok(worklet.includes("from './vendor/soundtouchjs/soundtouch.js'"))
  assert.equal(/class (FifoSampleBuffer|Stretch|RateTransposer)\b/.test(worklet), false)
  for (const f of ['./audioEngine.ts', './pitchShifter.ts']) assert.equal(/from 'soundtouchjs/.test(read(f)), false, f)
  assert.equal(read('../../package.json').includes('bungee-pitch-shift'), false)
})

test('About screen lists the SoundTouch LGPL notice, license file and source link, matching the pinned version', () => {
  const notices = read('./thirdPartyLicenses.ts')
  const about = read('../components/AboutLicenses.tsx')
  const pkg = JSON.parse(read('../../package.json'))
  assert.equal(pkg.dependencies.soundtouchjs, '0.3.0')
  assert.ok(notices.includes("version: '0.3.0'"))
  assert.ok(notices.includes('LGPL-2.1'))
  assert.ok(notices.includes("sourceUrl: 'https://github.com/cutterbl/SoundTouchJS/tree/v0.3.0'"))
  assert.ok(notices.includes("licenseFile: 'vendor/soundtouchjs/LICENSE.txt'"))
  assert.ok(about.includes('data-testid="about-licenses"'))
  assert.ok(read('../studioAppParts/part8.txt').includes("{tab === 'about' && <AboutLicenses />}"))
  const copy = read('../../scripts/copy-worklets.mjs')
  assert.ok(copy.includes("copyFileSync(join(pkgDir, 'dist', 'soundtouch.js'), join(out, 'soundtouch.js'))"))
  assert.ok(copy.includes("copyFileSync(join(pkgDir, 'LICENSE'), join(out, 'LICENSE.txt'))"))
  // When studio deps are installed, the shipped copy must be byte-identical to the npm file.
  const installed = new URL('../../node_modules/soundtouchjs/dist/soundtouch.js', import.meta.url)
  const shipped = new URL('../../public/vendor/soundtouchjs/soundtouch.js', import.meta.url)
  if (existsSync(installed) && existsSync(shipped)) assert.ok(readFileSync(installed).equals(readFileSync(shipped)))
})
