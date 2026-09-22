# Suggested Google Play Data safety worksheet

Use this as a checklist when completing Play Console. The final answers must match the live backend at submission time.

- **Account identity:** name/email/user ID may be processed for account access and app functionality.
- **Audio:** recordings stay local unless the user deliberately exports/uploads them. Any future cloud/collaboration upload is user-provided content for app functionality.
- **Tracking/ads:** this project contains no advertising SDK and does not implement cross-app tracking.
- **Device session secret:** stored in platform secure storage; do not describe it as user-visible personal data.
- **Encryption in transit:** account/API traffic is HTTPS-only.
- **Deletion:** describe the actual production account deletion process available to users; do not claim deletion behavior the backend does not provide.
- **Optional vs required data:** microphone/audio is only used when the user chooses recording or another audio feature.
