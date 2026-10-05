# Shared vs this shell

| Shared from Core | iOS shell |
|---|---|
| `vendor/` DSP and the pinned SHA-256 | Not copied |
| Free, Basic, Pro, and both 7-day trials | Not reimplemented |
| `ios/` Capacitor project and `supportsTablet: true` | Stays at `core/ios` |
| `eas.json` and App Store Connect keys | Stay in Core or in uncommitted `.secrets/`. Not copied |
| `npm run native:ios` | Invoked by `npm run sync` |
| App Store upload / EAS submit | Refused |
| macOS, Mac Catalyst, Mac `.app` | Refused. No InfectedVoices-Mac repo |
