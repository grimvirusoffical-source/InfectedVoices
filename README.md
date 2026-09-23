# Infected Voices — browser host, Windows, and mobile

RedXAIHost serves this branch. `npm run build:browser` writes `browser-dist/`, and `npm run start:redx` listens on port **8791** (override with `PORT`). The home page is Studio 0.7.0, including the Vocal Lab v0.4.1 surface: bar/beat practice, Pocket Assist, Ultimate Mic Master, Grim Beats, the member’s own RoEx key field, and the v0.4.0 / v0.4.1 Windows channel notes. Arrangement Studio stays at `studio.html`. Account sign-in is the existing browser adapter. This repo does not ship Windows ZIPs or signing keys.

```bash
npm install
npm run build:browser
npm run start:redx
```

`npm run native:ios` and `npm run native:android` still build the Capacitor app. `npm run package:windows` stages an Electron shell from `browser-dist/` after the browser build.

# Infected Voices — Core 5 Mobile

Native mobile packaging for **Infected Voices Core 5**, using the same pinned local studio engine as the Windows/Core 5 build with a touch-first UI and store-managed native containers.

## Included on iOS and Android

- Multitrack Arrangement Studio, recording journal/recovery, comping and punch recording
- InfectedTune + Precision Tune
- Pocket + Precision Pocket
- Core 3 buses, EQ, linked compression, shared delay/reverb and meters
- Core 5 automation, sidechain ducking, GRIM character rack, LUFS/true-peak mastering
- WAV/stem/project exports through the native share/save flow
- Classic Studio + MP3 encoder
- Secure account session storage
- Mobile safe areas, large touch targets, phone single-column workflow and tablet/landscape expansion

The store release is intentionally scoped to **Core 5**. Unreleased Core 6 collaboration is not bootstrapped in these store builds.

## iPhone / iPad

```bash
npm install
npm run native:ios
```

Open `ios/App/App.xcodeproj` in Xcode, select your Apple Developer Team, test on a physical device, then Archive for App Store Connect.

## Android

```bash
npm install
npm run native:android
```

Open the generated `android/` folder in Android Studio. Test on a physical device, then use **Build → Generate Signed App Bundle or APK → Android App Bundle** and sign with your private upload key.

The shared app identifier is **`space.infectedvoices.studio`**. Change it before either first store record if you have already registered a different identifier.

## Signing boundary

Apple certificates/profiles, App Store Connect credentials, Android upload keystores, keystore passwords, Play Console credentials, and production server secrets are intentionally not committed.

See `UPLOAD-APPLE.md`, `UPLOAD-ANDROID.md`, `STORE-READINESS.md`, `PLAY-STORE-READINESS.md`, and `MOBILE-FEATURE-MAP.md`.
