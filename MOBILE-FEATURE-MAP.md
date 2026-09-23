# Core 5 mobile feature map

| Windows/Core 5 feature | iPhone / iPad | Android |
|---|---|---|
| Arrangement Studio | Included; touch-first phone layout and expanded tablet/landscape layout | Included; touch-first phone layout and expanded tablet/landscape layout |
| Multitrack recording | Included with native microphone permission | Included with native microphone permission |
| Recording journal / recovery | Included; app-local IndexedDB | Included; app-local IndexedDB |
| Comping / punch recording | Included | Included |
| InfectedTune / Precision Tune | Basic+. Free can open the menu; the action locks | Basic+. Free can open the menu; the action locks |
| Pocket / Precision Pocket | Pocket assist is available. Precision is Basic+ | Pocket assist is available. Precision is Basic+ |
| Core 3 mixer / buses / EQ / compression | Included | Included |
| Shared delay / reverb | Included | Included |
| Core 5 automation / sidechain | Basic+ (Core 5 Producer). Panels stay visible | Basic+ (Core 5 Producer). Panels stay visible |
| GRIM rack | Basic+. Free does not turn GRIM on | Basic+. Free does not turn GRIM on |
| LUFS / true-peak producer mastering | Master stage is in the payload. Smart Mix + Master is Basic+ | Master stage is in the payload. Smart Mix + Master is Basic+ |
| WAV / stems / project ZIP export | Free export is 16-bit WAV. Basic and Pro default to 48 kHz / 24-bit. Stems are Pro. 256 MB cap | Free export is 16-bit WAV. Basic and Pro default to 48 kHz / 24-bit. Stems are Pro. 256 MB cap |
| Classic Studio / MP3 encoder | Classic MP3 is Free | Classic MP3 is Free |
| Existing account / access | InfectedNation handoff (Apple, Google, Android/passkey, email). Studio calls use a Bearer token | InfectedNation handoff (Apple, Google, Android/passkey, email). Studio calls use a Bearer token |
| Studio Plus billing | Apple In-App Purchase `infectedvoices.studio.monthly`, verified with InfectedNation. No Stripe button | Google Play Billing `infectedvoices.studio.monthly` / `monthly`, verified with InfectedNation. No Stripe button |
| Host switching | HTTPS-only Mobile Settings | HTTPS-only Mobile Settings |
| Windows self-updater | Replaced by App Store updates | Replaced by Google Play updates |
| Core 6 collaboration (0.6.6-core6.1 payload) | Files ship in `dist/`. Store build does not bootstrap them. Optional flag is off. Cap opens Vocal Lab | Files ship in `dist/`. Store build does not bootstrap them. Optional flag is off. Cap opens Vocal Lab |
| Vocal Lab 0.7.0 (bar loop, Pocket Assist, Mic Master, Grim Beats, WAV/MP3) | Cap home page. Free WAV is 16-bit. SMART MIX+MASTER and Project Lab are Basic+. Exports use native share and the 256 MB cap | Cap home page. Free WAV is 16-bit. SMART MIX+MASTER and Project Lab are Basic+. Exports use native share and the 256 MB cap |
| Plans | Free, Basic ($20), Pro ($40). Signed-in is Free. Each trial is once, for 7 days (`basicTrialUsedAt`, `proTrialUsedAt`). Studio Plus verify maps to Pro | Same |
| Windows 0.3.0 Project Lab stem board | Not ported. Current Project Lab is the loop / master / take list, not per-stem gain, offset, and Take vault | Not ported. Same gap as iPhone |
| Windows 0.3.0 bar-range loop while recording | Transport loop exists. Recording does not keep that bar range cycling for the take | Transport loop exists. Recording does not keep that bar range cycling for the take |
| InfectedTuneEngine.dll / FL Studio CLAP | Desktop companion only | Desktop companion only |
| Arrangement / Classic Core 5 | Studios open from Vocal Lab. GRIM, Precision, Core 5 Producer, and 24-bit stay Basic+ | Studios open from Vocal Lab. GRIM, Precision, Core 5 Producer, and 24-bit stay Basic+ |

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
