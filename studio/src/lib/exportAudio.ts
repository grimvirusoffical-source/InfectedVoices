import { Mp3Encoder } from '@breezystack/lamejs'

export type WavBits = 16 | 24

/** Free stays 16-bit. Basic and Pro default to 48 kHz / 24-bit. */
export function exportSpec(tier: string): { sampleRate: number; bits: WavBits; label: string } {
  if (tier === 'basic' || tier === 'pro') return { sampleRate: 48000, bits: 24, label: '48 kHz · 24-bit WAV' }
  return { sampleRate: 44100, bits: 16, label: '16-bit WAV' }
}

export async function exportMasterWav(buffer: AudioBuffer, tier: string): Promise<{ blob: Blob; label: string }> {
  const spec = exportSpec(tier)
  const matched = await matchSampleRate(buffer, spec.sampleRate)
  return { blob: await audioBufferToWav(matched, spec.bits), label: spec.label }
}

export async function audioBufferToWav(buffer: AudioBuffer, bits: WavBits = 16): Promise<Blob> {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1
  const bitDepth = bits
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample
  const dataLength = buffer.length * blockAlign
  const headerLength = 44
  const arrayBuffer = new ArrayBuffer(headerLength + dataLength)
  const view = new DataView(arrayBuffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c))

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = Math.max(-1, Math.min(1, channels[c][i]))
      if (bitDepth === 16) {
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        view.setInt16(offset, Math.round(sample), true)
        offset += 2
      } else {
        sample = sample < 0 ? sample * 0x800000 : sample * 0x7fffff
        const intSample = Math.round(sample)
        view.setUint8(offset, intSample & 0xff)
        view.setUint8(offset + 1, (intSample >> 8) & 0xff)
        view.setUint8(offset + 2, (intSample >> 16) & 0xff)
        offset += 3
      }
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

export async function blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const ctx = new AudioContext()
  const ab = await blob.arrayBuffer()
  try {
    return await ctx.decodeAudioData(ab.slice(0))
  } finally {
    await ctx.close()
  }
}

export async function audioBufferToMp3(buffer: AudioBuffer, kbps = 192): Promise<Blob> {
  // lamejs expects 16-bit PCM; mix to mono or stereo interleaved
  const channels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const left = buffer.getChannelData(0)
  const right = channels > 1 ? buffer.getChannelData(1) : left
  const encoder = new Mp3Encoder(2, sampleRate, kbps)
  const block = 1152
  const parts: BlobPart[] = []
  for (let i = 0; i < left.length; i += block) {
    const l = floatTo16BitPCM(left.subarray(i, i + block))
    const r = floatTo16BitPCM(right.subarray(i, i + block))
    const mp3buf = encoder.encodeBuffer(l, r)
    if (mp3buf.length > 0) parts.push(new Uint8Array(mp3buf))
  }
  const end = encoder.flush()
  if (end.length > 0) parts.push(new Uint8Array(end))
  return new Blob(parts, { type: 'audio/mpeg' })
}

function floatTo16BitPCM(input: Float32Array) {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function rms(buffer: AudioBuffer) {
  let sum = 0
  let n = 0
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i]
      n++
    }
  }
  return Math.sqrt(sum / Math.max(1, n))
}

async function matchSampleRate(buffer: AudioBuffer, sampleRate: number) {
  if (buffer.sampleRate === sampleRate) return buffer
  const length = Math.max(1, Math.ceil(buffer.duration * sampleRate))
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, length, sampleRate)
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.connect(ctx.destination)
  src.start()
  return ctx.startRendering()
}

/** Ultimate Mic Master: duck beat under vocal, compress, soft sat, ceiling */
export async function micMasterMix(
  vocal: AudioBuffer,
  beat: AudioBuffer,
): Promise<AudioBuffer> {
  const sampleRate = vocal.sampleRate
  const length = Math.max(vocal.length, beat.length)
  const offline = new OfflineAudioContext(2, length, sampleRate)

  const vSrc = offline.createBufferSource()
  vSrc.buffer = vocal
  const bSrc = offline.createBufferSource()
  // resample-ish: if beat shorter/longer just play
  bSrc.buffer = beat

  const vGain = offline.createGain()
  vGain.gain.value = 1.05
  const bGain = offline.createGain()
  bGain.gain.value = 0.72

  // Sidechain-ish duck: analyze vocal RMS in blocks and duck beat
  const vData = vocal.getChannelData(0)
  const blockSize = Math.floor(sampleRate * 0.02)
  for (let i = 0; i < length; i += blockSize) {
    let sum = 0
    const end = Math.min(i + blockSize, vData.length)
    for (let j = i; j < end; j++) sum += vData[j] * vData[j]
    const rms = Math.sqrt(sum / Math.max(1, end - i))
    const duck = rms > 0.04 ? Math.max(0.28, 1 - rms * 2.2) : 1
    const t = i / sampleRate
    bGain.gain.setValueAtTime(0.72 * duck, t)
  }

  const comp = offline.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.knee.value = 8
  comp.ratio.value = 3.5
  comp.attack.value = 0.01
  comp.release.value = 0.2

  const shaper = offline.createWaveShaper()
  shaper.curve = softSatCurve()
  shaper.oversample = '2x'

  const limiter = offline.createDynamicsCompressor()
  limiter.threshold.value = -1.2
  limiter.ratio.value = 20
  limiter.attack.value = 0.001
  limiter.release.value = 0.05

  const master = offline.createGain()
  master.gain.value = 0.95

  vSrc.connect(vGain)
  bSrc.connect(bGain)
  vGain.connect(comp)
  bGain.connect(comp)
  comp.connect(shaper)
  shaper.connect(limiter)
  limiter.connect(master)
  master.connect(offline.destination)

  vSrc.start()
  bSrc.start()
  return await offline.startRendering()
}

/**
 * SMART MIX+MASTER
 * Balance the vocal against the beat, duck the beat while the voice is present,
 * then bus-compress, soften, and limit. This is a browser bus aimed near a
 * streaming loudness, not a substitute for a dedicated mastering room.
 */
export async function smartMixMaster(vocalIn: AudioBuffer, beatIn: AudioBuffer): Promise<AudioBuffer> {
  const sampleRate = vocalIn.sampleRate
  const vocal = vocalIn
  const beat = await matchSampleRate(beatIn, sampleRate)
  const length = Math.max(vocal.length, beat.length)
  const vocalRms = Math.max(1e-5, rms(vocal))
  const beatRms = Math.max(1e-5, rms(beat))
  const vocalGain = Math.max(0.4, Math.min(2.4, 0.18 / vocalRms))
  const beatGain = Math.max(0.25, Math.min(1.6, 0.11 / beatRms))

  const offline = new OfflineAudioContext(2, length, sampleRate)
  const vSrc = offline.createBufferSource()
  vSrc.buffer = vocal
  const bSrc = offline.createBufferSource()
  bSrc.buffer = beat

  const vGain = offline.createGain()
  vGain.gain.value = vocalGain
  const bGain = offline.createGain()
  bGain.gain.value = beatGain

  const vData = vocal.getChannelData(0)
  const blockSize = Math.floor(sampleRate * 0.02)
  for (let i = 0; i < length; i += blockSize) {
    let sum = 0
    const end = Math.min(i + blockSize, vData.length)
    for (let j = i; j < end; j++) sum += vData[j] * vData[j]
    const blockRms = Math.sqrt(sum / Math.max(1, end - i))
    const duck = blockRms > 0.035 ? Math.max(0.22, 1 - blockRms * 2.4) : 1
    bGain.gain.setValueAtTime(beatGain * duck, i / sampleRate)
  }

  const hipass = offline.createBiquadFilter()
  hipass.type = 'highpass'
  hipass.frequency.value = 32
  const presence = offline.createBiquadFilter()
  presence.type = 'peaking'
  presence.frequency.value = 3200
  presence.Q.value = 0.8
  presence.gain.value = 1.5

  const comp = offline.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.knee.value = 6
  comp.ratio.value = 2.6
  comp.attack.value = 0.012
  comp.release.value = 0.18

  const shaper = offline.createWaveShaper()
  shaper.curve = softSatCurve()
  shaper.oversample = '2x'

  const limiter = offline.createDynamicsCompressor()
  limiter.threshold.value = -1.5
  limiter.knee.value = 0
  limiter.ratio.value = 20
  limiter.attack.value = 0.001
  limiter.release.value = 0.05

  const master = offline.createGain()
  master.gain.value = 0.92

  vSrc.connect(vGain)
  bSrc.connect(bGain)
  vGain.connect(hipass)
  bGain.connect(hipass)
  hipass.connect(presence)
  presence.connect(comp)
  comp.connect(shaper)
  shaper.connect(limiter)
  limiter.connect(master)
  master.connect(offline.destination)
  vSrc.start()
  bSrc.start()
  return offline.startRendering()
}

export interface MicMasterOptions {
  beatVolume: number
  loudness: number
  headroomDb: number
  ducking: number
  width: number
  tone: number
  vocalsOnly: boolean
}

/** Ultimate Mic Master with the Vocal Lab 0.4.1 control surface. */
export async function ultimateMicMaster(
  vocalIn: AudioBuffer,
  beatIn: AudioBuffer,
  options: MicMasterOptions,
): Promise<AudioBuffer> {
  const sampleRate = vocalIn.sampleRate
  const beat = await matchSampleRate(beatIn, sampleRate)
  const length = Math.max(vocalIn.length, options.vocalsOnly ? vocalIn.length : beat.length)
  const offline = new OfflineAudioContext(2, length, sampleRate)
  const vocal = offline.createBufferSource()
  vocal.buffer = vocalIn
  const beatSrc = offline.createBufferSource()
  beatSrc.buffer = beat
  const vocalGain = offline.createGain()
  vocalGain.gain.value = 0.7 + (options.loudness / 100) * 0.7
  const baseBeat = options.vocalsOnly ? 0 : Math.max(0, Math.min(1.2, options.beatVolume))
  const beatGain = offline.createGain()
  beatGain.gain.value = baseBeat
  const data = vocalIn.getChannelData(0)
  const block = Math.floor(sampleRate * 0.02)
  const duckDepth = Math.max(0, Math.min(1, options.ducking / 100))
  for (let i = 0; i < data.length; i += block) {
    let sum = 0
    const end = Math.min(i + block, data.length)
    for (let j = i; j < end; j++) sum += data[j] * data[j]
    const level = Math.sqrt(sum / Math.max(1, end - i))
    const duck = level > 0.03 ? 1 - duckDepth * Math.min(0.78, level * 2) : 1
    beatGain.gain.setValueAtTime(baseBeat * duck, i / sampleRate)
  }
  const tone = offline.createBiquadFilter()
  tone.type = 'peaking'
  tone.frequency.value = 2800
  tone.Q.value = 0.7
  tone.gain.value = (options.tone - 50) / 8
  const width = Math.max(0, Math.min(100, options.width)) / 100
  const delay = offline.createDelay(0.03)
  delay.delayTime.value = 0.012 * width
  const wide = offline.createGain()
  wide.gain.value = width * 0.35
  const merger = offline.createChannelMerger(2)
  const limiter = offline.createDynamicsCompressor()
  limiter.threshold.value = -Math.max(0.3, options.headroomDb)
  limiter.knee.value = 0
  limiter.ratio.value = 18
  limiter.attack.value = 0.002
  limiter.release.value = 0.08
  vocal.connect(vocalGain)
  beatSrc.connect(beatGain)
  vocalGain.connect(tone)
  beatGain.connect(tone)
  tone.connect(merger, 0, 0)
  tone.connect(merger, 0, 1)
  tone.connect(delay)
  delay.connect(wide)
  wide.connect(merger, 0, 1)
  merger.connect(limiter)
  limiter.connect(offline.destination)
  vocal.start()
  if (!options.vocalsOnly) beatSrc.start()
  return offline.startRendering()
}

function softSatCurve() {
  const n = 44100
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = Math.tanh(x * 1.4)
  }
  return curve
}
