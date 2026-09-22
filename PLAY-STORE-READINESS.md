# Google Play readiness

The Android project is generated from the same pinned Infected Voices Core 5 studio payload used by the iOS build. CI compiles the native project and produces an unsigned release App Bundle to prove the project builds.

## Required account-side items

- Create the Play Console app for package `space.infectedvoices.studio` (or change the package before the first release).
- Create and protect an Android upload keystore. Signing keys and passwords are intentionally not committed.
- Complete the Play Data safety form so it matches the production account backend and any user-initiated audio uploads.
- Add the final privacy-policy URL, content rating, support contact, screenshots, feature graphic, and store description.
- If paid digital access is sold inside the Android app, integrate Google Play Billing and server-side entitlement verification before production release.
- Test recording on physical phones from multiple manufacturers, wired/Bluetooth audio, interruptions, background/foreground transitions, low storage, long sessions, and recovery after process death.
- Use Play Internal testing before production rollout.

## Already enforced by the project

- Android target SDK is patched to API 36.
- Microphone access is declared for recording; no broad storage permission is requested.
- Cleartext network traffic is disabled and the account-server origin remains HTTPS-only.
- Deep links use the `infectedvoices://` scheme and are still validated by the app bridge.
- App updates are store-managed; the packaged app does not use the old web service-worker updater.
- The store release bootstrap is Core 5 only.
