import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defaultGrimMix, defaultSettings, grimMixGains, grimMixOf, type Preset, type VocalSettings } from './presets.ts'
import { GRIM_CROSSFADE_MS } from './pitchShifter.ts'

const here = new URL('.', import.meta.url)
const read = (rel: string) => readFileSync(new URL(rel, here), 'utf8')
const WORKLET = new URL('../../public/iv-pitch-processor.js', here)

test('GRIM crossfade length is a named constant of at least 10 ms (and at most 20 ms)', () => {
  assert.ok(GRIM_CROSSFADE_MS >= 10, `GRIM_CROSSFADE_MS is ${GRIM_CROSSFADE_MS} ms`)
  assert.ok(GRIM_CROSSFADE_MS <= 20, `GRIM_CROSSFADE_MS is ${GRIM_CROSSFADE_MS} ms`)
  const shifter = read('./pitchShifter.ts')
  assert.equal((shifter.match(/crossfadeMs: GRIM_CROSSFADE_MS/g) || []).length, 2, 'realtime and offline shifters both pass crossfadeMs')
  const w = readFileSync(WORKLET, 'utf8')
  assert.match(w, new RegExp(`let XFADE_MS = ${GRIM_CROSSFADE_MS}\\b`), 'worklet default matches GRIM_CROSSFADE_MS')
  assert.match(w, /XFADE_MS = Math\.max\(10, Math\.min\(20,/, 'worklet clamps the crossfade to 10–20 ms')
})

test('GRIM Mix defaults: depth 50 is mid-blend, the deepest setting is ~12% dry; equal-power, wet replaces dry', () => {
  assert.equal(defaultGrimMix(50), 50)
  assert.equal(defaultGrimMix(100), 88)
  assert.ok(defaultGrimMix(82) > 50 && defaultGrimMix(82) < 88)
  const deep = grimMixGains(88)
  assert.ok(Math.abs(deep.dry - 0.12) < 1e-9)
  for (const m of [0, 25, 50, 88, 100]) {
    const g = grimMixGains(m)
    assert.ok(Math.abs(g.dry * g.dry + g.wet * g.wet - 1) < 1e-9, `equal power at ${m}%`)
  }
  assert.deepEqual(grimMixGains(100), { dry: 0, wet: 1 })
  assert.deepEqual(grimMixGains(0), { dry: 1, wet: 0 })
  // The engine hands GRIM Mix to the worklet as the 0–1 wet amount.
  assert.match(read('./audioEngine.ts'), /gain: grimMixOf\(s\) \/ 100/)
})

test('GRIM Mix is saved in a Custom preset and restored when it is loaded again', () => {
  // Same steps as saveCustom/loadPreset: settings → preset (GRIM Mix stored explicitly) → IndexedDB (structured clone) → settings.
  const part2 = read('../studioAppParts/part2.txt')
  assert.match(part2, /settings: \{ \.\.\.settings, grimMix: grimMixOf\(settings\) \}/, 'saveCustom stores GRIM Mix')
  assert.match(part2, /setSettings\(p\.settings\)/, 'loadPreset restores the saved settings')
  const user: VocalSettings = { ...defaultSettings(), grimOn: true, depth: 100, grimMix: 37 }
  const saved: Preset = { id: 'preset_t', name: 'Custom mix', settings: { ...user, grimMix: grimMixOf(user) } }
  const loaded = structuredClone(saved)
  assert.equal(loaded.settings.grimMix, 37)
  assert.equal(grimMixOf(loaded.settings), 37)
  // A preset saved while GRIM Mix was following Depth keeps that blend even if Depth changes later.
  const following: VocalSettings = { ...defaultSettings(), grimOn: true, depth: 100 }
  const saved2 = structuredClone({ settings: { ...following, grimMix: grimMixOf(following) } })
  assert.equal(grimMixOf({ ...saved2.settings, depth: 20 }), 88)
  // Reset clean goes back to following Depth; presets from before GRIM Mix existed follow Depth too.
  assert.equal(defaultSettings().grimMix, null)
  const legacy = { ...defaultSettings(), depth: 50 } as Partial<VocalSettings>
  delete legacy.grimMix
  assert.equal(grimMixOf(legacy as VocalSettings), 50)
  // The control itself.
  assert.match(read('../studioAppParts/part5.txt'), /label="GRIM Mix" testId="grim-mix" value=\{grimMixOf\(settings\)\}/)
  assert.match(read('../studioAppParts/part0.txt'), /data-testid=\{testId\}/)
})

// DSP checks on the real worklet + SoundTouch (runs when soundtouchjs is installed, i.e. after `npm ci --prefix studio` or a build).
const stCandidates = [new URL('../../public/vendor/soundtouchjs/soundtouch.js', here), new URL('../../node_modules/soundtouchjs/dist/soundtouch.js', here)]
const stUrl = stCandidates.find((u) => existsSync(u))
const SR = 48000
type Proc = { process: (i: Float32Array[][], o: Float32Array[][]) => boolean; port: { onmessage: (e: { data: unknown }) => void } }
async function loadWorklet(): Promise<new (o: { processorOptions: Record<string, unknown> }) => Proc> {
  const g = globalThis as Record<string, unknown>
  g.sampleRate = SR
  g.currentFrame = 0
  let P: unknown
  g.AudioWorkletProcessor = class { port = { postMessage: () => {}, onmessage: null } }
  g.registerProcessor = (_n: string, c: unknown) => { P = c }
  const src = readFileSync(WORKLET, 'utf8').replace(/from '\.\/vendor\/soundtouchjs\/soundtouch\.js'/, `from '${stUrl!.href}'`)
  const f = join(mkdtempSync(join(tmpdir(), 'iv-worklet-')), 'w.mjs')
  writeFileSync(f, src)
  await import(pathToFileURL(f).href)
  return P as never
}
function render(P: Awaited<ReturnType<typeof loadWorklet>>, opts: Record<string, unknown>, events: { at: number; msg: unknown }[], secs = 3) {
  const p = new P({ processorOptions: { crossfadeMs: GRIM_CROSSFADE_MS, ...opts } })
  const n = SR * secs
  const out = new Float32Array(n)
  let e = 0
  for (let f = 0; f < n; f += 128) {
    ;(globalThis as Record<string, unknown>).currentFrame = f
    while (e < events.length && events[e].at * SR <= f) p.port.onmessage({ data: events[e++].msg })
    const L = new Float32Array(128)
    for (let i = 0; i < 128; i++) L[i] = 0.4 * Math.sin((2 * Math.PI * 220 * (f + i)) / SR) + 0.15 * Math.sin((2 * Math.PI * 440 * (f + i)) / SR)
    const oL = new Float32Array(128)
    const oR = new Float32Array(128)
    p.process([[L, L]], [[oL, oR]])
    out.set(oL, f)
  }
  return out
}
const d2 = (x: Float32Array, a: number, b: number) => {
  let m = 0
  for (let i = Math.max(2, Math.floor(a * SR)); i < Math.floor(b * SR); i++) m = Math.max(m, Math.abs(x[i] - 2 * x[i - 1] + x[i - 2]))
  return m
}
const env = (x: Float32Array, a: number, b: number) => {
  let m = Infinity
  for (let i = Math.floor(a * SR); i + 240 <= Math.floor(b * SR); i += 48) {
    let s = 0
    for (let j = i; j < i + 240; j++) s += x[j] * x[j]
    m = Math.min(m, Math.sqrt(s / 240))
  }
  return m
}
function noClickOrGap(x: Float32Array, label: string, at: number[], steady: [number, number][]) {
  const ref = Math.max(...steady.map(([a, b]) => d2(x, a, b)))
  // Level floor of the steady states themselves (two-voice blends beat, so compare against their own 5 ms minimum).
  const lvl = Math.min(...steady.map(([a, b]) => env(x, a, b)))
  for (const t of at) {
    const r = d2(x, t - 0.01, t + 0.15) / ref
    const g = env(x, t - 0.01, t + 0.15) / lvl
    assert.ok(r < 8, `${label} at ${t}s: sample-curvature spike ${r.toFixed(1)}x steady (click)`)
    assert.ok(g > 0.5, `${label} at ${t}s: 5 ms level fell to ${(g * 100).toFixed(0)}% of the steady-state floor (gap)`)
  }
}

test('worklet: GRIM on/off, GRIM Mix changes and large correction jumps crossfade without clicks or gaps', { skip: stUrl ? false : 'soundtouchjs not installed (run npm ci --prefix studio or a build first)' }, async () => {
  const P = await loadWorklet()
  const toggle = render(P, { mix: 0 }, [{ at: 1, msg: { type: 'setSub', offset: -12, gain: 0.88 } }, { at: 2, msg: { type: 'setSub', offset: 0, gain: 0 } }])
  noClickOrGap(toggle, 'GRIM toggle', [1, 2], [[0.5, 0.95], [1.4, 1.95], [2.4, 2.95]])
  // As the engine does it: GRIM also biases the main voice (−1.2 st at depth 50), which moves the dry-path delay.
  const engineToggle = render(P, { mix: 0 }, [
    { at: 1, msg: { type: 'setSub', offset: -7, gain: 0.5 } },
    { at: 1, msg: { type: 'setPitch', value: -1.2 } },
    { at: 2, msg: { type: 'setSub', offset: 0, gain: 0 } },
    { at: 2, msg: { type: 'setPitch', value: 0 } },
  ])
  noClickOrGap(engineToggle, 'GRIM toggle with main-voice bias', [1, 2, 2.5], [[0.5, 0.95], [1.6, 1.95], [2.7, 2.95]])
  const mixChange = render(P, { mix: 0, subOffset: -7, subGain: 0.25 }, [{ at: 1, msg: { type: 'setSub', offset: -7, gain: 0.9 } }, { at: 2, msg: { type: 'setSub', offset: -7, gain: 0.25 } }])
  noClickOrGap(mixChange, 'GRIM Mix change', [1, 2], [[0.5, 0.95], [1.4, 1.95], [2.4, 2.95]])
  const jump = render(P, { mix: 1 }, [{ at: 1, msg: { type: 'setPitch', value: -7 } }, { at: 2, msg: { type: 'setPitch', value: 5 } }])
  noClickOrGap(jump, 'correction jump', [1, 2], [[0.5, 0.95], [1.6, 1.95], [2.6, 2.95]])
})

test('worklet: at 100% GRIM Mix the lowered voice replaces the dry voice', { skip: stUrl ? false : 'soundtouchjs not installed' }, async () => {
  const P = await loadWorklet()
  const goertzel = (x: Float32Array, hz: number) => {
    const a = SR, b = SR * 2
    const k = 2 * Math.cos((2 * Math.PI * hz) / SR)
    let s1 = 0
    let s2 = 0
    for (let i = a; i < b; i++) { const s0 = x[i] + k * s1 - s2; s2 = s1; s1 = s0 }
    return (2 * Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - k * s1 * s2))) / (b - a)
  }
  const wet = render(P, { mix: 0, subOffset: -12, subGain: 1, adaptive: false, tier: 'full', schedule: [0, 0], subMaxDown: 24 }, [])
  const half = render(P, { mix: 0, subOffset: -12, subGain: 0.5, adaptive: false, tier: 'full', schedule: [0, 0], subMaxDown: 24 }, [])
  // input 220 + 440 Hz; one octave down = 110 + 220 Hz. 440 Hz only exists in the dry voice.
  assert.ok(goertzel(wet, 440) < 0.01 * goertzel(half, 440), `dry 440 Hz still present at 100% wet (${goertzel(wet, 440).toFixed(4)} vs ${goertzel(half, 440).toFixed(4)} at 50%)`)
  assert.ok(goertzel(wet, 110) > 0.1, `lowered voice (110 Hz) missing at 100% wet: ${goertzel(wet, 110).toFixed(4)}`)
})
