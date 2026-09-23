# Upload Infected Voices to Google Play

1. Clone this repository on your Mac, Windows PC, or Linux machine.
2. Install Node 22+, Java 21, and current Android Studio / Android SDK 36.
3. Run `npm install --include=dev --ignore-scripts` then `npm run native:android`.
4. Open the generated `android/` folder in Android Studio.
5. Confirm application ID `space.infectedvoices.studio`, version name `0.6.5`, and an unused Play version code.
6. Run on at least one physical Android phone and test microphone permission, recording, recovery after app kill/relaunch, comping, Precision Tune/Pocket, mixer, GRIM, Core 5 mastering, WAV/project export, and Classic MP3.
7. In Android Studio choose **Build → Generate Signed App Bundle or APK → Android App Bundle**.
8. Create/select your private upload keystore. Do not commit the keystore or its passwords.
9. Upload the signed `.aab` to Play Console, complete Data safety/content rating/store listing, add screenshots, and start with Internal testing.
10. Promote to production only after the production account/payment flow and physical-device checks in `PLAY-STORE-READINESS.md` are complete.

GitHub Actions also creates an **unsigned** release AAB as a build-verification artifact. Google Play requires your signed bundle; use Android Studio or your secure release-signing pipeline to create the uploadable signed AAB.
