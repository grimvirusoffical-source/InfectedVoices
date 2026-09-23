# Release channels

Source: `docs/STUDY-infectedvoices-platform-artifacts.md`. Feature parity is **not finished**. Stress has not cleared this branch. This PR does not cut installers.

Cap and the browser share the pinned Core 5 vendor payload (`0.6.6-core6.1`). `capacitor.config.json` sets `webDir` to `dist` from `scripts/build-web.mjs`. `scripts/build-browser.mjs` runs that build, then copies the same `source-web` tree and the same `mobile-create.js` into `browser-dist`. Create | Studio, Free / Basic / Pro, and the delivery labels (Free **44.1 kHz · 16-bit**, Basic and Pro Smart Mix **48 kHz · 24-bit**) live in that shared module. A Windows wrapper and a future Mac shell would load that same web payload. Neither shell is in this repo. There is no `native:mac` script.

## Publish targets

| Surface | Where it publishes | Today |
|---|---|---|
| Cap iOS and Android | [grimvirusoffical-source/InfectedVoices](https://github.com/grimvirusoffical-source/InfectedVoices) via EAS, then App Store Connect and Play Console (`UPLOAD-APPLE.md`, `UPLOAD-ANDROID.md`) | Store upload stays on this Core repo. Marketing `/get` does not host a raw ipa or aab. |
| Windows installer | [InfectedVoices-Windows](https://github.com/grimvirusoffical-source/InfectedVoices-Windows) Releases | The repo exists as a README stub. It has no signed installer and no Release asset yet. `/get` links `https://github.com/grimvirusoffical-source/InfectedVoices-Windows/releases` and shows SHA-256. The Core zipball is source, not the Windows app. |
| Browser | `/voices/` and the `/get` hub | Built by `npm run build:browser` in Core. |
| Mac | Open web | No `InfectedVoices-Mac` repo. No Mac `.app` and no Mac Cap target. A Mac user-agent recommends the Open web card. `/get/mac` only launches `/voices/`. |

`InfectedVoices-iOS` and `InfectedVoices-Android` are notes beside Core. They are not the EAS publish target. `InfectedVoices-Web` is a README. The browser payload is still built from Core.

After a later merge, a signed Windows installer is cut into `InfectedVoices-Windows` Releases. iOS and Android artifacts stay on Core and go to the stores through EAS. This PR does not upload them.
