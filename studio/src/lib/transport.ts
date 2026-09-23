export const BEATS_PER_BAR = 4

export function barStartSec(bar: number, bpm: number) {
  const safeBpm = Math.max(40, Math.min(240, bpm || 120))
  const index = Math.max(1, Math.round(bar)) - 1
  return index * BEATS_PER_BAR * (60 / safeBpm)
}

/** Inclusive bar range → transport loop in seconds. Bar 1 starts at 0. */
export function loopRangeFromBars(startBar: number, endBar: number, bpm: number) {
  const start = Math.max(1, Math.round(startBar))
  const end = Math.max(start, Math.round(endBar))
  return {
    startBar: start,
    endBar: end,
    startSec: barStartSec(start, bpm),
    endSec: barStartSec(end + 1, bpm),
  }
}

export function secToBar(sec: number, bpm: number) {
  const safeBpm = Math.max(40, Math.min(240, bpm || 120))
  const beats = Math.max(0, sec) / (60 / safeBpm)
  return Math.floor(beats / BEATS_PER_BAR) + 1
}
