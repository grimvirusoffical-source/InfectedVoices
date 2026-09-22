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
