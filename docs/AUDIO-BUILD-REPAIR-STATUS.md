# Audio and build repair status

This is a tested source repair, not a completed native-app release.
Base: `4c2e433abf8a53956810f22d21933d4224bd93e1`.

## Implemented

- Windows mobile/browser payload builds invoke the installed npm JavaScript CLI rather than spawning `npm.cmd`, fixing the reproduced EINVAL failure.
- Studio dependency installation uses the lockfile; required audio worklets are copied explicitly with dependency scripts disabled.
- Zero correction is permitted in live and offline tuning. Invalid correction values fail dry rather than propagating NaN.
- Offline processing keeps takes and trailing fragments shorter than 256 samples; dry takes skip pitch processing.
- Pitch correction chooses the nearest allowed note from continuous pitch, including octave boundaries.
- YIN rejects silence, DC, invalid samples and invalid rates, bounds its vocal lag search, and guards interpolation.
- Audio workers are disposed in failure paths. Beat import object URLs are released.
- The six original unit tests are retained and nine regression tests added.
- CI now validates units and the complete mobile payload on Windows and Linux.

## Local validation evidence

`audio-repair-evidence/validation.json` records Windows, Node version, timestamps, local source hashes and exit codes. Three successive rounds each passed all 15 unit tests, the browser/mobile payload build, and the mobile payload verifier. Source hashes were unchanged through those final rounds. Build logs retain the large-JavaScript-chunk warning; it was not hidden or reclassified as a release pass.

The pitch tests use synthetic tones. Two regression cases inspect source safeguards. These results are not listening tests, microphone/device tests, native-store purchase tests, or proof of producer-grade sound quality.

## AI product names

`models/registry.json` records Virus Master (mixing/mastering), Grim Vocals (vocal-to-beat alignment), and Grim Virus Auto Tune (pitch correction), while preserving existing feature IDs. No weights were trained, provisioned or served. All entries explicitly remain non-production. No quality claim or paid AI availability is enabled by this registry.

## Release gates still open

- Reconcile the UI tier contract with actual payment products and authoritative backend entitlement handling. This repair does not change payment code, live prices, customers, or subscriptions.
- Complete and verify native store purchase/restore handling, renewals, cancellation, refunds and expired access.
- Finish the unavailable AI processing, collaboration and lifetime-code paths before enabling them as completed features.
- Complete feature-parity validation across the preserved Core versions; retained source is not the same as enabled mobile functionality.
- The separate iOS, Android and Windows repositories remain pinned to their prior Core commit. They have not been repinned to this unmerged repair.
- Build, sign and verify the real Windows installer and iOS/Android distribution artifacts. None was released by this repair.
- Perform real-device audio, save/recovery, long-session, interruption, export, latency and matched-level listening tests.

## Host and scope

The running Red-XAI checkout, host services, DNS and unpublished local work were left unchanged. The local host health endpoint responded HTTP 200. Unauthenticated public health requests to the studio and account domains returned HTTP 403; that does not establish an outage, and public reachability is not marked passed.

The supplied shared-chat URL could not be loaded. Accessible historical handoffs, repository source and local checkouts were used instead; this is not a claim that the full shared conversation was read.
