import { Mp3Encoder } from '@breezystack/lamejs'
import { measureDelivery, type DeliveryMetrics } from './delivery'

export type WavBits = 16 | 24

/** Free stays 16-bit. Basic and Pro default to 48 kHz / 24-bit. */
export function exportSpec(tier: string): { sampleRate: number; bits: WavBits; label: string } {
  if (tier === 'basic' || tier === 'pro') return { sampleRate: 48000, bits: 24, label: '48 kHz · 24-bit WAV' }
  return { sampleRate: 44100, bits: 16, label: '16-bit WAV' }
}

export async function exportMasterWav(
  buffer: AudioBuffer,
  tier: string,
): Promise<{ blob: Blob; label: string; metrics: DeliveryMetrics; sampleRate: number; bits: WavBits }> {
  const spec = exportSpec(tier)
  const matched = await matchSampleRate(buffer, spec.sampleRate)
  const blob = await audioBufferToWav(matched, spec.bits)
  return {
    blob,
    label: spec.label,
    metrics: measureDelivery(matched),
    sampleRate: spec.sampleRate,
    bits: spec.bits,
  }
}
