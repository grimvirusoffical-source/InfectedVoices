# InfectedVoices-iOS

Thin Capacitor iOS shell for Infected Voices (iPhone and iPad). It consumes the shared [InfectedVoices](https://github.com/grimvirusoffical-source/InfectedVoices) Core `build:web` payload. The App Store pipeline is documented here and still executed from Core later. Do not fork DSP. Depend on Core.

Mac is not a shell in this family. Mac users use Open web, or this iOS app (Designed for iPad). Do not add a macOS or Mac Catalyst target.

## Distribution contract

Core (`https://github.com/grimvirusoffical-source/InfectedVoices`) is the feature parity source. A signed-in account is Free. Free, Basic, and Pro, plus the one-time 7-day trials, already live in Core (`basicTrialUsedAt`, `proTrialUsedAt`). This shell does not reimplement plans or DSP.

`/get` is store-only for mobile and is the same page as `/download`: App Store and Google Play. No raw `.ipa` and no raw `.aab` go on a CDN.

Windows is signed, and the installer SHA-256 is published beside that file. The checksum here is a placeholder until a real Release exists. The GitHub source zipball is source, not the Windows app.

Open web goes to `/voices`.

There is no Mac `.app`. Mac is Open web, or the iOS app (Designed for iPad). There is no InfectedVoices-Mac repo.

## Core pin

`core` is a git submodule at `2fb04c2ce1ac4e49ea9105207f436b8b6cf1d80d` (`Merge Cap PR #3: Core mobile clear bar (Stress PASS)`). Stress bar for this populate: CLEAR BAR PASS.

App id `space.infectedvoices.studio`. Core `app.json` sets `supportsTablet: true`. Vendor payload `0.6.6-core6.1` stays in Core.

The Capacitor iOS project remains `core/ios`. Duplicating it here would fork the Cap shell away from the parity source. `npm run sync` runs Core `npm run native:ios` inside the submodule. It does not upload.

## What is shared vs this shell

Shared, in Core: DSP, plans, trials, `ios/`, `eas.json`, `UPLOAD-APPLE.md`, `STORE-READINESS.md`, and `APP-REVIEW-NOTES.md`.

This shell: the pin, the prepare script, and the App Store notes. Upload flags and Mac target flags exit 2.

## Commands

```bash
sh scripts/init-core.sh
npm test
npm run check
npm run sync
```

`npm run sync` needs a Mac with Xcode for a device build. It does not call EAS and it does not create a Mac `.app`.

## Out of scope

This change does not upload an IPA, does not run EAS submit, and does not put an `.ipa` on a CDN. Details: `docs/APP-STORE-PIPELINE.md`.
