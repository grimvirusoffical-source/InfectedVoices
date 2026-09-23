# Changelog

## 0.7.0

The browser studio, Windows shell, and Capacitor mobile package now build from this repository.

### Canonical studio

- Brought in Infected Voices Ultimate as the hosted web app: studio engine, Beat Deck, Rap / Singing / Call modes, GRIM, custom presets, Deep settings, Rap-on-Beat A–B loop, cue-only metronome, Mobile Connect, WAV/MP3 export.
- Pitch path is YIN detection, scale snap, then Bungee pitch shift for live correction, offline autotune, and pitch-preserving rap stretch.
- Project Lab adds the Vocal Lab 0.3.0 bar/beat loop (4/4), Pocket Assist clamped to ±80 ms (auto grid and manual nudge), Ultimate Mic Master, and SMART MIX+MASTER (level match, beat ducking, bus compression, limiter).
- Chrome uses quiet zinc neutrals and one indigo accent. Version is 0.7.0.
- `npm run build:web` emits a static `dist/` with relative URLs so it can be hosted as a browser app and loaded by Capacitor or Electron.

### Packaging

- iOS and Android scripts (`native:ios`, `native:android`, sync, open) still package `dist/`. The device shell adds share/save, an HTTPS account-server check, and store updates. Android versionCode is 7.
- Core 5 Arrangement Studio remains in `dist/arrangement/` with the existing mobile entry, so the shipping workstation is still in the binary.
- `npm run package:windows` stages an Electron shell. Signed private updates are documented only. No signing key is shipped.

## 0.6.5-mobile.2

- Core 5 Capacitor package for iPhone, iPad, and Android (`space.infectedvoices.studio`).
