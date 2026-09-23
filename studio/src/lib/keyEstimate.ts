const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

export interface KeyGuess {
  key: (typeof NAMES)[number]
  scale: 'major' | 'naturalMinor'
}

function goertzelPower(frame: Float32Array, sampleRate: number, hz: number) {
  const w = (2 * Math.PI * hz) / sampleRate
  const coeff = 2 * Math.cos(w)
  let s1 = 0
  let s2 = 0
  for (let i = 0; i < frame.length; i++) {
    const s0 = frame[i] + coeff * s1 - s2
    s2 = s1
    s1 = s0
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2
}

function correlate(chroma: Float32Array, profile: number[], rotation: number) {
  let score = 0
  for (let i = 0; i < 12; i++) score += chroma[i] * profile[(i - rotation + 12) % 12]
  return score
}

/** Rough key guess for an A–B beat slice. Check it by ear before trusting it. */
export function estimateKey(data: Float32Array, sampleRate: number): KeyGuess | null {
  if (data.length < 2048 || sampleRate < 8000) return null
  const chroma = new Float32Array(12)
  const frameSize = 2048
  const maxFrames = 16
  let frames = 0
  for (let start = 0; start + frameSize <= data.length && frames < maxFrames; start += frameSize) {
    const frame = data.subarray(start, start + frameSize)
    for (let midi = 48; midi <= 72; midi++) {
      const hz = 440 * Math.pow(2, (midi - 69) / 12)
      chroma[midi % 12] += Math.max(0, goertzelPower(frame, sampleRate, hz))
    }
    frames++
  }
  const energy = chroma.reduce((sum, value) => sum + value, 0)
  if (energy <= 0) return null
  let best: KeyGuess = { key: 'C', scale: 'major' }
  let bestScore = -Infinity
  for (let rotation = 0; rotation < 12; rotation++) {
    const major = correlate(chroma, MAJOR, rotation)
    const minor = correlate(chroma, MINOR, rotation)
    if (major > bestScore) {
      bestScore = major
      best = { key: NAMES[rotation], scale: 'major' }
    }
    if (minor > bestScore) {
      bestScore = minor
      best = { key: NAMES[rotation], scale: 'naturalMinor' }
    }
  }
  return best
}

export function sliceChannel(buffer: AudioBuffer, startSec: number, endSec: number) {
  const sr = buffer.sampleRate
  const start = Math.max(0, Math.floor(startSec * sr))
  const end = Math.min(buffer.length, Math.max(start + 1, Math.floor(endSec * sr)))
  return buffer.getChannelData(0).slice(start, end)
}
