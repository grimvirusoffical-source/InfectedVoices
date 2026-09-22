# Infected Voices Core 5 — cloud release without a Mac

You do not need a Mac for this release path. EAS Build uploads the generated native project to Expo cloud builders. iOS compilation happens on Expo's macOS infrastructure, and EAS Submit can upload the resulting IPA to App Store Connect from Windows.

## One-time setup on Windows

1. Install Node.js 22+ and Git.
2. Clone this repository and switch to the `eas-cloud-release` branch.
3. Run `npm install`.
4. Run `npx eas-cli@latest login` or set an Expo personal access token in the local environment.
5. Run `npx eas-cli@latest init` once to link this repository to the Expo project.
6. Generate the native projects locally without compiling them:
   - `npm run native:ios`
   - `npm run native:android`
7. Configure EAS-managed build credentials:
   - `node scripts/eas-cloud-release.mjs ios credentials`
   - `node scripts/eas-cloud-release.mjs android credentials`
8. In EAS credentials, upload the Google Play service-account key for Android submission and configure an App Store Connect API key for iOS submission.

## Build without submitting

- iOS cloud build: `node scripts/eas-cloud-release.mjs ios build`
- Android cloud build: `node scripts/eas-cloud-release.mjs android build`

## Build and submit to testing

- iOS -> App Store Connect/TestFlight: `node scripts/eas-cloud-release.mjs ios auto-submit`
- Android -> Google Play internal testing: `node scripts/eas-cloud-release.mjs android auto-submit`

## Check submission status

- `node scripts/eas-cloud-release.mjs ios status`
- `node scripts/eas-cloud-release.mjs android status`

The iOS build profile uses the committed/generated Capacitor Xcode project directly and intentionally skips Expo prebuild. The Android profile likewise builds the Capacitor Gradle project directly.
