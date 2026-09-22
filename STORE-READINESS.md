# App Store readiness

The repository is prepared to build and archive as a native iOS/iPadOS application. A public App Store release still depends on items that can only be completed in your Apple Developer / production-server accounts.

## Required account-side items

- Register bundle id `space.infectedvoices.studio` (or change it before first submission), choose your Apple Team, and create the App Store Connect record.
- Add the final privacy-policy URL and answer App Store privacy questions to match the production backend and optional collaboration/audio uploads.
- Keep the iOS app free of Stripe checkout or other in-app external purchase calls-to-action unless your storefront/entitlement strategy permits it. Existing subscribers can sign in; if you sell the subscription inside the iOS app, configure Apple In-App Purchase / StoreKit and server-side entitlement verification.
- If the production primary account flow continues to use Google/social login, add the equivalent privacy-preserving login option required by Apple Guideline 4.8 (normally Sign in with Apple) and wire its server verification before submission.
- Configure the production Core 6 backend and TURN relay before enabling collaboration voice chat for customers.
- Test real microphones/interfaces, interruptions, Bluetooth/wired headphones, low-storage behavior, long sessions and recovery on physical iPhone/iPad hardware.

## Already enforced in the app

- Device authorization secret uses iOS Keychain-backed secure storage.
- Account-server origin must be HTTPS and arbitrary external URLs are blocked by an allowlist.
- App updates are App Store-managed; the native app does not sideload executable web code.
- Exports use the iOS share/document flow; broad photo/storage permissions are not requested.
- Microphone access has an explicit purpose string and is only requested when recording/voice features need it.
- Studio plugins are declarative preset JSON only; arbitrary JavaScript/WASM plugins are rejected.
- `PrivacyInfo.xcprivacy` declares linked account/audio data used for app functionality and declares no tracking. Capacitor and listed third-party SDK privacy manifests remain part of their packages.
