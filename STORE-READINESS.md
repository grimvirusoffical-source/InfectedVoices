# iOS App Store readiness

The iOS project packages Studio 0.7.0 plus the Core 5 arrangement surface and is prepared to build and archive as a native iOS/iPadOS application. A public App Store release still depends on items that can only be completed in your Apple Developer / production-server accounts.

## Required account-side items

- Register bundle id `space.infectedvoices.studio` (or change it before first submission), choose your Apple Team, and create the App Store Connect record.
- Add the final privacy-policy URL and answer App Store privacy questions to match the production backend.
- Keep the iOS app free of Stripe checkout or other in-app external purchase calls-to-action unless your storefront/entitlement strategy permits it. If you sell digital access inside the iOS app, configure Apple In-App Purchase / StoreKit and server-side entitlement verification.
- If the production primary account flow uses a third-party/social login, confirm Apple Guideline 4.8 requirements and add Sign in with Apple when required.
- Test real microphones/interfaces, interruptions, Bluetooth/wired headphones, low-storage behavior, long sessions and recovery on physical iPhone/iPad hardware.

## Already enforced in the app

- Device authorization secret uses Keychain-backed secure storage.
- Account-server origin must be HTTPS and arbitrary external URLs are allowlisted.
- App updates are App Store-managed; the native app does not sideload executable studio updates.
- Exports use the iOS share/document flow; broad photo/storage permissions are not requested.
- Microphone access has an explicit purpose string.
- Studio plugins are declarative preset JSON only; arbitrary JavaScript/WASM plugins are rejected.
- The home screen is Studio 0.7.0. Core 5 Arrangement remains inside the same bundle. Unreleased Core 6 collaboration is not bootstrapped.
- `PrivacyInfo.xcprivacy` declares linked account/audio data used for app functionality and declares no tracking.
