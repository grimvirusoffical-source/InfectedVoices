/**
 * Pitch shifting for the live engine and offline renders. The engine-neutral contract is:
 *   - worklet file `iv-pitch-processor.js`, registered as processor `iv-pitch-processor`
 *   - messages: setPitch / setSub / setMix / forceFail / ackError / dispose
 *   - an `initialized` message that carries `latency` (frames), or an `error` message
 * The current implementation (studio/public/iv-pitch-processor.js) uses SoundTouch (soundtouchjs, LGPL-2.1),
 * loaded at runtime as its own unmodified file. To swap engines, replace that worklet while keeping the contract.
 *
 * The worklet runs on the *native* AudioContext for live audio, and on an OfflineAudioContext on the main thread
 * for offline renders (OfflineAudioContext doesn't exist in Web Workers).
 *
 * There's no silent pass-through. Every failure becomes a PitchShiftError and is broadcast as
 * `iv-pitch-error`, and the studio shows it in the `pitch-error` banner.
 */

export const PITCH_WORKLET_FILE = 'iv-pitch-processor.js'
export const PITCH_PROCESSOR_NAME = 'iv-pitch-processor'
export const PITCH_ERROR_EVENT = 'iv-pitch-error'
export const FORCE_PITCH_FAIL_KEY = 'iv.forcePitchFail'
/**
 * Equal-power crossfade length (ms) the worklet uses for GRIM on/off, GRIM Mix changes and delay splices on large
 * correction jumps. Passed to the worklet as processorOptions.crossfadeMs; must stay within 10–20 ms.
 */
export const GRIM_CROSSFADE_MS = 15

export class PitchShiftError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PitchShiftError'
  }
}

export function pitchWorkletUrl() {
  return new URL(PITCH_WORKLET_FILE, document.baseURI).href
}

/** Test hook: `?ivForcePitchFail=1` or localStorage `iv.forcePitchFail=1` makes every shifter fail. */
export function forcePitchFailRequested(): boolean {
  try {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('ivForcePitchFail') === '1') return true
    return typeof localStorage !== 'undefined' && localStorage.getItem(FORCE_PITCH_FAIL_KEY) === '1'
  } catch {
    return false
  }
}

export function reportPitchError(message: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PITCH_ERROR_EVENT, { detail: message }))
}

const loadedContexts = new WeakSet<BaseAudioContext>()
async function ensureWorklet(ctx: BaseAudioContext) {
  if (loadedContexts.has(ctx)) return
  if (!ctx.audioWorklet) throw new PitchShiftError('AudioWorklet is not available in this browser')
  try {
    await ctx.audioWorklet.addModule(pitchWorkletUrl())
  } catch (e) {
    throw new PitchShiftError(`Pitch worklet failed to load: ${e instanceof Error ? e.message : String(e)}`)
  }
  loadedContexts.add(ctx)
}

type WorkletMessage = { type: string; message?: string; latency?: number; engine?: string }

function waitForInit(node: AudioWorkletNode, timeoutMs = 8000): Promise<{ latency: number; engine: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new PitchShiftError('Pitch shifter did not initialise in time')), timeoutMs)
    node.port.onmessage = (e: MessageEvent<WorkletMessage>) => {
      if (e.data?.type === 'initialized') {
        clearTimeout(timer)
        resolve({ latency: Number(e.data.latency) || 0, engine: String(e.data.engine || '') })
      } else if (e.data?.type === 'error') {
        clearTimeout(timer)
        reject(new PitchShiftError(e.data.message || 'Pitch shifter failed'))
      }
    }
  })
}

export type RealtimeShifterOptions = {
  /** Main voice shift in semitones. */
  pitch?: number
  /** Wet/dry mix of the main voice (0–1). */
  mix?: number
  /** Sub voice (GRIM drop): semitones relative to the main path, and GRIM Mix as 0–1 wet (equal-power, wet replaces dry). */
  subOffset?: number
  subGain?: number
  /** Deepest downward shift each voice allows (clamped beyond). Live latency adapts to the current shift. */
  mainMaxDown?: number
  subMaxDown?: number
  /** WSOLA tier: 'auto' (live default: fast tier for voices above ~165 Hz) or 'full'. */
  tier?: 'auto' | 'full'
}

/** Live AudioWorklet shifter. `create` resolves only when the engine is running, and rejects otherwise. */
export class RealtimePitchShifter {
  readonly node: AudioWorkletNode
  /** Frames between input and aligned output (also the dry-path delay). */
  readonly latency: number
  readonly engine: string
  error: string | null = null
  private listeners = new Set<(message: string) => void>()

  private constructor(node: AudioWorkletNode, latency: number, engine: string) {
    this.node = node
    this.latency = latency
    this.engine = engine
    node.port.onmessage = (e: MessageEvent<WorkletMessage>) => {
      if (e.data?.type === 'error') this.raise(e.data.message || 'Pitch shifter failed')
    }
  }

  static async create(ctx: BaseAudioContext, opts: RealtimeShifterOptions = {}): Promise<RealtimePitchShifter> {
    await ensureWorklet(ctx)
    const node = new AudioWorkletNode(ctx, PITCH_PROCESSOR_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      processorOptions: { ...opts, pitch: opts.pitch ?? 0, mix: opts.mix ?? 1, crossfadeMs: GRIM_CROSSFADE_MS, forceFail: forcePitchFailRequested() },
    })
    const { latency, engine } = await waitForInit(node)
    return new RealtimePitchShifter(node, latency, engine)
  }

  private raise(message: string) {
    if (this.error === message) return
    this.error = message
    this.node.port.postMessage({ type: 'ackError' })
    for (const cb of this.listeners) cb(message)
  }

  onError(cb: (message: string) => void) {
    this.listeners.add(cb)
    if (this.error) cb(this.error)
    return () => this.listeners.delete(cb)
  }

  setPitch(semitones: number) {
    this.node.port.postMessage({ type: 'setPitch', value: semitones })
  }

  /** Pitch-tracker reading (Hz, or ≤0 when unvoiced). Lets the worklet use its lower-latency tier for higher voices. */
  setVoiceHz(hz: number) {
    this.node.port.postMessage({ type: 'setVoiceHz', value: hz })
  }

  /** GRIM sub voice: `offset` semitones from the main path; `gain` = GRIM Mix, 0–1 wet (0 turns it off). Crossfaded over GRIM_CROSSFADE_MS. */
  setSub(offset: number, gain: number) {
    this.node.port.postMessage({ type: 'setSub', offset, gain: Math.max(0, Math.min(1, gain)) })
  }

  setMix(mix: number) {
    this.node.port.postMessage({ type: 'setMix', value: Math.max(0, Math.min(1, mix)) })
  }

  /** Test hook used by the forced-failure check. */
  forceFail(message = 'Pitch shifter forced to fail (test hook)') {
    this.node.port.postMessage({ type: 'forceFail', value: message })
  }

  dispose() {
    this.node.port.postMessage({ type: 'dispose' })
    this.node.disconnect()
    this.listeners.clear()
  }
}

export type PitchPoint = { atSec: number; semitones: number }

function rms(data: Float32Array, from = 0, to = data.length) {
  let s = 0
  const end = Math.min(to, data.length)
  for (let i = from; i < end; i++) s += data[i] * data[i]
  return Math.sqrt(s / Math.max(1, end - from))
}

/**
 * Offline pitch render on the main thread. The pitch schedule runs sample-accurately inside the
 * worklet from `currentFrame`, and the output is trimmed by the shifter latency so it lines up with the input.
 */
export type OfflineRenderOptions = { subOffset?: number; subGain?: number }

export async function renderPitchSchedule(input: AudioBuffer, schedule: PitchPoint[], mix = 1, opts: OfflineRenderOptions = {}): Promise<AudioBuffer> {
  const sr = input.sampleRate
  const pad = Math.ceil(sr * 0.25)
  const ctx = new OfflineAudioContext(2, input.length + pad, sr)
  await ensureWorklet(ctx)
  const flat = new Float32Array(Math.max(1, schedule.length) * 2)
  if (schedule.length) {
    schedule.forEach((p, i) => {
      flat[i * 2] = Math.max(0, Math.round(p.atSec * sr))
      flat[i * 2 + 1] = p.semitones
    })
  }
  const node = new AudioWorkletNode(ctx, PITCH_PROCESSOR_NAME, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
    // Offline latency doesn't matter (it's trimmed), so allow the full ±24 st range.
    processorOptions: {
      mix,
      schedule: flat,
      pitch: schedule[0]?.semitones ?? 0,
      subOffset: opts.subOffset ?? 0,
      subGain: opts.subGain ?? 0,
      mainMaxDown: 24,
      subMaxDown: 24,
      adaptive: false,
      tier: 'full',
      crossfadeMs: GRIM_CROSSFADE_MS,
      forceFail: forcePitchFailRequested(),
    },
  })
  const { latency } = await waitForInit(node)
  let renderError: string | null = null
  node.port.onmessage = (e: MessageEvent<WorkletMessage>) => {
    if (e.data?.type === 'error' && !renderError) renderError = e.data.message || 'Pitch shifter failed'
  }
  const src = ctx.createBufferSource()
  src.buffer = input
  src.connect(node)
  node.connect(ctx.destination)
  src.start()
  const rendered = await ctx.startRendering()
  await new Promise((r) => setTimeout(r, 0))
  if (renderError) throw new PitchShiftError(renderError)

  const channels = input.numberOfChannels
  const out = new AudioBuffer({ length: input.length, numberOfChannels: channels, sampleRate: sr })
  for (let c = 0; c < channels; c++) {
    const from = rendered.getChannelData(Math.min(c, rendered.numberOfChannels - 1))
    out.getChannelData(c).set(from.subarray(latency, latency + input.length))
  }
  const inRms = rms(input.getChannelData(0))
  const outRms = rms(out.getChannelData(0))
  if (inRms > 1e-3 && outRms < inRms * 0.05) {
    throw new PitchShiftError(`Pitch shifter returned near-silence (in ${inRms.toFixed(4)} RMS, out ${outRms.toFixed(4)} RMS)`)
  }
  return out
}

/**
 * Pitch-preserving stretch to `targetSec`. The buffer is resampled by the playback rate (changing duration and pitch),
 * then the pitch is shifted back by -12·log2(rate). Speed is clamped to 0.5–2×.
 */
export async function stretchToDuration(input: AudioBuffer, targetSec: number): Promise<AudioBuffer> {
  const rate = Math.min(2, Math.max(0.5, input.duration / Math.max(0.05, targetSec)))
  const sr = input.sampleRate
  const length = Math.max(1, Math.round(input.length / rate))
  const rs = new OfflineAudioContext(input.numberOfChannels, length, sr)
  const src = rs.createBufferSource()
  src.buffer = input
  src.playbackRate.value = rate
  src.connect(rs.destination)
  src.start()
  const resampled = await rs.startRendering()
  if (Math.abs(rate - 1) < 1e-3) return resampled
  return renderPitchSchedule(resampled, [{ atSec: 0, semitones: -12 * Math.log2(rate) }], 1)
}
