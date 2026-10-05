// Infected Voices pitch processor (AudioWorklet, ES module), registered as 'iv-pitch-processor'.
// It runs both live and inside OfflineAudioContext renders.
//
// SoundTouch comes from soundtouchjs (LGPL-2.1, https://github.com/cutterbl/SoundTouchJS). It's imported at runtime
// from its own unmodified file, vendor/soundtouchjs/soundtouch.js, which the build copies from node_modules.
// It isn't bundled, inlined or patched, so it can be replaced on its own. The license ships next to it as
// vendor/soundtouchjs/LICENSE.txt and is listed on the About screen.
//
// Two voices share one input:
//   main = input shifted by `pitch` (auto-tune correction, plus the GRIM bias)
//   sub  = input shifted by `pitch·mix + subOffset` (GRIM pitch drop: it follows the main path, so with correction
//          at 0 it drops the dry voice), blended in with `subGain`
//   out  = (dry·(1−mix) + main·mix)·(1−subGain) + sub·subGain
// Each voice is SoundTouch's own Stretch → RateTransposer pipes, composed in stretch-first order (the SoundTouch
// class transposes first when pitching down, which smears deep drops). The library itself is untouched.
//
// Latency (live): WSOLA has to hold `sequence + seek window` of input before it can emit audio, and a bit more
// when pitching down. Each voice keeps the smallest delay that covers its current shift. The delay rises at once
// (a few ms of silence) and falls back after 0.5 s.
// Two WSOLA tiers, both measured on harmonic tones from 85 to 800 Hz:
//   full [20, 14, 10] ms: clean for every voice, ~38 ms
//   fast [14, 10, 6] ms:  clean only above ~150 Hz, ~27 ms
// Live nodes start on `full` and move to `fast` while the detected voice stays above ~165 Hz (setVoiceHz from the
// engine's pitch tracker), then drop back as soon as a lower voice shows up. Offline renders always use `full`
// with a fixed delay, and report it so it can be trimmed.
//
// No silent pass-through. Any failure (forced, exception, stall) posts {type:'error'} every block until the main
// thread acks it. After that the node passes dry audio so the singer can still hear themselves, but the studio
// shows the error.
// processorOptions.schedule = [frame0, semis0, frame1, semis1, ...] drives `pitch` from `currentFrame`, which keeps
// OfflineAudioContext renders deterministic.
import { RateTransposer, Stretch } from './vendor/soundtouchjs/soundtouch.js'

const ENGINE = 'SoundTouch (soundtouchjs 0.3.0, LGPL-2.1)'
const TIERS = { full: [20, 14, 10], fast: [14, 10, 6] } // sequence ms, seek window ms, overlap ms
const MAX_UP = 12
const MARGIN = 128 // one render quantum
const DEADBAND = 96 // frames of delay error tolerated before padding/dropping
const FAST_ON_HZ = 165
const FAST_OFF_HZ = 145

function num(v, fallback) {
  v = Number(v)
  return Number.isFinite(v) ? v : fallback
}

class Voice {
  constructor(tier, maxDown, adaptive) {
    this.stretch = new Stretch(true)
    this.transposer = new RateTransposer(true)
    this.transposer.inputBuffer = this.stretch.outputBuffer
    this.fifo = this.transposer.outputBuffer
    this.maxDown = maxDown
    this.adaptive = adaptive
    this.pitch = 0
    this.consumed = 0
    this.lowFor = 0
    this.underrunFrames = 0
    this.configure(tier)
    this.set(0)
    this.target = adaptive ? this.delayFor(0) : this.delayFor(-maxDown)
  }
  configure(tier) {
    const w = TIERS[tier]
    this.tier = tier
    this.stretch.setParameters(sampleRate, w[0], w[1], w[2])
    this.seq = Math.floor((sampleRate * w[0]) / 1000)
    this.seek = Math.floor((sampleRate * w[1]) / 1000)
    let ovl = Math.max(16, (sampleRate * w[2]) / 1000)
    this.ovl = ovl - (ovl % 8)
  }
  /** Input the stretch must hold before it emits a chunk at this shift, plus one render quantum. */
  delayFor(semis) {
    const tempo = Math.pow(2, Math.max(0, -semis) / 12)
    return Math.ceil(Math.max(tempo * (this.seq - this.ovl) + this.ovl, this.seq) + this.seek + MARGIN)
  }
  set(semis) {
    const v = Math.max(-this.maxDown, Math.min(MAX_UP, num(semis, 0)))
    if (Math.abs(v - this.pitch) < 1e-4 && this.ratio) return
    this.pitch = v
    this.ratio = Math.pow(2, v / 12)
    this.stretch.tempo = 1 / this.ratio
    this.transposer.rate = this.ratio
  }
  retarget(n, force) {
    if (!this.adaptive) return
    const need = this.delayFor(this.pitch)
    if (need > this.target || force) {
      this.target = need
      this.lowFor = 0
    } else if (need < this.target - DEADBAND) {
      this.lowFor += n
      if (this.lowFor > sampleRate * 0.5) {
        this.target = need
        this.lowFor = 0
      }
    } else this.lowFor = 0
  }
  /** Push n interleaved frames, then write n frames to `out` that sit `target` frames behind the input. */
  process(input, out, n, inFrames) {
    this.stretch.inputBuffer.putSamples(input, 0, n)
    this.stretch.process()
    if (this.transposer.inputBuffer.frameCount > 0) this.transposer.process()
    out.fill(0, 0, n * 2)
    if (inFrames < this.target) return 0
    const fifo = this.fifo
    // Content we should have consumed after this block to sit exactly `target` behind the input.
    let need = inFrames - this.target - this.consumed
    if (need > n + DEADBAND) {
      // Behind (delay shrank, or recovering from an underrun): skip content.
      const drop = Math.min(need - n, fifo.frameCount)
      if (drop > 0) {
        fifo.receive(drop)
        this.consumed += drop
      }
      need = inFrames - this.target - this.consumed
    }
    let pad = 0
    let read = n
    if (need < n - DEADBAND) {
      // Ahead (delay grew): emit a little silence instead of content.
      read = Math.max(0, need)
      pad = n - read
    }
    read = Math.min(read, fifo.frameCount)
    if (read > 0) {
      fifo.receiveSamples(out.subarray(pad * 2), read)
      this.consumed += read
    }
    if (pad + read < n) this.underrunFrames += n - pad - read
    return read
  }
}

class IvPitchProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const o = (options && options.processorOptions) || {}
    this.mix = o.mix == null ? 1 : Math.max(0, Math.min(1, Number(o.mix)))
    this.subOffset = num(o.subOffset, 0)
    this.subGain = Math.max(0, Math.min(1, Number(o.subGain) || 0))
    this.schedule = o.schedule && o.schedule.length >= 2 ? Float32Array.from(o.schedule) : null
    this.scheduleIdx = 0
    this.alive = true
    this.failed = null
    this.errorAcked = false
    this.port.onmessage = (e) => this.onMessage(e.data || {})
    try {
      // Live: adaptive delay, auto tier. Offline (schedule present or adaptive:false): fixed delay, full tier.
      this.adaptive = o.adaptive == null ? !this.schedule : !!o.adaptive
      this.autoTier = this.adaptive && o.tier !== 'full'
      this.fastVotes = 0
      const tier = 'full'
      this.main = new Voice(tier, num(o.mainMaxDown, 12), this.adaptive)
      this.sub = new Voice(tier, num(o.subMaxDown, 24), this.adaptive)
      this.pitch = 0
      this.setPitch(o.pitch || 0)
      this.main.retarget(0, true)
      this.sub.retarget(0, true)
      this.dryCap = Math.ceil(sampleRate) // up to 1 s of dry delay
      this.dry = [new Float32Array(this.dryCap), new Float32Array(this.dryCap)]
      this.dryPos = 0
      this.inFrames = 0
      this.scratch = new Float32Array(256)
      this.outA = new Float32Array(256)
      this.outB = new Float32Array(256)
      this.silentWet = 0
      if (o.forceFail) this.fail('Pitch shifter forced to fail (test hook)')
      else this.port.postMessage({ type: 'initialized', engine: ENGINE, latency: this.alignedLatency(), outputDelay: this.main.target, subLatency: this.sub.target, sampleRate })
    } catch (e) {
      this.fail('SoundTouch init failed: ' + (e && e.message ? e.message : String(e)))
    }
  }

  // WSOLA takes each segment from up to one seek window ahead, so on steady voiced material the content comes out
  // ~0.6 seek windows earlier than the output delay (measured). The dry path is delayed by this aligned figure,
  // and offline renders trim it.
  alignedLatency() {
    return Math.max(1, this.main.target - Math.round(0.6 * this.main.seek))
  }

  setPitch(semis) {
    this.pitch = num(semis, 0)
    this.main.set(this.pitch)
    this.sub.set(this.pitch * this.mix + this.subOffset)
  }

  setTier(tier) {
    if (this.main.tier === tier) return
    this.main.configure(tier)
    this.sub.configure(tier)
    this.main.retarget(0, true)
    this.sub.retarget(0, true)
  }

  /** Engine pitch tracker → tier choice: go fast after ~0.3 s above FAST_ON_HZ, back to full quickly below FAST_OFF_HZ. */
  voiceHz(hz) {
    if (!this.autoTier || !(hz > 0)) return
    if (hz >= FAST_ON_HZ) this.fastVotes = Math.min(30, this.fastVotes + 1)
    else if (hz < FAST_OFF_HZ) this.fastVotes = Math.max(-30, this.fastVotes - 3)
    if (this.main.tier === 'full' && this.fastVotes >= 18) this.setTier('fast')
    else if (this.main.tier === 'fast' && this.fastVotes <= -6) this.setTier('full')
  }

  fail(message) {
    if (this.failed) return
    this.failed = message
    this.port.postMessage({ type: 'error', message })
  }

  onMessage(d) {
    switch (d.type) {
      case 'setPitch':
        if (!this.failed) this.setPitch(d.value)
        break
      case 'setSub':
        this.subOffset = num(d.offset, 0)
        this.subGain = Math.max(0, Math.min(1, Number(d.gain) || 0))
        if (!this.failed) this.setPitch(this.pitch)
        break
      case 'setMix':
        this.mix = Math.max(0, Math.min(1, Number(d.value) || 0))
        if (!this.failed) this.setPitch(this.pitch)
        break
      case 'setVoiceHz':
        if (!this.failed) this.voiceHz(Number(d.value))
        break
      case 'ackError':
        this.errorAcked = true
        break
      case 'forceFail':
        this.fail(String(d.value || 'Pitch shifter forced to fail (test hook)'))
        break
      case 'getInfo':
        if (this.failed) this.port.postMessage({ type: 'error', message: this.failed })
        else
          this.port.postMessage({
            type: 'info',
            engine: ENGINE,
            tier: this.main.tier,
            latency: this.alignedLatency(),
            outputDelay: this.main.target,
            subLatency: this.sub.target,
            pitch: this.pitch,
            subOffset: this.subOffset,
            subGain: this.subGain,
            underrunFrames: this.main.underrunFrames,
          })
        break
      case 'dispose':
        this.alive = false
        break
    }
  }

  applySchedule() {
    const s = this.schedule
    let i = this.scheduleIdx
    while (i + 2 < s.length && s[i + 2] <= currentFrame) i += 2
    this.scheduleIdx = i
    if (Math.abs(s[i + 1] - this.pitch) > 1e-4) this.setPitch(s[i + 1])
  }

  passDry(inL, inR, outL, outR) {
    if (inL) {
      outL.set(inL)
      if (outR !== outL) outR.set(inR)
    } else {
      outL.fill(0)
      if (outR !== outL) outR.fill(0)
    }
    if (!this.errorAcked) this.port.postMessage({ type: 'error', message: this.failed })
  }

  process(inputs, outputs) {
    const input = inputs[0] || []
    const output = outputs[0] || []
    const outL = output[0]
    if (!outL) return this.alive
    const outR = output[1] || outL
    const n = outL.length
    const inL0 = input[0]
    const inR0 = input[1] || inL0
    if (this.failed) {
      this.passDry(inL0, inR0, outL, outR)
      return this.alive
    }
    try {
      if (this.schedule) this.applySchedule()
      if (this.scratch.length < n * 2) {
        this.scratch = new Float32Array(n * 2)
        this.outA = new Float32Array(n * 2)
        this.outB = new Float32Array(n * 2)
      }
      const s = this.scratch
      let inPeak = 0
      for (let i = 0; i < n; i++) {
        const l = inL0 ? inL0[i] : 0
        const r = inR0 ? inR0[i] : 0
        s[i * 2] = l
        s[i * 2 + 1] = r
        const a = (l < 0 ? -l : l) + (r < 0 ? -r : r)
        if (a > inPeak) inPeak = a
      }
      this.inFrames += n
      this.main.retarget(n, false)
      this.sub.retarget(n, false)
      this.main.process(s, this.outA, n, this.inFrames)
      this.sub.process(s, this.outB, n, this.inFrames)
      const started = this.inFrames >= this.main.target
      const a = this.outA
      const b = this.outB
      // Ramp mix and sub gain over ~10 ms so control changes (GRIM on/off, correction amount) don't click.
      const step = 1 / (0.01 * sampleRate)
      let mix = this.curMix == null ? this.mix : this.curMix
      let g = this.curSub == null ? this.subGain : this.curSub
      const cap = this.dryCap
      const dryDelay = Math.min(cap - 1, this.alignedLatency())
      const dl = this.dry[0]
      const dr = this.dry[1]
      let wetPeak = 0
      for (let i = 0; i < n; i++) {
        const w = this.dryPos
        dl[w] = s[i * 2]
        dr[w] = s[i * 2 + 1]
        let rp = w - dryDelay
        if (rp < 0) rp += cap
        const dL = dl[rp]
        const dR = dr[rp]
        this.dryPos = w + 1 === cap ? 0 : w + 1
        if (mix !== this.mix) mix = Math.abs(this.mix - mix) <= step ? this.mix : mix + (this.mix > mix ? step : -step)
        if (g !== this.subGain) g = Math.abs(this.subGain - g) <= step ? this.subGain : g + (this.subGain > g ? step : -step)
        const aL = a[i * 2]
        const aR = a[i * 2 + 1]
        const m = (aL < 0 ? -aL : aL) + (aR < 0 ? -aR : aR)
        if (m > wetPeak) wetPeak = m
        outL[i] = (dL * (1 - mix) + aL * mix) * (1 - g) + b[i * 2] * g
        if (outR !== outL) outR[i] = (dR * (1 - mix) + aR * mix) * (1 - g) + b[i * 2 + 1] * g
      }
      this.curMix = mix
      this.curSub = g
      // Watchdog: 0.25 s of non-silent input with no wet output once running is a hard failure.
      if (started && this.inFrames > this.main.target * 2 && inPeak > 1e-3 && wetPeak < 1e-6) this.silentWet += n
      else if (wetPeak >= 1e-6) this.silentWet = 0
      if (this.silentWet > sampleRate * 0.25) this.fail('Pitch shifter stalled: SoundTouch returned no audio for 0.25 s of non-silent input')
    } catch (e) {
      this.fail('SoundTouch process failed: ' + (e && e.message ? e.message : String(e)))
      this.passDry(inL0, inR0, outL, outR)
    }
    return this.alive
  }
}

registerProcessor('iv-pitch-processor', IvPitchProcessor)
