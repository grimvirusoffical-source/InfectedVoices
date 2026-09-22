# Suggested App Review notes

**App:** Infected Voices

Infected Voices is a music recording and vocal-production app. Audio recording, editing, pitch/timing correction, mixing, automation and mastering run locally on the device. A user explicitly chooses when to export or share audio. Collaboration uploads only occur after the user joins a collaboration session.

The iOS build uses an existing Infected Voices account for access. It does not expose Stripe checkout, redemption codes or other external digital-purchase calls-to-action inside the app. If we enable paid digital access for purchase in the iOS app, we will configure Apple In-App Purchase and server-side entitlement validation first.

Microphone permission is used for vocal recording and optional collaboration voice chat. Voice chat is muted while the user is recording a take so the call does not contaminate the recording path.

App updates are distributed through the App Store. The iOS binary does not download replacement executable web code.

For review, provide a test account with active Studio access and a sample beat/project if the reviewer needs to exercise gated features.
