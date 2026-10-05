
/* ===== INFECTED VOICES BUNGEE PROCESSOR (Core) ===== */
// Replaces bungee-pitch-shift 1.0.8's processor, which never got `_malloc`/`HEAPF32` from its
// Emscripten module and so silently passed audio through.
// Rules:
// - The WASM is instantiated once per worklet scope and every node waits for it. Until it's ready the node outputs silence.
// - On any failure (load, init, process, or a stall where non-silent input yields no wet output) the node
//   posts {type:'error'} every block until the main thread acks it. After that it passes dry audio through so the
//   singer can still hear themselves, but the studio shows the error. It never passes audio through silently.
// - Dry is delayed by the measured Bungee latency, so wet/dry mixes don't comb-filter.
// - processorOptions.schedule = Float32Array [frame0, semis0, frame1, semis1, ...] drives pitch from
//   `currentFrame`, which keeps OfflineAudioContext renders deterministic.
let ivBungeeModule = null
let ivBungeeError = null
const ivBungeeReady = createBungeeModule().then(
  (m) => {
    if (typeof m._malloc !== 'function' || !m.HEAPF32) throw new Error('Bungee WASM exports missing (_malloc/HEAPF32)')
    ivBungeeModule = m
    return m
  },
  (e) => { throw e },
).catch((e) => {
  ivBungeeError = e instanceof Error ? e.message : String(e)
  throw e
})

class IvBungeeProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const o = (options && options.processorOptions) || {}
    this.channels = 2
    this.block = 128
    this.pitch = Number(o.pitch) || 0
    this.speed = Number(o.speed) || 1
    this.mix = o.mix == null ? 1 : Math.max(0, Math.min(1, Number(o.mix)))
    this.schedule = o.schedule ? Float32Array.from(o.schedule) : null
    this.scheduleIdx = 0
    this.forceFail = !!o.forceFail
    this.ready = false
    this.failed = null
    this.errorAcked = false
    this.alive = true
    this.dryDelay = null
    this.dryPos = 0
    this.port.onmessage = (e) => this.onMessage(e.data || {})
    if (this.forceFail) {
      this.fail('Pitch shifter forced to fail (test hook)')
      return
    }
    ivBungeeReady.then(() => this.setup()).catch(() => this.fail('Bungee WASM failed to load: ' + (ivBungeeError || 'unknown')))
  }

  setup() {
    try {
      const M = ivBungeeModule
      this.inst = new M.BungeeWrapper(sampleRate, this.channels, this.block)
      this.latency = Math.max(0, Math.round(this.inst.getLatency()))
      // Output buffer is sized generously in case Bungee emits more than one block at once.
      this.inCap = this.block * this.channels
      this.outCap = this.block * 8 * this.channels
      this.inPtr = M._malloc(this.inCap * 4)
      this.outPtr = M._malloc(this.outCap * 4)
      if (!this.inPtr || !this.outPtr) throw new Error('Bungee WASM malloc returned null')
      this.inst.setPitchSemitones(this.pitch)
      this.inst.setSpeed(this.speed)
      const d = Math.max(1, this.latency)
      this.dryDelay = [new Float32Array(d), new Float32Array(d)]
      this.fifo = [new Float32Array(this.block * 16), new Float32Array(this.block * 16)]
      this.fifoLen = 0
      this.ready = true
      this.port.postMessage({ type: 'initialized', version: this.inst.getVersion(), edition: this.inst.getEdition(), latency: this.latency, sampleRate })
    } catch (e) {
      this.fail('Bungee init failed: ' + (e && e.message ? e.message : String(e)))
    }
  }

  fail(message) {
    this.failed = message
    this.ready = false
    this.port.postMessage({ type: 'error', message })
  }

  onMessage(d) {
    switch (d.type) {
      case 'setPitch':
        this.pitch = Number(d.value) || 0
        if (this.ready) this.inst.setPitchSemitones(this.pitch)
        break
      case 'setSpeed':
        this.speed = Number(d.value) || 1
        if (this.ready) this.inst.setSpeed(this.speed)
        break
      case 'setMix':
        this.mix = Math.max(0, Math.min(1, Number(d.value)))
        break
      case 'reset':
        if (this.ready) this.inst.reset()
        break
      case 'ackError':
        this.errorAcked = true
        break
      case 'forceFail':
        this.fail(String(d.value || 'Pitch shifter forced to fail (test hook)'))
        break
      case 'getInfo':
        if (this.ready) this.port.postMessage({ type: 'info', version: this.inst.getVersion(), edition: this.inst.getEdition(), latency: this.latency })
        else if (this.failed) this.port.postMessage({ type: 'error', message: this.failed })
        break
      case 'dispose':
        this.alive = false
        break
    }
  }

  // Stall detector: Bungee 1.0.8's wrapper stops emitting audio after a few blocks. Treat ~0.25 s of
  // non-silent input with no wet output, after warm-up, as a hard failure.
  watchStall(inL, take) {
    this.blocks = (this.blocks || 0) + 1
    let inPeak = 0
    for (let i = 0; i < inL.length; i++) { const a = inL[i] < 0 ? -inL[i] : inL[i]; if (a > inPeak) inPeak = a }
    let wetPeak = 0
    for (let i = 0; i < take; i++) { const a = Math.abs(this.fifo[0][i]) + Math.abs(this.fifo[1][i]); if (a > wetPeak) wetPeak = a }
    const warm = this.blocks > Math.ceil((this.latency + sampleRate * 0.05) / this.block)
    if (warm && inPeak > 1e-3 && wetPeak < 1e-6) this.stalled = (this.stalled || 0) + 1
    else if (wetPeak >= 1e-6) this.stalled = 0
    if ((this.stalled || 0) * this.block > sampleRate * 0.25) {
      this.fail('Pitch shifter stalled: Bungee returned no audio for 0.25 s of non-silent input')
    }
  }

  applySchedule() {
    const s = this.schedule
    if (!s || s.length < 2) return
    let i = this.scheduleIdx
    while (i + 2 < s.length && s[i + 2] <= currentFrame) i += 2
    this.scheduleIdx = i
    const semis = s[i + 1]
    if (semis !== this.pitch) {
      this.pitch = semis
      this.inst.setPitchSemitones(semis)
    }
  }

  process(inputs, outputs) {
    const input = inputs[0] || []
    const output = outputs[0] || []
    const outL = output[0]
    const outR = output[1] || output[0]
    if (!outL) return this.alive
    const n = outL.length
    if (!this.ready) {
      if (this.failed) {
        const inL0 = input[0]
        const inR0 = input[1] || inL0
        if (inL0) { outL.set(inL0); if (outR !== outL) outR.set(inR0) } else { outL.fill(0); if (outR !== outL) outR.fill(0) }
        if (!this.errorAcked) this.port.postMessage({ type: 'error', message: this.failed })
      } else {
        outL.fill(0)
        if (outR !== outL) outR.fill(0)
      }
      return this.alive
    }
    const inL = input[0] || new Float32Array(n)
    const inR = input[1] || inL
    if (this.schedule) this.applySchedule()
    const M = ivBungeeModule
    try {
      let heap = M.HEAPF32
      let base = this.inPtr >> 2
      for (let i = 0; i < n; i++) {
        heap[base + i * 2] = inL[i]
        heap[base + i * 2 + 1] = inR[i]
      }
      const got = this.inst.process(this.inPtr, this.outPtr, n)
      heap = M.HEAPF32
      base = this.outPtr >> 2
      // The streaming graph is 1:1 (one block in, one block out). Bungee 1.0.8 reports 512 for every call no matter how many frames it wrote, so clamp to the block.
      const frames = Math.max(0, Math.min(got | 0, n, this.outCap / 2, this.fifo[0].length - this.fifoLen))
      for (let i = 0; i < frames; i++) {
        this.fifo[0][this.fifoLen + i] = heap[base + i * 2]
        this.fifo[1][this.fifoLen + i] = heap[base + i * 2 + 1]
      }
      this.fifoLen += frames
    } catch (e) {
      this.fail('Bungee process failed: ' + (e && e.message ? e.message : String(e)))
      outL.fill(0)
      if (outR !== outL) outR.fill(0)
      return this.alive
    }
    const take = Math.min(n, this.fifoLen)
    this.watchStall(inL, take)
    if (!this.ready) return this.alive
    const dl = this.dryDelay
    const D = dl[0].length
    const wet = this.mix
    const dry = 1 - wet
    for (let i = 0; i < n; i++) {
      const p = this.dryPos
      const dL = dl[0][p]
      const dR = dl[1][p]
      dl[0][p] = inL[i]
      dl[1][p] = inR[i]
      this.dryPos = p + 1 === D ? 0 : p + 1
      const wL = i < take ? this.fifo[0][i] : 0
      const wR = i < take ? this.fifo[1][i] : 0
      outL[i] = dL * dry + wL * wet
      if (outR !== outL) outR[i] = dR * dry + wR * wet
    }
    if (take > 0) {
      this.fifo[0].copyWithin(0, take, this.fifoLen)
      this.fifo[1].copyWithin(0, take, this.fifoLen)
      this.fifoLen -= take
    }
    return this.alive
  }
}

registerProcessor('iv-bungee-processor', IvBungeeProcessor)
