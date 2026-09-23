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
| Existing account / access | InfectedNation handoff (Apple, Google, Android/passkey, email). Studio calls use a Bearer token | InfectedNation handoff (Apple, Google, Android/passkey, email). Studio calls use a Bearer token |
| Studio Plus billing | Apple In-App Purchase `infectedvoices.studio.monthly`, verified with InfectedNation. No Stripe button | Google Play Billing `infectedvoices.studio.monthly` / `monthly`, verified with InfectedNation. No Stripe button |
| Host switching | HTTPS-only Mobile Settings | HTTPS-only Mobile Settings |
| Windows self-updater | Replaced by App Store updates | Replaced by Google Play updates |
| Core 6 collaboration (0.6.6-core6.1 payload) | Files ship in `dist/`. Store build does not bootstrap them. Optional flag is off. Cap opens Vocal Lab | Files ship in `dist/`. Store build does not bootstrap them. Optional flag is off. Cap opens Vocal Lab |
| Vocal Lab 0.7.0 (bar loop, Pocket Assist, Mic Master, Grim Beats, SMART MIX+MASTER, WAV/MP3) | Included as the Cap home page. Exports use native share and the 256 MB cap | Included as the Cap home page. Exports use native share and the 256 MB cap |
| Windows 0.3.0 Project Lab stem board | Not ported. Current Project Lab is the loop / master / take list, not per-stem gain, offset, and Take vault | Not ported. Same gap as iPhone |
| Windows 0.3.0 bar-range loop while recording | Transport loop exists. Recording does not keep that bar range cycling for the take | Transport loop exists. Recording does not keep that bar range cycling for the take |
| InfectedTuneEngine.dll / FL Studio CLAP | Desktop companion only | Desktop companion only |
| Arrangement / Classic Core 5 | Included from Vocal Lab → Arrangement Studio and Classic Studio | Included from Vocal Lab → Arrangement Studio and Classic Studio |

## Intentional deltas

Cap embeds the same Core 5 `build:web` payload as the browser. These are I/O and policy gaps, not a second FX stack. The Ultimate lab rebuild is not the parity source.

- Native share, with a 256 MB per-file export cap
- Plugin allowlist: preset JSON only; arbitrary JS/WASM plugins are rejected
- Store updates only (no in-app web updater)
- Core 6 files stay in the 0.6.6-core6.1 payload and are not bootstrapped. An optional flag is off
- Service worker / PWA updater is removed from Cap and may stay on the browser deploy
- Stripe is not used inside the iOS or Android apps. Studio Plus uses the store sheet. Browser Stripe checkout stays in the browser build
- Basic has no store product in the RedX sources. That purchase stays on web/desktop
- Windows DLL, CLAP, and the signed updater stay on the desktop
- Infected ChordGuide and InfectedCoach are separate apps

See `docs/STUDY-infectedvoices-merge-gaps.md`, `docs/STUDY-infectedvoices-parity.md`, and `docs/UI-mobile-chrome.md`.
