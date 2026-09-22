# Privacy implementation notes

- No advertising SDKs are included in this project.
- The app declares no tracking in `PrivacyInfo.xcprivacy`.
- Account name/email/user ID are linked to the signed-in account and used for app functionality.
- Recordings remain local unless the user explicitly exports them or uploads them into collaboration.
- Collaboration audio is user-provided content used for app functionality.
- Device account-session secrets are stored in Keychain-backed secure storage.
- Network requests require HTTPS and native external destinations are allowlisted.

The App Store Connect privacy questionnaire must match the behavior of the production backend at the time of submission.
