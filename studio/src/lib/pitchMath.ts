import type { VocalSettings } from './presets'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

const SCALE_INTERVALS: Record<VocalSettings['scale'], number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  pentatonicMinor: [0, 3, 5, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}

export function hzToMidi(hz: number) {
  return 69 + 12 * Math.log2(hz / 440)
}

export function midiToHz(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function keyToMidiRoot(key: string) {
  const i = NOTE_NAMES.indexOf(key as (typeof NOTE_NAMES)[number])
  return i >= 0 ? i : 7 // default G
}

/** Allowed MIDI pitch classes for key+scale */
export function scalePitchClasses(key: string, scale: VocalSettings['scale']) {
  const root = keyToMidiRoot(key)
  return SCALE_INTERVALS[scale].map((iv) => (root + iv) % 12)
}

/** Semitone shift to nearest scale note from detected Hz */
export function snapSemitones(
  hz: number,
  key: string,
  scale: VocalSettings['scale'],
  humanizeCents: number,
): number | null {
  if (!Number.isFinite(hz) || hz < 55 || hz > 1200) return null
  const midi = hzToMidi(hz)
  const pcs = scalePitchClasses(key, scale)
  const octave = Math.floor(midi / 12)
  let target = midi, bestDistance = Infinity
  for (let oct = octave - 1; oct <= octave + 1; oct++) {
    for (const pc of pcs) {
      const candidate = oct * 12 + pc
      const distance = Math.abs(candidate - midi)
      if (distance < bestDistance) { target = candidate; bestDistance = distance }
    }
  }
  const deadband = Number.isFinite(humanizeCents) ? Math.max(0, Math.min(100, humanizeCents)) : 0
  return bestDistance * 100 <= deadband ? 0 : target - midi
}

/**
 * YIN pitch detection on a Float32Array frame.
 * Returns Hz or -1 if unvoiced.
 */
export function yinDetect(buf: Float32Array, sampleRate: number, threshold = 0.15): number {
  const n = buf.length
  if (n < 16 || !Number.isFinite(sampleRate) || sampleRate <= 0) return -1
  let mean = 0, energy = 0
  for (const value of buf) {
    if (!Number.isFinite(value)) return -1
    mean += value; energy += value * value
  }
  if (energy / n - (mean / n) ** 2 < 1e-10) return -1
  const half = Math.floor(n / 2)
  const maxLag = Math.min(half - 1, Math.ceil(sampleRate / 55))
  const minLag = Math.max(2, Math.floor(sampleRate / 1200))
  if (maxLag <= minLag) return -1
  threshold = Number.isFinite(threshold) ? Math.max(0.01, Math.min(0.5, threshold)) : 0.15
  const yin = new Float64Array(maxLag + 1)
  let running = 0
  yin[0] = 1
  for (let tau = 1; tau <= maxLag; tau++) {
    let sum = 0
    for (let i = 0; i < half; i++) {
      const d = buf[i] - buf[i + tau]
      sum += d * d
    }
    running += sum
    yin[tau] = running === 0 ? 1 : sum * tau / running
  }
  let tauEstimate = -1
  for (let tau = minLag; tau <= maxLag; tau++) {
    if (yin[tau] < threshold) {
      while (tau < maxLag && yin[tau + 1] < yin[tau]) tau++
      tauEstimate = tau
      break
    }
  }
  if (tauEstimate < 0) return -1
  // parabolic interpolation
  const x0 = tauEstimate > 0 ? yin[tauEstimate - 1] : yin[tauEstimate]
  const x1 = yin[tauEstimate]
  const x2 = tauEstimate < maxLag ? yin[tauEstimate + 1] : yin[tauEstimate]
  const denominator = 2 * (2 * x1 - x2 - x0)
  const correction = Math.abs(denominator) > 1e-12 ? Math.max(-0.5, Math.min(0.5, (x2 - x0) / denominator)) : 0
  const better = tauEstimate + correction
  const hz = sampleRate / better
  if (!Number.isFinite(hz) || hz < 55 || hz > 1200) return -1
  return hz
}
