# Pitch and beat stack

Status in **0.7.0**: the live and offline vocal path follows the stack below. `studio/src/lib/audioEngine.ts` detects F0 with YIN (`pitchMath.ts`), snaps to the selected key and scale, then shifts with Bungee. GRIM adds a second low shift. The cue metronome is not in the recorder. Rap-on-Beat stretch uses Bungee speed so pitch stays put. Pocket Assist snaps the first onset to a 1/16 grid and clamps the move to ±80 ms.

The notes underneath are the original study. Essentia and Rubber Band stay out of the dependency tree (AGPL and GPL).

---

# Studier Intel — Pitch correction + beat align (Infected Voices Ultimate)

**Audience:** @Proframmer  
**Date:** 2026-09-14  
**Current engine:** `studio/src/lib/audioEngine.ts` — YIN → scale snap → Bungee, then the GRIM Tone.js chain

## Gap vs product ask

Joshua wants realtime autotune *to the beat’s key/scale*, offline correction of takes, rap-on-beat time align, and GRIM depth that feels evil — not just a global semitone shift.

Shipped in 0.7.0:

- YIN on the monitor tap, semitone snap with humanize and retune slew
- Bungee for the live corrector, the GRIM dual shift, offline frames, and time stretch
- `correction` sets Bungee mix; key and scale come from Deep Settings
- Pocket Assist ±80 ms and a 4/4 bar loop in Project Lab

Still musical helpers, not lyric alignment and not the old native `InfectedTuneEngine.dll`.

## Recommended architecture (keep Tone transport + FX)

```
Mic / take buffer
  → [optional gate]
  → PitchCorrectWorklet (detect F0 → snap → WASM shift)
  → existing GRIM chain (filter, grit, echo, space, comp, limiter)
  → master / recorder / monitor
Beat
  → BeatGain → monitor + recorder
Metronome
  → cue-only destination (already correct — keep out of recorder)
```

Keep Tone for transport, beat player, metro, recording. The pitch stage is Bungee, driven by YIN.

---

## A. Realtime pitch correction (browser)

### Preferred stack

| Layer | Choice | Why |
|--------|--------|-----|
| Thread | `AudioWorklet` | Low latency, not main thread |
| Detect F0 | **YIN** | Fast enough for realtime |
| Quantize | Key/scale table + retune speed (ms) + strength (%) | Deep Settings: correction, retuneMs |
| Shift | **Bungee WASM** | Cleaner vocals, about 40 ms |

### Realtime control params (map to UI)

- `key` + `scale` (major/minor/chromatic/custom) — Deep Settings
- `strength` 0–100 → Bungee mix
- `retuneMs` → smoothing / max ratio slew
- `humanize` → allow slight detune before snap
- GRIM depth: parallel low shift under the corrected vocal

### Mobile notes

- Bungee worklet is loaded from the same origin as the page (`public/bungee-processor-bundled.js`)
- iOS Safari: the audio context resumes on the engine gesture

---

## B. Offline pitch correction (recorded vocals)

1. Decode take → float PCM
2. Frame-wise F0 (YIN)
3. Snap each frame to scale
4. Shift with the Bungee worker
5. Re-run GRIM FX via OfflineAudioContext

---

## C. “Autotune to whatever part of the beat I’m on”

v1 uses the key and scale chosen in Deep Settings (or stored on a custom preset). Per-bar chord tracking is not in this build. Essentia.js is AGPL and is not a dependency.

---

## D. Rap on Beat + time align

| Feature | Approach |
|---------|----------|
| A–B loop practice | Tone `Transport.loop` |
| Bar/beat loop | Project Lab, 4/4, written onto the same transport |
| Auto rate fit | Bungee time-stretch (pitch-preserving) |
| Pocket Assist | Energy onset to the nearest 1/16, clamped to ±80 ms |

Do **not** promise lyric alignment — this is pocket, rate, and grid snap.

---

## E. GRIM

Corrected vocal plus a darker parallel shift, low-pass, and saturation before the limiter. Factory preset: GRIM Signature.

---

## F. Dependencies

Kept: `tone`, `bungee-pitch-shift`, `@breezystack/lamejs`, `idb`.

Not used: TF.js CREPE on the live path, Rubber Band (GPL-2), Essentia (AGPL-3).
