/** Time-shift an AudioBuffer by offsetSec (positive = delay / insert silence at start) */
export function shiftAudioBuffer(buffer: AudioBuffer, offsetSec: number): AudioBuffer {
  const sr = buffer.sampleRate
  const shiftSamples = Math.round(offsetSec * sr)
  const channels = buffer.numberOfChannels
  if (shiftSamples === 0) return buffer

  if (shiftSamples > 0) {
    const length = buffer.length + shiftSamples
    const out = new AudioBuffer({ length, numberOfChannels: channels, sampleRate: sr })
    for (let c = 0; c < channels; c++) {
      const src = buffer.getChannelData(c)
      const dst = out.getChannelData(c)
      dst.set(src, shiftSamples)
    }
    return out
  }

  // Negative: trim from start
  const trim = Math.min(buffer.length, -shiftSamples)
  const length = Math.max(1, buffer.length - trim)
  const out = new AudioBuffer({ length, numberOfChannels: channels, sampleRate: sr })
  for (let c = 0; c < channels; c++) {
    out.getChannelData(c).set(buffer.getChannelData(c).subarray(trim))
  }
  return out
}

/** Build peaks for UI waveform */
export function bufferPeaks(buffer: AudioBuffer, buckets = 120): number[] {
  const data = buffer.getChannelData(0)
  const step = Math.floor(data.length / buckets) || 1
  const peaks: number[] = []
  for (let i = 0; i < buckets; i++) {
    let m = 0
    const start = i * step
    for (let j = start; j < start + step && j < data.length; j++) m = Math.max(m, Math.abs(data[j]))
    peaks.push(m)
  }
  return peaks
}
