# Release channels

Core is this monorepo, [InfectedVoices](https://github.com/grimvirusoffical-source/InfectedVoices). Feature parity is **not finished**. Stress has not cleared this branch. Do not cut installers from this PR.

Cap and the browser both consume the pinned Core 5 vendor payload (`0.6.6-core6.1`). `capacitor.config.json` sets `webDir` to `dist`, which `scripts/build-web.mjs` writes. `scripts/build-browser.mjs` runs that same build, then copies the same `source-web` tree and the same `mobile-create.js`, `entitlements.js`, and `mobile.css` into `browser-dist`. Create | Studio, Free / Basic / Pro, and the delivery labels (Free **44.1 kHz · 16-bit**, Basic and Pro Smart Mix **48 kHz · 24-bit**) live in that shared Create module. A Windows or Mac desktop shell is not in this repo, so neither one has a second copy of those gates.

## Where artifacts go after a later merge

| Artifact | GitHub repo | What exists today |
|---|---|---|
| Windows installer | [InfectedVoices-Windows](https://github.com/grimvirusoffical-source/InfectedVoices-Windows) | README only. No git tags and no Release assets. Intended channel is GitHub Releases (or RedX static) with SHA-256 on `/get`. The Core tag `Release` (`v0.4.0`) is source and has **no** uploaded files. The zipball is not the Windows app. |
| Mac installer | None | No `InfectedVoices-Mac` repo. No `.app`, `.dmg`, or `.pkg` channel. Mac is Open web at `/voices/`, or the iOS app (Designed for iPad) from the App Store. `/get/mac` does not host a desktop installer. |
| Android AAB | [InfectedVoices-Android](https://github.com/grimvirusoffical-source/InfectedVoices-Android) | Play upload notes and a Core submodule pin. No GitHub Release and no `.aab` asset. The signed bundle is produced from Core `android/` (`UPLOAD-ANDROID.md`) and uploaded in Play Console. `scripts/prepare-android.mjs --submit` in that repo exits 2. Marketing `/get` never hosts an `.aab`. |
| iOS IPA | [InfectedVoices-iOS](https://github.com/grimvirusoffical-source/InfectedVoices-iOS) | README only. No git tags and no `.ipa` asset. The upload path is Core `ios/` via Xcode Archive to App Store Connect (`UPLOAD-APPLE.md`). Marketing `/get` never hosts an `.ipa`. |

[InfectedVoices-Web](https://github.com/grimvirusoffical-source/InfectedVoices-Web) is the browser host repo. It is a README today. The browser payload is still built from Core `npm run build:browser`.

After this PR merges, release artifacts are cut into those repos. This PR does not push a Windows or Mac build, and it does not upload an AAB or an IPA.
