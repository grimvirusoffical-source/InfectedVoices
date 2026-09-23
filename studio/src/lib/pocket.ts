/** Pocket Assist never moves a take by more than 80 ms. */
export const POCKET_LIMIT_SEC = 0.08

export function clampPocketSec(seconds: number) {
  if (!Number.isFinite(seconds)) return 0
  return Math.max(-POCKET_LIMIT_SEC, Math.min(POCKET_LIMIT_SEC, seconds))
}

/**
 * Nudge a take so its first onset lands on the nearest 1/16 grid line.
 * The returned offset is clamped to ±80 ms. Positive delays the vocal.
 */
export function pocketAssistOffsetSec(
  channelData: Float32Array,
  sampleRate: number,
  bpm: number,
): number {
  const threshold = 0.02
  let onset = 0
  for (let i = 0; i < channelData.length; i++) {
    if (Math.abs(channelData[i]) > threshold) {
      onset = i / sampleRate
      break
    }
  }
  const safeBpm = Math.max(40, Math.min(240, bpm || 120))
  const sixteenth = 60 / safeBpm / 4
  const nearest = Math.round(onset / sixteenth) * sixteenth
  return clampPocketSec(nearest - onset)
}

export function rapOnBeatRate(sourceDur: number, targetDur: number) {
  if (sourceDur <= 0 || targetDur <= 0) return 1
  const rate = sourceDur / targetDur
  return Math.min(2, Math.max(0.5, rate))
}
