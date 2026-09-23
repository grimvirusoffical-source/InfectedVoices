import * as Tone from 'tone'
import { BungeePitchShift } from 'bungee-pitch-shift'
import { OfflineProcessor } from 'bungee-pitch-shift/worker'
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
  private correct?: BungeePitchShift
  private grimShift?: BungeePitchShift
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
    await Tone.start()
    const toneCtx = Tone.getContext()
    this.nativeCtx = toneCtx.rawContext as AudioContext

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
    // Safety ceiling at -1 dB. Lead defaults sit around -12 to -6 dBFS so this is not already limiting at idle.
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

    // Bungee: detect→snap correction + optional GRIM dual low-shift
    this.correct = await BungeePitchShift.create(this.nativeCtx, {
      workletPath: publicAsset('bungee-processor-bundled.js'),
      initialPitch: 0,
      initialSpeed: 1,
      initialMix: 0.85,
    })
    this.grimShift = await BungeePitchShift.create(this.nativeCtx, {
      workletPath: publicAsset('bungee-processor-bundled.js'),
      initialPitch: 0,
      initialSpeed: 1,
      initialMix: 0,
    })

    this.analyser = this.nativeCtx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyseBuf = new Float32Array(this.analyser.fftSize)

    // Mic → gate → tap → Bungee correct → GRIM dual-shift → Tone FX
    this.micGain.connect(this.gate)
    const tap = new Tone.Gain(1)
    this.gate.connect(tap)
    Tone.connect(tap, this.correct.node)
    this.correct.node.connect(this.grimShift.node)
    const fromNative = new Tone.Gain(1)
    this.grimShift.node.connect(fromNative.input)
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

  private tick = () => {
    const pos = Tone.getTransport().seconds
    this.onTick?.(pos)
    this.runPitchDetect()
    this.raf = requestAnimationFrame(this.tick)
  }

  /** Sample peak of the pre-FX tap. Null until the engine is running. */
  samplePeakDb() {
    if (!this.analyser || !this.analyseBuf) return null
    this.analyser.getFloatTimeDomainData(this.analyseBuf as unknown as Float32Array<ArrayBuffer>)
    let peak = 0
    for (let i = 0; i < this.analyseBuf.length; i++) peak = Math.max(peak, Math.abs(this.analyseBuf[i]))
    if (peak < 1e-8) return Number.NEGATIVE_INFINITY
    return 20 * Math.log10(peak)
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
    this.correct.setMix(Math.max(0.05, Math.min(1, s.correction / 100)))

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
    this.warmthEq!.gain.rampTo((s.warmth / 100) * 8, 0.05)
    this.deessFilter!.gain.rampTo(-(s.deess / 100) * 12, 0.05)
    this.glitchDelay!.wet.rampTo(s.grimOn ? (s.glitch / 100) * 0.55 : (s.glitch / 100) * 0.2, 0.05)
    this.glitchDelay!.feedback.rampTo(0.15 + (s.glitch / 100) * 0.45, 0.05)
    this.grit!.distortion = Math.min(0.85, (s.grit / 100) * 0.7 + (s.grimOn ? 0.1 : 0))
    this.echo!.wet.rampTo(s.echo / 100, 0.05)
    this.echo!.feedback.rampTo(0.05 + (s.echo / 100) * 0.35, 0.05)
    this.space!.wet.rampTo((s.space / 100) * (s.acapella ? 0.55 : 0.35), 0.08)
    this.compressor!.threshold.rampTo(-12 - (s.compress / 100) * 18, 0.05)
    this.compressor!.ratio.value = 2 + (s.compress / 100) * 6
    this.gate!.threshold = -60 + (s.gate / 100) * 40
    const outLin = Math.pow(10, s.outputDb / 20)
    this.masterOut!.gain.rampTo(outLin, 0.05)
    this.wetGain!.gain.rampTo(1, 0.05)
    if (this.correct) this.correct.setMix(Math.max(0.05, Math.min(1, s.correction / 100)))
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
    await Tone.loaded()
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

  /** Offline: frame-wise YIN→snap via Bungee segments + GRIM FX bounce */
  async processOfflineBuffer(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    const s = this.settings
    const offline = new OfflineProcessor({
      workerPath: publicAsset('audio-processor.worker.bundle.js'),
      workletPath: publicAsset('bungee-processor-bundled.js'),
    })
    const sr = audioBuffer.sampleRate
    const ch0 = audioBuffer.getChannelData(0)
    const frame = Math.floor(sr * 0.12) // ~120ms windows
    const hop = frame
    const mix = Math.max(0.1, Math.min(1, s.correction / 100))
    const grim = s.grimOn ? -(s.depth / 100) * 7 : 0
    const formant = (s.formant / 100) * 2
    const parts: AudioBuffer[] = []

    for (let i = 0; i < ch0.length; i += hop) {
      const len = Math.min(frame, ch0.length - i)
      if (len < 256) break
      const slice = new AudioBuffer({
        length: len,
        numberOfChannels: audioBuffer.numberOfChannels,
        sampleRate: sr,
      })
      for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
        slice.getChannelData(c).set(audioBuffer.getChannelData(c).subarray(i, i + len))
      }
      const hz = yinDetect(slice.getChannelData(0), sr)
      const snap = snapSemitones(hz, s.key, s.scale, 8)
      const pitch = (snap ?? 0) + grim * 0.4 + formant
      const shifted = await offline.process(slice, { pitch, speed: 1, mix })
      parts.push(shifted)
    }
    offline.dispose?.()

    const total = parts.reduce((n, b) => n + b.length, 0) || audioBuffer.length
    const channels = audioBuffer.numberOfChannels
    const joined = new AudioBuffer({ length: total, numberOfChannels: channels, sampleRate: sr })
    let writeAt = 0
    for (const part of parts) {
      for (let c = 0; c < channels; c++) {
        joined.getChannelData(c).set(part.getChannelData(Math.min(c, part.numberOfChannels - 1)), writeAt)
      }
      writeAt += part.length
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

  /** Stretch a recorded buffer to target duration (pitch-preserving Bungee) */
  async stretchBufferToDuration(audioBuffer: AudioBuffer, targetSec: number): Promise<AudioBuffer> {
    const speed = Math.min(2, Math.max(0.5, audioBuffer.duration / Math.max(0.05, targetSec)))
    const offline = new OfflineProcessor({
      workerPath: publicAsset('audio-processor.worker.bundle.js'),
      workletPath: publicAsset('bungee-processor-bundled.js'),
    })
    const out = await offline.process(audioBuffer, { pitch: 0, speed, mix: 1 })
    offline.dispose?.()
    return out
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

