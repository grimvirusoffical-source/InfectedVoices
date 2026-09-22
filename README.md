# Infected Voices — iPhone / iPad

Native iOS/iPadOS project for **Infected Voices**. The app packages the same local studio engine used by the current Windows/Core 5 build inside Capacitor 8, with mobile-safe file export, Keychain-backed device sessions, App Store-managed updates, safe-area/touch UI, and the guarded Core 6 collaboration client.

## Studio included

- Multitrack Arrangement Studio, recording journal/recovery, comping and punch recording
- InfectedTune + Precision Tune
- Pocket + Precision Pocket
- Core 3 buses, EQ, linked compression, shared delay/reverb and meters
- Core 5 automation, sidechain ducking, GRIM character rack, LUFS/true-peak mastering
- WAV/stem/project exports through the native iOS share sheet
- Classic Studio + MP3 encoder
- Secure account session in iOS Keychain
- Core 6 collaboration client behind the compatible-server capability

## Open on a Mac

```bash
npm install
npm run native:ios
```

That generates/syncs `ios/App/App.xcodeproj`. Open it in Xcode, choose your Apple Developer Team, run on a real iPhone/iPad, then Archive for App Store Connect.

The bundle identifier is **`space.infectedvoices.studio`** and the display name is **Infected Voices**. Change the identifier before the first store record if you already registered a different one.

## App Store boundaries

Apple signing certificates, provisioning profiles, App Store Connect credentials, and production account-server secrets are intentionally **not** committed. The CI workflow builds the simulator target without signing. Real-device microphone, entitlement, subscription/account and collaboration/TURN acceptance must be completed with your Apple account and production server before public release.

See `UPLOAD-APPLE.md`, `STORE-READINESS.md`, and `MOBILE-FEATURE-MAP.md`.
