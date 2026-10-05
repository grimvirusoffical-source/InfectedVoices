/** BS.1770-style integrated loudness and 4× inter-sample true peak. Figures are measurements, not invented targets. */

export type DeliveryMetrics = {
  samplePeakDb: number
  truePeakDbtp: number
  integratedLufs: number
  shortTermLufs: number
}

const db = (value: number) => 20 * Math.log10(Math.max(1e-12, Math.abs(value)))

function biquad(type: 'highshelf' | 'highpass', rate: number, freq: number, q: number, gainDb: number) {
  const A = 10 ** (gainDb / 40)
  const w = (2 * Math.PI * freq) / rate
  const c = Math.cos(w)
  const s = Math.sin(w)
  const alpha = s / (2 * q)
  let b0: number
  let b1: number
  let b2: number
  let a0: number
  let a1: number
  let a2: number
  if (type === 'highpass') {
    b0 = (1 + c) / 2
    b1 = -(1 + c)
    b2 = b0
    a0 = 1 + alpha
    a1 = -2 * c
    a2 = 1 - alpha
  } else {
    const sqrtA = Math.sqrt(A)
    const two = 2 * sqrtA * alpha
    b0 = A * (A + 1 + (A - 1) * c + two)
    b1 = -2 * A * (A - 1 + (A + 1) * c)
    b2 = A * (A + 1 + (A - 1) * c - two)
    a0 = A + 1 - (A - 1) * c + two
    a1 = 2 * (A - 1 - (A + 1) * c)
    a2 = A + 1 - (A - 1) * c - two
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]
}

function filterChannel(input: ArrayLike<number>, coeff: number[]) {
  const [b0, b1, b2, a1, a2] = coeff
  const out = new Float64Array(input.length)
  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  for (let i = 0; i < input.length; i++) {
    const x = input[i]
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    out[i] = y
    x2 = x1
    x1 = x
    y2 = y1
    y1 = y
  }
  return out
}

function kWeight(channels: Float32Array[], rate: number) {
  const shelf = biquad('highshelf', rate, 1681.974450955533, 0.7071752369554196, 3.99984385397)
  const hp = biquad('highpass', rate, 38.13547087602444, 0.5003270373238773, 0)
  return channels.map((channel) => filterChannel(filterChannel(channel, shelf), hp))
}

function loudnessFromEnergy(energy: number) {
  return -0.691 + 10 * Math.log10(Math.max(1e-20, energy))
}

function blockEnergy(weighted: Float64Array[], start: number, length: number) {
  let energy = 0
  for (const channel of weighted) {
    let sum = 0
    const end = Math.min(channel.length, start + length)
    for (let i = start; i < end; i++) sum += channel[i] * channel[i]
    energy += sum / Math.max(1, end - start)
  }
  return energy
}

function gatedLoudness(energies: number[]) {
  if (!energies.length) return Number.NEGATIVE_INFINITY
  const absolute = energies.filter((energy) => loudnessFromEnergy(energy) > -70)
  if (!absolute.length) return Number.NEGATIVE_INFINITY
  const ungated = absolute.reduce((sum, energy) => sum + energy, 0) / absolute.length
  const relative = loudnessFromEnergy(ungated) - 10
  const gated = absolute.filter((energy) => loudnessFromEnergy(energy) > relative)
  const used = gated.length ? gated : absolute
  return loudnessFromEnergy(used.reduce((sum, energy) => sum + energy, 0) / used.length)
}

export function measureDelivery(buffer: AudioBuffer): DeliveryMetrics {
  const channels: Float32Array[] = []
  for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c))
  let samplePeak = 0
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i++) samplePeak = Math.max(samplePeak, Math.abs(channel[i]))
  }
  const weighted = kWeight(channels, buffer.sampleRate)
  const integratedBlock = Math.max(1, Math.round(buffer.sampleRate * 0.4))
  const hop = Math.max(1, Math.round(buffer.sampleRate * 0.1))
  const energies: number[] = []
  if (weighted[0].length >= integratedBlock) {
    for (let at = 0; at + integratedBlock <= weighted[0].length; at += hop) {
      energies.push(blockEnergy(weighted, at, integratedBlock))
    }
  } else {
    energies.push(blockEnergy(weighted, 0, weighted[0].length))
  }
  const shortBlock = Math.max(1, Math.round(buffer.sampleRate * 3))
  const shortEnergies: number[] = []
  if (weighted[0].length >= shortBlock) {
    for (let at = 0; at + shortBlock <= weighted[0].length; at += hop) {
      shortEnergies.push(blockEnergy(weighted, at, shortBlock))
    }
  } else {
    shortEnergies.push(blockEnergy(weighted, 0, weighted[0].length))
  }
  const shortTerm = Math.max(...shortEnergies.map(loudnessFromEnergy))
  return {
    samplePeakDb: db(samplePeak),
    truePeakDbtp: truePeakDb(channels),
    integratedLufs: gatedLoudness(energies),
    shortTermLufs: Number.isFinite(shortTerm) ? shortTerm : Number.NEGATIVE_INFINITY,
  }
}

const sinc = (x: number) => (Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x))

function truePeakDb(channels: Float32Array[]) {
  const taps = 12
  const phases = [0.25, 0.5, 0.75]
  const kernels = phases.map((phase) => {
    const weights: number[] = []
    let sum = 0
    for (let k = -taps; k <= taps; k++) {
      const x = k - phase
      const window = 0.5 + 0.5 * Math.cos((Math.PI * x) / (taps + 1))
      const weight = sinc(x) * window
      weights.push(weight)
      sum += weight
    }
    return weights.map((weight) => weight / sum)
  })
  let peak = 0
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i++) peak = Math.max(peak, Math.abs(channel[i]))
    for (let i = 0; i < channel.length - 1; i++) {
      for (const weights of kernels) {
        let y = 0
        let idx = 0
        for (let k = -taps; k <= taps; k++, idx++) {
          const sample = channel[Math.max(0, Math.min(channel.length - 1, i + k))] || 0
          y += sample * weights[idx]
        }
        peak = Math.max(peak, Math.abs(y))
      }
    }
  }
  return db(peak)
}

function finiteDb(value: number, unit: string) {
  return Number.isFinite(value) ? `${value.toFixed(1)} ${unit}` : `-∞ ${unit}`
}

export function formatDeliveryNote(input: {
  metrics: DeliveryMetrics
  sampleRate: number
  bits: number
  bpm: number
}) {
  const { metrics, sampleRate, bits, bpm } = input
  return `Delivery note: integrated ${finiteDb(metrics.integratedLufs, 'LUFS')} · short-term ${finiteDb(metrics.shortTermLufs, 'LUFS')} · true peak ${metrics.truePeakDbtp.toFixed(2)} dBTP · sample peak ${metrics.samplePeakDb.toFixed(1)} dBFS · ${sampleRate} Hz · ${bits}-bit · ${bpm} BPM`
}
