# Studier Intel — Infected Voices Core 5 feature parity

**Audience:** @Proframmer (Joshua: mobile GitHub apps must match Windows + browser; good mobile UI)  
**Sources:** `grimvirusoffical-source/InfectedVoices` README, MOBILE-FEATURE-MAP, STORE/PLAY readiness, APP-REVIEW-NOTES; local Ultimate at `/workspace/infected-voices-ultimate` (browser rebuild — not the pinned Core 5 vendor).  
**App id:** `space.infectedvoices.studio`

## Surfaces

| Surface | What it is |
|---------|------------|
| **Windows / Core 5 desktop** | Full pinned studio (arrangement, InfectedTune, GRIM, mastering, updater) |
| **Browser web** | Same Core 5 payload via `npm run build:web` → `dist/` (also what Cap embeds); hosted e.g. Nation `/voices/` |
| **Cap iOS / Android** | Capacitor 8 shell + touch chrome around that **same** Core 5 web payload |

Core 5 audio engine is intentionally shared. Gaps are mostly **I/O, permissions, updates, billing, and UI chrome** — not a second FX stack.

---

## Parity matrix

| Feature | Windows Core 5 | Browser web (`dist`) | Cap iOS | Cap Android | Gap / notes |
|---------|----------------|----------------------|---------|-------------|-------------|
| Arrangement / multitrack studio | ✓ | ✓ | ✓ touch-first + tablet landscape | ✓ same | UI density: mobile must keep large targets / single-column phone |
| Mic recording | ✓ | ✓ (getUserMedia) | ✓ native mic permission | ✓ RECORD_AUDIO | Test BT/wired + interruptions on device |
| Recording journal / recovery | ✓ | IndexedDB | ✓ app-local IDB | ✓ | Process-death recovery needs physical device QA |
| Comping / punch | ✓ | ✓ | ✓ | ✓ | — |
| InfectedTune / Precision Tune | ✓ | ✓ | ✓ | ✓ | WASM/JS must stay in package; no remote code swap |
| Pocket / Precision Pocket | ✓ | ✓ | ✓ | ✓ | — |
| Mixer / buses / EQ / comp / delay / reverb | ✓ | ✓ | ✓ | ✓ | — |
| Core 5 automation / sidechain | ✓ | ✓ | ✓ | ✓ | — |
| GRIM character rack | ✓ | ✓ | Basic+ | Basic+ | Free does not unlock GRIM, Precision, Core 5, 24-bit, Smart Mix, or Project Lab |
| LUFS / true-peak mastering | ✓ | ✓ | ✓ | ✓ | CPU heavier on low-end phones — profile |
| Export WAV / stems / project ZIP | Desktop save dialog | Download / File System Access | Native **share/document**; **256 MB/file cap** | Same share + **256 MB cap** | Large projects: split stems or warn under cap |
| Classic Studio / **MP3** (`lamejs`) | ✓ | ✓ | ✓ | ✓ | Keep `@breezystack/lamejs` in Cap deps |
| Custom / local beat import | File picker | `<input type=file>` | Share sheet / Files | SAF / Files | Entitlements may gate in Nation; studio itself supports |
| Plugins | Desktop rules | Preset JSON only | Preset JSON only; **arbitrary JS/WASM plugins rejected** | Same | Store security boundary |
| Account / access | Desktop account | HTTPS identity | Keychain session + HTTPS allowlist | Encrypted prefs + HTTPS | No cleartext; host switch HTTPS-only |
| Collaboration (Core 6) | In the 0.6.6-core6.1 vendor | Files in `dist/`; browser may keep collab | **Not bootstrapped.** Optional flag off | **Not bootstrapped.** Optional flag off | Store build rebrands the pilot and does not import it |
| Self-updater | Windows updater | Service worker / host deploy | **App Store only** — no sideload studio JS | **Play only** | Do not reintroduce web updater in Cap |
| Payments in-app | Stripe OK on web/desktop | Stripe OK on the browser host | Basic and Pro via StoreKit. No Stripe button. Free has no product | Basic and Pro via Play Billing. No Stripe button. Free has no product | iOS `space.infectedvoices.studio.basic.monthly` and `space.infectedvoices.studio.pro.monthly`. Android `iv_studio_basic` and `iv_studio_pro`. Signed-in is Free until server `studioPlan` is basic or pro |
| Deep link studio | n/a | URL | `infectedvoices://studio` | same | Validated by app bridge |
| Background / audio session | Full | Browser suspend risk | Needs AVAudioSession QA | Needs AudioFocus QA | Real device only |

---

## Must-match checklist (Joshua’s bar)

To claim “mobile = Windows + browser”:

1. Same Core 5 `build:web` payload in Cap `webDir` (no stripped FX).
2. Mic → record → InfectedTune/Pocket/GRIM → export **WAV and MP3** works on physical iPhone + Android.
3. Export path uses native share; show clear error if over **256 MB**.
4. Touch UI: phone single-column, tablet/landscape expanded (already in map) — polish with Nation house tokens only if embedded under Nation; standalone Cap keeps Infected Voices chrome.
5. Core 6 stays in the payload and stays unbootstrapped unless a flag is switched on.
6. Billing: Studio Plus uses the store. No Stripe button on iOS or Android.

## Known intentional deltas (OK)

- Updater mechanism (store vs Windows)
- 256 MB per-file export safety on mobile
- Plugin allowlist stricter on mobile
- No Core 6 collab bootstrap (files remain; flag is off)
- No Stripe purchase button on iOS or Android
- Windows 0.3.0 DLL, CLAP, and updater
- ChordGuide and InfectedCoach

Expanded inventory: `docs/STUDY-infectedvoices-merge-gaps.md`.

## Not the same as Ultimate

`/workspace/infected-voices-ultimate` is a Vite/Tone/Bungee lab rebuild. **Do not** treat it as Core 5 parity source of truth. Cap + Nation `/voices/` should use `InfectedVoices` repo `dist/`.

## Stress / QA focus

- Mic permission deny → recover  
- Mid-record phone call / BT disconnect  
- Export WAV + MP3 + ZIP under and over 256 MB  
- Long session + kill app → journal recovery  
- Low storage  
- Landscape tablet arrangement usability  

## Refs

- https://github.com/grimvirusoffical-source/InfectedVoices  
- Repo: `MOBILE-FEATURE-MAP.md`, `STORE-READINESS.md`, `PLAY-STORE-READINESS.md`, `APP-REVIEW-NOTES.md`
