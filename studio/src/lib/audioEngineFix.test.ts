import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

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
  const worklet = read('../../worklets/iv-bungee-processor.src.js')
  const parts = [0, 3].map((n) => read(`../studioAppParts/part${n}.txt`)).join('\n')
  assert.ok(shifter.includes("export const PITCH_ERROR_EVENT = 'iv-pitch-error'"))
  assert.ok(shifter.includes('Pitch shifter returned near-silence'))
  assert.ok(worklet.includes('Pitch shifter stalled'))
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

test('generated pitch worklet exposes Bungee malloc/HEAPF32 and registers the IV processor', () => {
  const script = fileURLToPath(new URL('../../scripts/build-bungee-worklet.mjs', import.meta.url))
  let out: string
  try {
    out = execFileSync(process.execPath, [script], { encoding: 'utf8' })
  } catch (e) {
    // bungee-pitch-shift is a studio dependency; the root-only CI install does not have it.
    if (String((e as { stderr?: string }).stderr ?? e).includes('bungee-pitch-shift is not installed')) return
    throw e
  }
  assert.match(out, /built .*iv-bungee-processor\.js/)
  const text = readFileSync(new URL('../../public/iv-bungee-processor.js', import.meta.url), 'latin1')
  assert.ok(text.includes('Module["_malloc"]=_malloc;Module["_free"]=_free;'))
  assert.ok(text.includes("registerProcessor('iv-bungee-processor', IvBungeeProcessor)"))
  assert.equal(text.includes('export default createBungeeModule'), false)
})
