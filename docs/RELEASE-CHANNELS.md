# Release channels

Source: `docs/STUDY-infectedvoices-platform-artifacts.md`. Feature parity is **not finished**. Stress has not cleared this branch. This PR does not cut installers.

## Core stays here

[InfectedVoices](https://github.com/grimvirusoffical-source/InfectedVoices) is **Core**: shared DSP, Create | Studio, and Free / Basic / Pro. Joshua wants separate Web, Windows, Android, iOS, and Mac shell repos. Those shells are not a reason to stop this PR. Do not block Core on the split.

Stub remotes that already exist are not shells yet. `InfectedVoices-Web`, `InfectedVoices-Windows`, `InfectedVoices-Android`, and `InfectedVoices-iOS` do not replace Core. There is no `InfectedVoices-Mac` repo. Until a shell remote actually consumes Core, the product work stays in this repo.

After a shell remote exists as a consumer, it loads Core’s web payload (`dist` for Cap, `browser-dist` for browser and a later desktop wrapper). No forked DSP copies. The shell does not reimplement Create | Studio or the plan matrix. Mac stays Open web until a shell wraps that same payload. There is no `native:mac` target in Core.

Cap and the browser share the pinned Core 5 vendor payload (`0.6.6-core6.1`). `capacitor.config.json` sets `webDir` to `dist` from `scripts/build-web.mjs`. `scripts/build-browser.mjs` runs that build, then copies the same `source-web` tree and the same `mobile-create.js` into `browser-dist`. Create | Studio, Free / Basic / Pro, and the delivery labels (Free **44.1 kHz · 16-bit**, Basic and Pro Smart Mix **48 kHz · 24-bit**) live in that shared module. A Windows wrapper and a future Mac shell would load that same web payload. Neither shell is in this repo. There is no `native:mac` script.

## Publish targets

| Surface | Where it publishes | Today |
|---|---|---|
| Cap iOS and Android | [grimvirusoffical-source/InfectedVoices](https://github.com/grimvirusoffical-source/InfectedVoices) via EAS, then App Store Connect and Play Console (`UPLOAD-APPLE.md`, `UPLOAD-ANDROID.md`) | Store upload stays on this Core repo. Marketing `/get` does not host a raw ipa or aab. |
| Windows installer | [InfectedVoices-Windows](https://github.com/grimvirusoffical-source/InfectedVoices-Windows) Releases | The repo exists as a README stub. It has no signed installer and no Release asset yet. `/get` links `https://github.com/grimvirusoffical-source/InfectedVoices-Windows/releases` and shows SHA-256. The Core zipball is source, not the Windows app. |
| Browser | `/voices/` and the `/get` hub | Built by `npm run build:browser` in Core. |
| Mac | Open web | No `InfectedVoices-Mac` repo. No Mac `.app` and no Mac Cap target. A Mac user-agent recommends the Open web card. `/get/mac` only launches `/voices/`. |

`InfectedVoices-iOS` and `InfectedVoices-Android` are not the EAS publish target. `InfectedVoices-Web` is a README. The browser payload is still built from Core.

Store builds and a signed Windows Release wait until Stress clears Core. This PR does not upload them, and it does not wait for the shell repos to be finished.
