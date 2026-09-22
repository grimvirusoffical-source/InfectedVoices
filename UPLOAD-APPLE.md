# Upload Infected Voices to Apple

1. Clone this repository on your Mac.
2. Install Node 22+ and the current Xcode supported by Capacitor 8.
3. Run `npm install` then `npm run native:ios`.
4. Open `ios/App/App.xcodeproj`.
5. Select the **App** target → **Signing & Capabilities** → choose your Apple Developer Team.
6. Confirm bundle id `space.infectedvoices.studio` (or your registered replacement), version/build number and display name.
7. Run on a **real iPhone/iPad** and test: account approval, microphone permission, a full take, force-close recovery, comping, Precision Tune/Pocket, mixer, GRIM, mastering preview, WAV/project export, Classic MP3 and any production collaboration/TURN path.
8. In App Store Connect create the app record, privacy policy URL, privacy answers, age rating, screenshots and review notes.
9. In Xcode choose **Product → Archive**, then Organizer → **Distribute App → App Store Connect → Upload**.
10. Submit the build from App Store Connect after the production account/payment/login requirements in `STORE-READINESS.md` are satisfied.

The native patch adds the microphone usage description, `infectedvoices://` URL scheme, encryption declaration and `PrivacyInfo.xcprivacy`. App updates are store-managed; the app never downloads executable studio updates itself.
