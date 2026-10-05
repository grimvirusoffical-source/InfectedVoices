import * as Tone from 'tone'
import {
  PitchShiftError,
  RealtimePitchShifter,
  renderPitchSchedule,
  reportPitchError,
  stretchToDuration,
  type PitchPoint,
} from './pitchShifter'
import type { VocalSettings } from './presets'
import { snapSemitones, yinDetect } from './pitchMath'

export { pocketAssistOffsetSec, rapOnBeatRate } from './pocket'

/** Resolve a file shipped in `public/` next to the built page (web, Capacitor, Electron). */
export function publicAsset(file: string) {
  return new URL(file, document.baseURI).href
}

export class InfectedAudioEngine {
  ready = false
  private mic?: Tone.UserMedia
  private micGain?: Tone.Gain
  private wetGain?: Tone.Gain
  private darkFilter?: Tone.Filter
  private warmthEq?: Tone.Filter
  private deessFilter?: Tone.Filter
  private glitchDelay?: Tone.FeedbackDelay
  private grit?: Tone.Distortion
  private echo?: Tone.FeedbackDelay
  private space?: Tone.Reverb
  private compressor?: Tone.Compressor
  private gate?: Tone.Gate
  private limiter?: Tone.Limiter
  private masterOut?: Tone.Gain
  private monitorOut?: Tone.Gain
  private beatPlayer?: Tone.Player
  private beatGain?: Tone.Gain
  private metroSynth?: Tone.MembraneSynth
  private metroGain?: Tone.Gain
  private metroLoop?: Tone.Loop
  private recorder?: Tone.Recorder
  private settings: VocalSettings
  private correct?: RealtimePitchShifter
  private grimShift?: RealtimePitchShifter
  /** Last pitch-shifter failure; also broadcast as `iv-pitch-error` for the studio banner. */
  pitchError: string | null = null
  private analyser?: AnalyserNode
  private analyseBuf?: Float32Array
  private targetPitch = 0
  private currentPitch = 0
  bpm = 140
  private onTick?: (pos: number) => void
  private raf = 0
  private nativeCtx?: AudioContext

  constructor(settings: VocalSettings) {
    this.settings = settings
  }

  async init() {
    // Give Tone a *native* AudioContext. Tone's default standardized-audio-context wrapper re-wraps
    // AudioWorklet modules as classic scripts, so the ES-module pitch worklet died with
    // "Unexpected token 'export'" and Start engine never reached "Engine live".
    const current = Tone.getContext().rawContext
    if (!(current instanceof AudioContext) || current.state === 'closed') {
      this.nativeCtx = new AudioContext({ latencyHint: 'interactive' })
      Tone.setContext(new Tone.Context(this.nativeCtx))
    } else {
      this.nativeCtx = current
    }
    await Tone.start()
    const toneCtx = Tone.getContext()

    this.micGain = new Tone.Gain(1)
    this.wetGain = new Tone.Gain(1)
    this.darkFilter = new Tone.Filter({ frequency: 18000, type: 'lowpass', rolloff: -24 })
    this.warmthEq = new Tone.Filter({ type: 'lowshelf', frequency: 220, gain: 0 })
    this.deessFilter = new Tone.Filter({ type: 'peaking', frequency: 7000, Q: 2.5, gain: 0 })
    this.glitchDelay = new Tone.FeedbackDelay({ delayTime: '16n', feedback: 0.35, wet: 0 })
    this.grit = new Tone.Distortion({ distortion: 0.05, oversample: '2x' })
    this.echo = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.18, wet: 0.1 })
    this.space = new Tone.Reverb({ decay: 1.4, wet: 0.08 })
    await this.space.generate()
    this.compressor = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.01, release: 0.15 })
    this.gate = new Tone.Gate(-48)
    this.limiter = new Tone.Limiter(-1)
    this.masterOut = new Tone.Gain(1)
    this.monitorOut = new Tone.Gain(1)
    this.beatGain = new Tone.Gain(0.85)
    this.metroGain = new Tone.Gain(0)
    this.metroSynth = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
    })

    // Bungee: detect→snap correction + optional GRIM dual low-shift.
    // If the shifter can't start, the engine still runs (mic, record, metronome) with the chain
    // bypassed, and the failure is surfaced, never hidden.
    try {
      this.correct = await RealtimePitchShifter.create(this.nativeCtx, { pitch: 0, speed: 1, mix: 0.85 })
      this.grimShift = await RealtimePitchShifter.create(this.nativeCtx, { pitch: 0, speed: 1, mix: 0 })
      this.correct.onError((m) => this.setPitchError(m))
      this.grimShift.onError((m) => this.setPitchError(m))
    } catch (e) {
      this.correct?.dispose()
      this.correct = undefined
      this.grimShift = undefined
      this.setPitchError(e instanceof Error ? e.message : String(e))
    }

    this.analyser = this.nativeCtx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyseBuf = new Float32Array(this.analyser.fftSize)

    // Mic → gate → tap → Bungee correct → GRIM dual-shift → Tone FX
    this.micGain.connect(this.gate)
    const tap = new Tone.Gain(1)
    this.gate.connect(tap)
    const fromNative = new Tone.Gain(1)
    if (this.correct && this.grimShift) {
      Tone.connect(tap, this.correct.node)
      this.correct.node.connect(this.grimShift.node)
      this.grimShift.node.connect(fromNative.input)
    } else {
      tap.connect(fromNative)
    }
    fromNative.connect(this.darkFilter!)
    this.darkFilter!.connect(this.warmthEq!)
    this.warmthEq!.connect(this.deessFilter!)
    this.deessFilter!.connect(this.glitchDelay!)
    this.glitchDelay!.connect(this.grit!)
    this.grit!.connect(this.compressor!)
    this.compressor!.connect(this.echo!)
    this.echo!.connect(this.space!)
    this.space!.connect(this.wetGain!)
    this.wetGain!.connect(this.limiter!)
    this.limiter!.connect(this.masterOut!)
    this.masterOut!.connect(this.monitorOut!)
    this.monitorOut!.toDestination()

    Tone.connect(tap, this.analyser!)

    this.beatGain!.connect(this.monitorOut!)
    this.metroSynth!.connect(this.metroGain!)
    this.metroGain!.toDestination()

    this.recorder = new Tone.Recorder()
    this.masterOut!.connect(this.recorder)
    this.beatGain!.connect(this.recorder)

    this.applySettings(this.settings)
    Tone.getTransport().bpm.value = this.bpm
    this.metroLoop = new Tone.Loop((time) => {
      if (this.metroGain && this.metroGain.gain.value > 0) {
        this.metroSynth?.triggerAttackRelease('C2', '32n', time, 0.6)
      }
    }, '4n')
    this.metroLoop.start(0)

    this.ready = true
    this.tick()
    return toneCtx
  }

  private setPitchError(message: string) {
    if (this.pitchError === message) return
    this.pitchError = message
    reportPitchError(message)
  }

  /** Test hook: make the live shifter fail so the UI error path can be checked. */
  forcePitchFailure(message?: string) {
    if (this.correct) this.correct.forceFail(message)
    else this.setPitchError(message ?? 'Pitch shifter forced to fail (test hook)')
  }

  private tick = () => {
    const pos = Tone.getTransport().seconds
    this.onTick?.(pos)
    this.runPitchDetect()
    this.raf = requestAnimationFrame(this.tick)
  }

  private runPitchDetect() {
    if (!this.analyser || !this.analyseBuf || !this.correct) return
    this.analyser.getFloatTimeDomainData(this.analyseBuf as unknown as Float32Array<ArrayBuffer>)
    const hz = yinDetect(this.analyseBuf, this.nativeCtx?.sampleRate ?? 48000)
    const s = this.settings
    const humanCents = 5 + (s.humanize / 100) * 35
    const snap = snapSemitones(hz, s.key, s.scale, humanCents)
    if (snap == null) {
      // unvoiced — ease toward 0 correction offset but keep GRIM depth
      this.targetPitch = s.grimOn ? -(s.depth / 100) * 5 : 0
    } else {
      const grimExtra = s.grimOn ? -(s.depth / 100) * 7 : 0
      const formantBias = (s.formant / 100) * 2
      this.targetPitch = snap + grimExtra * 0.35 + formantBias
    }
    // slew by retuneMs
    const maxStep = 12 / Math.max(1, s.retuneMs / 16)
    const delta = this.targetPitch - this.currentPitch
    this.currentPitch += Math.max(-maxStep, Math.min(maxStep, delta))
    this.correct.setPitch(this.currentPitch)
    this.correct.setMix(Math.max(0, Math.min(1, Number.isFinite(s.correction) ? s.correction / 100 : 0)))

    if (this.grimShift) {
      if (s.grimOn) {
        this.grimShift.setPitch(-(s.depth / 100) * 10 - 2)
        this.grimShift.setMix(0.28 + (s.darkness / 100) * 0.25)
      } else {
        this.grimShift.setPitch(0)
        this.grimShift.setMix(0)
      }
    }
  }

  setOnTick(cb: (pos: number) => void) {
    this.onTick = cb
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.metroLoop?.dispose()
    this.mic?.close()
    this.correct?.dispose()
    this.grimShift?.dispose()
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
  }

  applySettings(s: VocalSettings) {
    this.settings = s
    if (!this.darkFilter) return

    const darkHz = s.grimOn
      ? 280 + (1 - s.darkness / 100) * 900
      : 2000 + (1 - s.darkness / 100) * 16000
    this.darkFilter.frequency.rampTo(darkHz, 0.05)
    this.warmthEq!.frequency.value = 220
    // Filter gain and compressor threshold are dB params: Tone's rampTo picks an exponential ramp for dB, which
    // yields NaN once a value crosses 0 dB (e.g. de-ess 0 → −3.4 dB) and threw on Start engine. Ramp them linearly.
    this.warmthEq!.gain.linearRampTo((s.warmth / 100) * 8, 0.05)
    this.deessFilter!.gain.linearRampTo(-(s.deess / 100) * 12, 0.05)
    this.glitchDelay!.wet.rampTo(s.grimOn ? (s.glitch / 100) * 0.55 : (s.glitch / 100) * 0.2, 0.05)
    this.glitchDelay!.feedback.rampTo(0.15 + (s.glitch / 100) * 0.45, 0.05)
    this.grit!.distortion = Math.min(0.85, (s.grit / 100) * 0.7 + (s.grimOn ? 0.1 : 0))
    this.echo!.wet.rampTo(s.echo / 100, 0.05)
    this.echo!.feedback.rampTo(0.05 + (s.echo / 100) * 0.35, 0.05)
    this.space!.wet.rampTo((s.space / 100) * (s.acapella ? 0.55 : 0.35), 0.08)
    this.compressor!.threshold.linearRampTo(-12 - (s.compress / 100) * 18, 0.05)
    this.compressor!.ratio.value = 2 + (s.compress / 100) * 6
    this.gate!.threshold = -60 + (s.gate / 100) * 40
    const outLin = Math.pow(10, s.outputDb / 20)
    this.masterOut!.gain.rampTo(outLin, 0.05)
    this.wetGain!.gain.rampTo(1, 0.05)
    if (this.correct) this.correct.setMix(Math.max(0, Math.min(1, Number.isFinite(s.correction) ? s.correction / 100 : 0)))
  }

  /** Rap-on-beat: Bungee time-stretch (pitch-preserving), not playbackRate */
  setRapStretch(speed: number) {
    const sp = Math.min(2, Math.max(0.5, speed))
    this.correct?.setSpeed(sp)
  }

  resetRapStretch() {
    this.correct?.setSpeed(1)
  }

  async startMic() {
    if (!this.mic) {
      this.mic = new Tone.UserMedia()
      await this.mic.open()
      this.mic.connect(this.micGain!)
    }
  }

  stopMic() {
    this.mic?.close()
    this.mic = undefined
  }

  setBpm(bpm: number) {
    this.bpm = Math.max(60, Math.min(200, bpm))
    Tone.getTransport().bpm.value = this.bpm
  }

  async loadBeat(arrayBuffer: ArrayBuffer) {
    const blob = new Blob([arrayBuffer])
    const url = URL.createObjectURL(blob)
    this.beatPlayer?.dispose()
    this.beatPlayer = new Tone.Player({
      url,
      loop: false,
      onload: () => undefined,
    }).connect(this.beatGain!)
    try { await Tone.loaded() } finally { URL.revokeObjectURL(url) }
  }

  setBeatVolume(v: number) {
    this.beatGain!.gain.rampTo(v, 0.05)
  }

  play() {
    if (this.beatPlayer && this.beatPlayer.loaded) {
      const t = Tone.getTransport()
      if (t.state !== 'started') t.start()
      this.beatPlayer.sync().start(0)
    } else {
      Tone.getTransport().start()
    }
  }

  stop() {
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
    this.beatPlayer?.unsync()
    this.beatPlayer?.stop()
    this.resetRapStretch()
  }

  pause() {
    Tone.getTransport().pause()
  }

  setLoop(on: boolean, startSec: number, endSec: number) {
    const t = Tone.getTransport()
    const start = Math.max(0, startSec)
    const end = Math.max(start + 0.05, endSec)
    t.loop = on
    t.loopStart = start
    t.loopEnd = end
    if (this.beatPlayer) {
      this.beatPlayer.loop = on
      this.beatPlayer.loopStart = start
      this.beatPlayer.loopEnd = end
    }
  }

  setMetronome(on: boolean) {
    this.metroGain!.gain.rampTo(on ? 0.55 : 0, 0.02)
  }

  async startRecording() {
    await this.recorder!.start()
  }

  async stopRecording(): Promise<Blob> {
    return await this.recorder!.stop()
  }

  getPositionSec() {
    return Tone.getTransport().seconds
  }

  seek(sec: number) {
    Tone.getTransport().seconds = Math.max(0, sec)
  }

  /** Offline: frame-wise YIN→snap pitch schedule rendered in one main-thread pass + GRIM FX bounce */
  async processOfflineBuffer(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    const s = this.settings
    const sr = audioBuffer.sampleRate
    const ch0 = audioBuffer.getChannelData(0)
    const frame = Math.floor(sr * 0.12) // ~120ms windows
    const hop = frame
    const mix = Math.max(0, Math.min(1, Number.isFinite(s.correction) ? s.correction / 100 : 0))
    const grim = s.grimOn ? -(s.depth / 100) * 7 : 0
    const formant = (s.formant / 100) * 2
    const channels = audioBuffer.numberOfChannels
    let joined = audioBuffer
    if (mix > 0) {
      // One schedule point per ~120 ms window; the worklet applies it at that exact frame.
      const schedule: PitchPoint[] = []
      for (let i = 0; i < ch0.length; i += hop) {
        const len = Math.min(frame, ch0.length - i)
        const snap = len >= 256 ? snapSemitones(yinDetect(ch0.subarray(i, i + len), sr), s.key, s.scale, 8) : null
        schedule.push({ atSec: i / sr, semitones: (snap ?? 0) + grim * 0.4 + formant })
      }
      try {
        joined = await renderPitchSchedule(audioBuffer, schedule, mix)
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        this.setPitchError(message)
        throw e instanceof PitchShiftError ? e : new PitchShiftError(message)
      }
    }

    const ox = new OfflineAudioContext(channels, joined.length, sr)
    const src = ox.createBufferSource()
    src.buffer = joined
    const filter = ox.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = s.grimOn ? 280 + (1 - s.darkness / 100) * 900 : 12000
    const shaper = ox.createWaveShaper()
    shaper.curve = makeDistortionCurve((s.grit / 100) * 400)
    const delay = ox.createDelay(1)
    delay.delayTime.value = 60 / this.bpm / 2
    const fb = ox.createGain()
    fb.gain.value = (s.echo / 100) * 0.35
    const delayWet = ox.createGain()
    delayWet.gain.value = s.echo / 100
    const warm = ox.createBiquadFilter()
    warm.type = 'lowshelf'
    warm.frequency.value = 220
    warm.gain.value = (s.warmth / 100) * 8
    const deess = ox.createBiquadFilter()
    deess.type = 'peaking'
    deess.frequency.value = 7000
    deess.Q.value = 2.5
    deess.gain.value = -(s.deess / 100) * 12
    const comp = ox.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 3 + (s.compress / 100) * 4
    const out = ox.createGain()
    out.gain.value = Math.pow(10, s.outputDb / 20)
    src.connect(filter)
    filter.connect(warm)
    warm.connect(deess)
    deess.connect(shaper)
    shaper.connect(comp)
    comp.connect(out)
    comp.connect(delay)
    delay.connect(fb)
    fb.connect(delay)
    delay.connect(delayWet)
    delayWet.connect(out)
    out.connect(ox.destination)
    src.start()
    return await ox.startRendering()
  }


  /** Live sample peak in dBFS from the post-gate analyser tap. */
  samplePeakDb(): number | null {
    if (!this.analyser || !this.analyseBuf) return null
    this.analyser.getFloatTimeDomainData(this.analyseBuf as unknown as Float32Array<ArrayBuffer>)
    let peak = 0
    for (let i = 0; i < this.analyseBuf.length; i++) {
      const sample = this.analyseBuf[i]
      const mag = sample < 0 ? -sample : sample
      if (mag > peak) peak = mag
    }
    if (peak < 1e-12) return Number.NEGATIVE_INFINITY
    return 20 * Math.log10(peak)
  }

  /** Stretch a recorded buffer to target duration (pitch-preserving: resample + pitch compensation) */
  async stretchBufferToDuration(audioBuffer: AudioBuffer, targetSec: number): Promise<AudioBuffer> {
    try {
      return await stretchToDuration(audioBuffer, targetSec)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      this.setPitchError(message)
      throw e instanceof PitchShiftError ? e : new PitchShiftError(message)
    }
  }
}

function makeDistortionCurve(amount: number) {
  const n = 44100
  const curve = new Float32Array(n)
  const k = amount
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x))
  }
  return curve
}

