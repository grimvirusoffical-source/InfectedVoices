# InfectedVoices-Web

Thin static host for the Infected Voices browser studio and the `/get` download hub. It consumes the shared [InfectedVoices](https://github.com/grimvirusoffical-source/InfectedVoices) Core payload. Do not fork DSP. Depend on Core.

## Distribution contract

Core (`https://github.com/grimvirusoffical-source/InfectedVoices`) is the feature parity source. A signed-in account is Free. Free, Basic, and Pro, plus the one-time 7-day trials, already live in Core (`basicTrialUsedAt`, `proTrialUsedAt`). This shell does not reimplement plans or DSP.

`/get` is store-only for mobile and is the same page as `/download`: App Store and Google Play. No raw `.ipa` and no raw `.aab` go on a CDN.

Windows is signed, and the installer SHA-256 is published beside that file. The checksum here is a placeholder until a real Release exists. The GitHub source zipball is source, not the Windows app.

Open web goes to `/voices`.

There is no Mac `.app`. Mac is Open web, or the iOS app (Designed for iPad). There is no InfectedVoices-Mac repo.

## Core pin

`core` is a git submodule at `2fb04c2ce1ac4e49ea9105207f436b8b6cf1d80d` (`Merge Cap PR #3: Core mobile clear bar (Stress PASS)`). Stress bar for this populate: CLEAR BAR PASS.

Vendor payload `0.6.6-core6.1` stays in Core. SHA-256 `e6288c29a180d8d6048fcc9117a6f6a50e7d3225920aadeb2fe48288adaf8967`. App id `space.infectedvoices.studio`. Package `0.7.0`. Native shell line in Core `0.6.6-mobile.2`.

## What is shared vs this shell

Shared, built only in Core: DSP vendor shards, Free / Basic / Pro, trials, `download/index.html`, and `npm run build:browser`.

This shell: routes `/voices`, `/get`, and `/download`, plus a stage script. `npm run stage` runs Core `build:browser` and writes gitignored `site/voices`. Pass `--cap` to stage Core `build:web` instead. Core's browser build keeps `manifest.webmanifest` and removes `sw.js`. This host does not add a service worker.

`/get` and `/download` are served from `core/download/index.html`. This repo does not keep a second copy of that page.

## Commands

```bash
sh scripts/init-core.sh
npm test
npm run stage
npm start
```

`npm start` listens on `127.0.0.1:8787` unless `PORT` is set. Open web is `/voices`.

## Out of scope

This change does not cut a Windows Release and does not run an EAS store upload. Android and iOS binaries stay on the stores. Details: `docs/SHARED-VS-SHELL.md` and `docs/CORE-DOCS-USED.md`.
