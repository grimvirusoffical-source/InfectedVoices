export type VoiceMode = 'rap' | 'sing' | 'call'

export interface VocalSettings {
  mode: VoiceMode
  key: string
  scale: 'major' | 'naturalMinor' | 'harmonicMinor' | 'pentatonicMinor' | 'chromatic'
  correction: number
  retuneMs: number
  humanize: number
  grimOn: boolean
  depth: number
  glitch: number
  grit: number
  darkness: number
  /** GRIM Mix, % wet (0 = dry voice only, 100 = only the lowered voice). null follows Depth (see defaultGrimMix). */
  grimMix: number | null
  echo: number
  space: number
  gate: number
  compress: number
  deess: number
  warmth: number
  outputDb: number
  formant: number
  acapella: boolean
}

export interface Preset {
  id: string
  name: string
  factory?: boolean
  settings: VocalSettings
}

export const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const

export const defaultSettings = (): VocalSettings => ({
  mode: 'rap',
  key: 'G',
  scale: 'naturalMinor',
  correction: 88,
  retuneMs: 12,
  humanize: 16,
  grimOn: false,
  depth: 0,
  glitch: 0,
  grit: 8,
  darkness: 10,
  grimMix: null,
  echo: 10,
  space: 8,
  gate: 25,
  compress: 40,
  deess: 30,
  warmth: 22,
  outputDb: -2,
  formant: 0,
  acapella: false,
})

/** Deeper / darker / more evil than 0.3.0 defaults */
export const grimEvilSettings = (): VocalSettings => ({
  ...defaultSettings(),
  mode: 'rap',
  key: 'G',
  scale: 'naturalMinor',
  correction: 92,
  retuneMs: 10,
  humanize: 12,
  grimOn: true,
  depth: 82,
  glitch: 34,
  grit: 48,
  darkness: 72,
  echo: 22,
  space: 18,
  gate: 35,
  compress: 52,
  deess: 28,
  warmth: 18,
  outputDb: -3,
  formant: -18,
  acapella: false,
})

export const factoryPresets = (): Preset[] => [
  {
    id: 'grim',
    name: 'GRIM Signature',
    factory: true,
    settings: grimEvilSettings(),
  },
  {
    id: 'melodic',
    name: 'Melodic Infection',
    factory: true,
    settings: {
      ...defaultSettings(),
      mode: 'sing',
      correction: 85,
      retuneMs: 18,
      humanize: 22,
      echo: 18,
      space: 24,
      warmth: 35,
      grit: 6,
      darkness: 8,
    },
  },
  {
    id: 'call',
    name: 'Call Mode',
    factory: true,
    settings: {
      ...defaultSettings(),
      mode: 'call',
      correction: 70,
      retuneMs: 8,
      humanize: 10,
      grimOn: true,
      depth: 55,
      grit: 20,
      darkness: 40,
      echo: 8,
      space: 4,
      outputDb: -4,
    },
  },
  {
    id: 'sing-acapella',
    name: 'Singing Acapella',
    factory: true,
    settings: {
      ...defaultSettings(),
      mode: 'sing',
      correction: 78,
      retuneMs: 22,
      humanize: 28,
      echo: 12,
      space: 32,
      warmth: 40,
      compress: 35,
      acapella: true,
      grit: 4,
      darkness: 5,
    },
  },
  {
    id: 'clean-rap',
    name: 'Clean Rap Tune',
    factory: true,
    settings: {
      ...defaultSettings(),
      mode: 'rap',
      correction: 90,
      retuneMs: 8,
      humanize: 8,
      echo: 6,
      space: 6,
      compress: 48,
      grit: 10,
    },
  },
]

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * GRIM Mix default when the user hasn't set one: it follows Depth, so a light drop sits under the voice and a deep
 * drop replaces it. Depth 50 lands mid-blend (50% wet), the deepest setting (Depth 100) is 88% wet / 12% dry.
 */
export function defaultGrimMix(depth: number): number {
  const d = Math.max(0, Math.min(100, Number(depth) || 0))
  return Math.round(d <= 50 ? 25 + d * 0.5 : 50 + (d - 50) * 0.76)
}

/** Effective GRIM Mix (% wet) for these settings: the saved value, or the Depth-linked default. */
export function grimMixOf(s: Pick<VocalSettings, 'depth'> & { grimMix?: number | null }): number {
  const v = s.grimMix
  return v == null || !Number.isFinite(Number(v)) ? defaultGrimMix(s.depth) : Math.max(0, Math.min(100, Number(v)))
}

/**
 * GRIM Mix gains (equal-power, wet replaces dry): dry = 1 − wet%, lowered voice = √(1 − dry²).
 * Mirrors the worklet so tests can check the curve without an AudioContext.
 */
export function grimMixGains(wetPercent: number): { dry: number; wet: number } {
  const w = Math.max(0, Math.min(1, wetPercent / 100))
  const dry = 1 - w
  return { dry, wet: Math.sqrt(Math.max(0, 1 - dry * dry)) }
}
