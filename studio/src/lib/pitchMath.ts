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
  if (!hz || hz < 55 || hz > 1200) return null
  const midi = hzToMidi(hz)
  const pcs = scalePitchClasses(key, scale)
  const pc = ((Math.round(midi) % 12) + 12) % 12
  let bestPc = pcs[0]
  let bestDist = 99
  for (const p of pcs) {
    let d = Math.abs(p - pc)
    if (d > 6) d = 12 - d
    if (d < bestDist) {
      bestDist = d
      bestPc = p
    }
  }
  // nearest octave of bestPc
  const base = Math.round(midi)
  let target = base - (((base % 12) + 12) % 12) + bestPc
  if (target - midi > 6) target -= 12
  if (midi - target > 6) target += 12
  const centsOff = (midi - target) * 100
  if (Math.abs(centsOff) < humanizeCents) return 0
  return target - midi
}

/**
 * YIN pitch detection on a Float32Array frame.
 * Returns Hz or -1 if unvoiced.
 */
export function yinDetect(buf: Float32Array, sampleRate: number, threshold = 0.15): number {
  const n = buf.length
  if (n < 2) return -1
  const half = Math.floor(n / 2)
  const yin = new Float32Array(half)
  let running = 0
  yin[0] = 1
  for (let tau = 1; tau < half; tau++) {
    let sum = 0
    for (let i = 0; i < half; i++) {
      const d = buf[i] - buf[i + tau]
      sum += d * d
    }
    running += sum
    yin[tau] = running === 0 ? 1 : sum * tau / running
  }
  let tauEstimate = -1
  for (let tau = 2; tau < half; tau++) {
    if (yin[tau] < threshold) {
      while (tau + 1 < half && yin[tau + 1] < yin[tau]) tau++
      tauEstimate = tau
      break
    }
  }
  if (tauEstimate < 0) return -1
  // parabolic interpolation
  const x0 = tauEstimate > 0 ? yin[tauEstimate - 1] : yin[tauEstimate]
  const x1 = yin[tauEstimate]
  const x2 = tauEstimate + 1 < half ? yin[tauEstimate + 1] : yin[tauEstimate]
  const better = tauEstimate + (x2 - x0) / (2 * (2 * x1 - x2 - x0))
  const hz = sampleRate / better
  if (hz < 55 || hz > 1200) return -1
  return hz
}
