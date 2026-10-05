# InfectedVoices-Windows

Thin Windows packaging hook for Infected Voices. It consumes the shared [InfectedVoices](https://github.com/grimvirusoffical-source/InfectedVoices) Core web payload through a future WebView2 host. Electron and Tauri are named alternates and are not implemented. Do not fork DSP. Depend on Core.

## Distribution contract

Core (`https://github.com/grimvirusoffical-source/InfectedVoices`) is the feature parity source. A signed-in account is Free. Free, Basic, and Pro, plus the one-time 7-day trials, already live in Core (`basicTrialUsedAt`, `proTrialUsedAt`). This shell does not reimplement plans or DSP.

`/get` is store-only for mobile and is the same page as `/download`: App Store and Google Play. No raw `.ipa` and no raw `.aab` go on a CDN.

Windows is signed, and the installer SHA-256 is published beside that file. The checksum here is a placeholder until a real Release exists. The GitHub source zipball is source, not the Windows app.

Open web goes to `/voices`.

There is no Mac `.app`. Mac is Open web, or the iOS app (Designed for iPad). There is no InfectedVoices-Mac repo.

## Core pin

`core` is a git submodule at `2fb04c2ce1ac4e49ea9105207f436b8b6cf1d80d` (`Merge Cap PR #3: Core mobile clear bar (Stress PASS)`). Stress bar for this populate: CLEAR BAR PASS.

The embedded app is Core `npm run build:web` (`dist/`). Vendor payload `0.6.6-core6.1` stays in Core. SHA-256 `e6288c29a180d8d6048fcc9117a6f6a50e7d3225920aadeb2fe48288adaf8967`.

## What is shared vs this shell

Shared, built only in Core: DSP, plans, trials, and `dist/` from `npm run build:web`.

This shell: `packaging/host.json` selects WebView2 and records Electron and Tauri as not implemented. `scripts/package-windows.ps1` can stage that dist into gitignored `payload/app`. `release/SHA256SUMS.txt` is `UNPROVISIONED`. There is no installer in this commit, so there is no real SHA-256 yet.

Signing and the GitHub Release stay blocked until a real signed installer exists. `scripts/stage-windows-payload.mjs --release` exits 2.

## Commands

```bash
sh scripts/init-core.sh
npm test
npm run check
npm run stage
```

`npm run stage` needs the Core submodule and writes `payload/app`. It does not rewrite the checksum file.

## Out of scope

This change does not cut a Windows Release, does not run Authenticode, and does not run an EAS store upload. Details: `docs/SHARED-VS-SHELL.md`, `packaging/README.md`, and `release/README.md`.
