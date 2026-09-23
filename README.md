# Infected Voices Studio 0.7.0

One studio for the browser, Windows, iPhone, iPad, and Android. The canonical experience is the local vocal lab (Ultimate, expanded from Vocal Lab 0.3.0). The Core 5 arrangement workstation still ships beside it for the projects that already use that surface. App id: `space.infectedvoices.studio`.

## Browser

```bash
npm install
npm run dev
```

Open the Network URL on a phone or tablet that shares Wi‑Fi, then allow the microphone.

Production static build:

```bash
npm run build:web
```

`dist/` is a static site. Host `index.html` and the files next to it (relative asset paths). Preview locally with `npm run preview`.

## What’s in 0.7.0

- Studio engine with a live monitor, cue-only metronome, and WAV recording
- Beat Deck with BPM, transport, and waveform
- Voice modes: Rap, Singing, Call, plus factory and custom presets
- GRIM depth, grit, darkness, and formant
- Deep settings for correction, retune, space, and dynamics
- Pitch path: YIN detection, scale snap, then Bungee shift (see `docs/STUDY-pitch-beat-stack.md`)
- Rap on Beat A–B loop and pitch-preserving stretch
- Project Lab: 4/4 bar/beat loop, Pocket Assist clamped to ±80 ms, offline autotune, Ultimate Mic Master, SMART MIX+MASTER
- WAV and MP3 export
- Mobile Connect (LAN URL and QR)
- Quiet neutral chrome with a single indigo accent
- Core 5 Arrangement Studio at `arrangement/studio.html` inside the same build
- Capacitor packaging for iOS and Android
- Windows shell staged by `npm run package:windows`

## iPhone / iPad

```bash
npm install
npm run native:ios
```

Open `ios/App/App.xcodeproj` in Xcode, select your Apple Developer Team, test on a device, then Archive.

## Android

```bash
npm install
npm run native:android
```

Open `android/` in Android Studio. Generate a signed App Bundle. `scripts/patch-native.mjs` sets `versionName` 0.7.0 and `versionCode` 7. If Play Console already has a higher version code, raise it before upload.

The native shell loads the studio at `index.html`. On a device it adds store-update and account-server controls. Exports use the system share sheet. The app does not download replacement code.

## Windows

```bash
npm run package:windows
```

That writes `release/InfectedVoices-Windows/`. On a Windows machine, run `Run Infected Voices.bat` (Node 22+). The folder is an Electron shell around the same `dist/` the browser hosts. It does not contain a signing key. Signed private updates are specified in `docs/signed-private-updates.md` and shown in the Updates panel; they stay unwired until a key is provisioned outside this repository.

## Checks

```bash
npm test
npm run build:web
```

## Signing boundary

Apple certificates, Android keystores, Play and App Store credentials, and any future update-signing keys are not in this repo. See `UPLOAD-APPLE.md`, `UPLOAD-ANDROID.md`, `STORE-READINESS.md`, `PLAY-STORE-READINESS.md`, and `MOBILE-FEATURE-MAP.md`.

Unreleased Core 6 collaboration is not bootstrapped. This repo does not include InfectedNation or Stripe.
