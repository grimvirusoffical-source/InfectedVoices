# Core 5 mobile feature map

| Windows/Core 5 feature | iPhone / iPad | Android |
|---|---|---|
| Arrangement Studio | Included; touch-first phone layout and expanded tablet/landscape layout | Included; touch-first phone layout and expanded tablet/landscape layout |
| Multitrack recording | Included with native microphone permission | Included with native microphone permission |
| Recording journal / recovery | Included; app-local IndexedDB | Included; app-local IndexedDB |
| Comping / punch recording | Included | Included |
| InfectedTune / Precision Tune | Included | Included |
| Pocket / Precision Pocket | Included | Included |
| Core 3 mixer / buses / EQ / compression | Included | Included |
| Shared delay / reverb | Included | Included |
| Core 5 automation / sidechain | Included | Included |
| GRIM rack | Included | Included |
| LUFS / true-peak producer mastering | Included | Included |
| WAV / stems / project ZIP export | Native share/document flow; 256 MB per-file mobile safety cap | Native share/document flow; 256 MB per-file mobile safety cap |
| Classic Studio / MP3 encoder | Included | Included |
| Existing account / access | Guarded device-v1 account API | Guarded device-v1 account API |
| Host switching | HTTPS-only Mobile Settings | HTTPS-only Mobile Settings |
| Windows self-updater | Replaced by App Store updates | Replaced by Google Play updates |
| Unreleased Core 6 collaboration | Not bootstrapped in Core 5 store build | Not bootstrapped in Core 5 store build |

## Intentional deltas

Cap embeds the same Core 5 `build:web` payload as the browser. These are I/O and policy gaps, not a second FX stack. The Ultimate lab rebuild is not the parity source.

- Native share, with a 256 MB per-file export cap
- Plugin allowlist: preset JSON only; arbitrary JS/WASM plugins are rejected
- Store updates only (no in-app web updater)
- Core 6 collaboration is not bootstrapped
- No Stripe purchase CTAs on iOS or Android until StoreKit / Play Billing is wired

See `docs/STUDY-infectedvoices-parity.md` and `docs/UI-mobile-chrome.md`.
