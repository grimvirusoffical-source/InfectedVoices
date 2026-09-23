# InfectedVoices-Android

Thin Capacitor Android shell for Infected Voices. It consumes the shared [InfectedVoices](https://github.com/grimvirusoffical-source/InfectedVoices) Core `build:web` payload. The Play upload pipeline is documented here and still executed from Core later. Do not fork DSP. Depend on Core.

## Distribution contract

Core (`https://github.com/grimvirusoffical-source/InfectedVoices`) is the feature parity source. A signed-in account is Free. Free, Basic, and Pro, plus the one-time 7-day trials, already live in Core (`basicTrialUsedAt`, `proTrialUsedAt`). This shell does not reimplement plans or DSP.

`/get` is store-only for mobile and is the same page as `/download`: App Store and Google Play. No raw `.ipa` and no raw `.aab` go on a CDN.

Windows is signed, and the installer SHA-256 is published beside that file. The checksum here is a placeholder until a real Release exists. The GitHub source zipball is source, not the Windows app.

Open web goes to `/voices`.

There is no Mac `.app`. Mac is Open web, or the iOS app (Designed for iPad). There is no InfectedVoices-Mac repo.

## Core pin

`core` is a git submodule at `2fb04c2ce1ac4e49ea9105207f436b8b6cf1d80d` (`Merge Cap PR #3: Core mobile clear bar (Stress PASS)`). Stress bar for this populate: CLEAR BAR PASS.

App id `space.infectedvoices.studio`. Native shell line in Core `0.6.6-mobile.2`. Vendor payload `0.6.6-core6.1` stays in Core.

The Capacitor Android project remains `core/android`. Duplicating it here would fork the Cap shell away from the parity source. `npm run sync` runs Core `npm run native:android` inside the submodule. It does not upload.

## What is shared vs this shell

Shared, in Core: DSP, plans, trials, `android/`, `eas.json`, `UPLOAD-ANDROID.md`, `PLAY-STORE-READINESS.md`, and `PLAY-DATA-SAFETY.md`.

This shell: the pin, the prepare script, and the Play pipeline notes. `scripts/prepare-android.mjs --submit` exits 2.

## Commands

```bash
sh scripts/init-core.sh
npm test
npm run check
npm run sync
```

`npm run sync` needs the Android SDK and only refreshes the Core native project. It does not call EAS.

## Out of scope

This change does not upload an AAB, does not run EAS submit, and does not put an `.aab` on a CDN. Details: `docs/PLAY-PIPELINE.md`.
