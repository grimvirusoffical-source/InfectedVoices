# Cap parity checklist

Source of truth for this expansion: `docs/STUDY-infectedvoices-merge-gaps.md`. Ultimate is not a merge source. Infected ChordGuide and InfectedCoach are separate apps and stay out of scope.

Cap `webDir` is `dist/` from `npm run build:web`. The pinned vendor payload is **0.6.6-core6.1** (`dist/releases/studio.json`, SHA-256 `e6288c29a180d8d6048fcc9117a6f6a50e7d3225920aadeb2fe48288adaf8967`). The store build rebrands `0.6 COLLAB PILOT` to `CORE 5 MOBILE` and does not bootstrap collaboration. Package version stays 0.7.0. The native shell line is `0.6.6-mobile.2`.

## Plans

A signed-in account is **Free**. `allowed`, lifetime, member, studio, or a badge is not Basic.

| Tier | What it unlocks |
|---|---|
| Free | Record, arrange, classic MP3, and a master export labeled **16-bit WAV**. Free does not unlock GRIM, Precision Tune, Core 5 Producer, 24-bit export, Smart Mix + Master, or Project Lab |
| Basic ($20) | Those six tools. Default export is **48 kHz / 24-bit**. One 7-day trial per account (`basicTrialUsedAt`) |
| Pro ($40) | Everything in Basic, plus stems, AI mix/master, AI auto-tune, AI beat-lock, and vocal isolation. One 7-day trial (`proTrialUsedAt`). A verified Studio Plus receipt (`infectedvoices.studio.monthly`) maps to **Pro** |

Cloud AI stays a real `503` with `provider_not_configured`. The app does not invent a bounce. `/get` and `/download` are the same page: App Store and Google Play only (no ipa, no aab), Windows signed with SHA-256 beside the installer, open web goes to `/voices`, and there is no Mac `.app`. The GitHub zipball is source, not the Windows installer.

## Already in the Capacitor app

| Function | Where |
|---|---|
| Core 1–5 arrangement | `studio.html` — multitrack, import, practice session, journal/recovery, comp/punch, Core 3 mixer, `.ivproject`. GRIM, Precision Tune, Core 5 Producer, the Master stage, and 24-bit export are **Basic+**. Stems ZIP is **Pro** |
| Classic Studio + MP3 | `lab/index.html` — pocket and master profiles, `lamejs`. Classic MP3 is Free. Vocal stem export is **Pro** |
| Vocal Lab 0.7.0 home | `dist/index.html` — bar/beat loop, Pocket Assist ±80 ms, Ultimate Mic Master, Grim Beats, local RoEx key field. Project Lab and SMART MIX+MASTER are **Basic+**. Free WAV is 16-bit; Basic and Pro default to 48 kHz / 24-bit |
| Native share + 256 MB cap | `vocal-bridge.js` → `ivShell.saveFile` |
| Create \| Studio | 8-step coach. Free, Basic, and Pro cards with once-each 7-day trial buttons. Smart Mix, More → GRIM / Precision / Producer / Project Lab, and 24-bit export follow the plan |
| Pro gates | Stems, AI mix/master, AI tune, AI beat-lock, vocal isolation. Menus stay. Lock copy stays “$40 Pro plan” |
| House zinc/indigo, 44px targets | `mobile.css` and Vocal Lab controls |
| HTTPS host switch, store updates | Settings and Updates. Health check is `/api/health` with `service === InfectedVoices` |
| InfectedNation handoff | `https://nation.infectedvoices.space`. Apple, Google, Android/passkey, and email |
| Studio Plus store billing | `infectedvoices.studio.monthly` (Android plan `monthly`) via `@capgo/native-purchases`, verified at `/api/v1/billing/mobile/verify`. No Stripe button on iOS or Android |
| Browser RedX helpers | `browser-src/redx-api.js` and `browser-src/auth-choices.js` on the browser host only |
| Release & connect | More → Release & connect (DistroKid / SoundCloud allowlist) |
| Plugins, AI tools, tutorial | More sheet search. Preset JSON only |

## Windows 0.3.0 Vocal Lab — still to port

DLL, CLAP, and the signed updater stay on Windows. These three UX items are the remaining Lab port. They are not claimed as done.

| 0.3.0 behavior | Cap today |
|---|---|
| Project Lab stem board: per-stem gain and offset, feature-vocal import, Take vault | Vocal Lab has a Project Lab tab and a short take list. It is not that stem board |
| Continuous practice loop of a bar range while recording | Transport `setLoop` and “Loop these bars” exist. `startRecording()` does not keep that bar range cycling for the whole take |
| Smart Mix + Master as one 48 kHz / 24-bit listening-chain button | Project Lab has a SMART MIX+MASTER button (level, duck, compress, limit). Sample rate and bit depth are not verified against the 0.3.0 Go lab |

## Core 6 — in the payload, not the store launch

| Item | Cap |
|---|---|
| Files | `core6-collaboration.js` and `collaboration.js` ship inside `dist/` with the 0.6.6-core6.1 vendor |
| Store build | `mobile-entry.js` does not import `Core6Collaboration`. Launch page is Vocal Lab, not the “Two voices” pilot. Protocol stays `device-v1` |
| Optional flag | Not switched on. A later flag may open the collab UI and `collab-v2` against the production API, including mute-voice-while-recording. Default store builds stay solo |

## Desktop and browser only

- `InfectedTuneEngine.dll` and FL Studio CLAP/VST installers. Cap tune is the JS InfectedTune / Precision Tune path.
- Signed Windows updater, rollback, and Authenticode. Cap updates are App Store / Play only.
- Service worker and `manifest.webmanifest`. Deleted in the Cap build. Browser deploy may keep them.
- FL Studio / ASIO latency calibration.
- Browser Stripe checkout stays in `build-browser.mjs`. It is not copied into the Cap bundle.
- Cleartext HTTP and arbitrary JS/WASM plugins.

## Windows / browser / RedX → Cap

| Source function | Cap |
|---|---|
| Core 5 arrangement, mixer, GRIM, precision, classic lab | Same pinned vendor payload in `dist/`. Free does not unlock GRIM, Precision, Core 5, or 24-bit |
| Vocal Lab 0.7.0 | Cap home. 0.3.0 stem board and loop-while-record are still open |
| InfectedNation connect | Cap `signIn({flow, method})`. Browser auth grid uses `iv-auth-request` |
| RedXAIHost Studio Bearer API | `ivShell.request`. `desktop-session.js` wraps the JSON as `{data}` |
| Apple IAP / Play Billing Studio Plus | Store sheet |
| 256 MB native share, store listing updates, `infectedvoices://auth\|collab` | Kept from the RedX shell |
| `/voices/` browser host | Same `build:web` payload, or browser dist if that host should keep collab |

## Intentional platform gaps

- Export files above 256 MB are rejected.
- No web updater and no Windows self-updater in Cap.
- Core 6 is not bootstrapped. The files stay in the payload for an optional flag.
- Stripe is not used inside the iOS or Android apps. If the store product is unavailable, the sheet says so and offers Pro on web/desktop.
- Basic has no store product in the RedX sources. That purchase stays on web/desktop.
- A member’s RoEx key stays on device. This build does not upload audio or spend RoEx credits.
- ChordGuide and InfectedCoach are not part of this app.
