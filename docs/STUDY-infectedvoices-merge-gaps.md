# Studier Intel — Merge ALL functions into Cap mobile (beyond parity doc)

**Date:** 2026-09-23  
**Trigger:** Joshua — grab all versions (Main PC + deploy) and put **all** functions into Cap GitHub apps; not chrome-only.  
**Audience:** @Proframmer  

## Inventory (Main PC + box)

| Source | Location | Role |
|--------|----------|------|
| Windows Vocal Lab **0.3.0** | Box zip `/workspace/auto-tune-existing/Infected Voices` (+ Desktop shortcut) | Go launcher + browser UI + `InfectedTuneEngine.dll` + **CLAP** for FL Studio; Project Lab, practice loops, Pocket Assist, Smart Mix+Master, signed updater |
| Windows/macOS **0.6.0** build source | `Downloads\Infected-Voices-v0.6.0-Windows-macOS-Build-Source\...\source-web\workstation` | Arrangement studio lineage (thin tree on disk) |
| Cap / GitHub **InfectedVoices** | `grimvirusoffical-source/InfectedVoices` + `/workspace/InfectedVoices` | Capacitor shell; vendored studio = **0.6.6-core6.1 payload** forced to **Core 5 mobile** branding |
| Mobile binaries | `Infected-Voices-0.6.5-v10.aab`, `Infected-Voices-iOS-1.0-build7.ipa` | Store packages of Cap build |
| Browser / RedX deploy | `app.infectedvoices.space/voices/`, identity `nation.infectedvoices.space` | Hosted Core 5/6 web |
| Ultimate lab | `/workspace/infected-voices-ultimate` | Vite/Tone rebuild — **not** merge source of truth |
| Other apps (separate) | Infected ChordGuide, InfectedCoach | **Out of scope** unless Joshua asks |

Pinned Cap vendor SHA-256: `e6288c29a180d8d6048fcc9117a6f6a50e7d3225920aadeb2fe48288adaf8967`.

---

## What Cap already has (from same vendor payload)

Core 1–5 path in Arrangement Studio + Classic Studio lab:

- Multitrack arrangement, import audio, practice session  
- Recording journal / recovery, comping / punch (`recording-journal`, `take-editing`)  
- Precision Tune + Precision Pocket (`precision-*`)  
- Core 3 mixer / buses / EQ / compression / shared FX  
- Core 5 automation, sidechain, GRIM, LUFS/true-peak mastering (`producer-*`)  
- Export master WAV 16/24, stems ZIP, portable `.ivproject`  
- Classic Studio: pocket timing, mastering profiles, **MP3** (`lamejs`), vocal stem export  
- Account / HTTPS host switch (`device-v1`)  
- Touch chrome + safe areas  

---

## Gaps Cap intentionally strips or does not ship (merge candidates)

### A. Present in vendor, disabled / rebranded for store Core 5

| Capability | Evidence | Cap today | Merge action |
|------------|----------|-----------|--------------|
| **Core 6 collaboration** (sessions, track ownership, offline queue, presence, voice chat) | `core6-collaboration.js`, `collaboration.js`, `releases/studio.json` notes Core 6; brand `0.6 COLLAB PILOT` | `build-web.mjs` renames to `CORE 5 MOBILE`; store docs say Core 6 **not bootstrapped**; protocol forced `device-v1` | Optional flag to enable Core 6 UI + `collab-v2` against production collab API; keep voice muted while recording (already designed) |
| **Web service worker / PWA updater** | `sw.js`, `manifest.webmanifest` | Deleted in Cap build (App Store/Play update only) | **Do not re-add** on Cap (policy). Keep on browser deploy only |
| **“Continue with Google”** copy | studio.html | Replaced with browser account return flow | Keep Cap account bridge; ensure web Google OAuth still works on browser host |

### B. Windows Vocal Lab 0.3.0 features not named in Cap Core 5 UI

These live in the **0.3.0 Go/browser Vocal Lab** package (DLL/CLAP). Cap Classic/Arrangement covers *similar* DSP ideas under different names — still call out for product parity:

| 0.3.0 feature | Cap equivalent / gap |
|---------------|----------------------|
| **Project Lab** (multi stem gain/offset, feature vocal import, Take vault) | Arrangement tracks + import + Classic clips — **no dedicated Project Lab screen**; consider porting Lab UX into Cap “More” or Classic |
| **Continuous practice loop by bar range while recording** | Transport loop exists in studio; verify bar-range continuous rec matches 0.3.0 behavior end-to-end |
| **Pocket Assist ±80 ms onset nudge** | Classic/Precision Pocket is richer; ensure one-button “Assist” preset matches 0.3.0 limits |
| **Smart Mix + Master** one-button 48k/24-bit render | Core 5 Producer mastering + Classic master profiles — wire a single **Smart Mix + Master** CTA that matches 0.3.0 listening chain |
| **InfectedTuneEngine.dll** native DSP | JS InfectedTune / Precision Tune in web — parity via web path, not DLL |
| **FL Studio CLAP / VST installers** | **Desktop-only**; cannot ship in Cap. Document as Windows companion; deep-link “Open on PC” |
| **Signed/encrypted private updater + rollback** | Cap uses store updates; Windows keeps `.iv` updater — desktop-only |

### C. Desktop / browser-only integrations

| Item | Notes |
|------|--------|
| `ivDesktop` / native save dialogs | Cap uses Share / Filesystem Plugins — already mapped |
| **RoEx** AI separate/mix (API key in dialog) | Code in `app.js` / Classic `ai-mixer.js`; allowlisted hosts in Cap shell — **enable UI on mobile** if account permits; never hardcode keys |
| DistroKid / SoundCloud export links | Allowlisted; ensure buttons reachable in mobile More sheet |
| FL Studio / ASIO latency calibration | Windows only |

### D. RedX / Nation deploy

| Host | Expectation |
|------|-------------|
| `/voices/` on app host | Serve **same** `npm run build:web` `dist/` Cap uses (or full browser dist **with** Core 6 if web should keep collab) |
| Identity | Unchanged; Cap account via HTTPS identity |

---

## Recommended merge plan for Proframmer

1. **Freeze source of truth:** Cap `vendor` / `build:web` Core payload — not Ultimate.  
2. **Audit checklist (automated):** fail CI if Cap `dist` lacks files: `producer-ui.js`, `precision-ui.js`, `mixer-ui.js`, `classic` lab, MP3 codec, export suite.  
3. **Re-enable product features Joshua asked for “all functions”:**  
   - Add **Smart Mix + Master** + **Project Lab**-style stem board (port from 0.3.0 UX onto Arrangement/Classic).  
   - Verify practice-loop-while-record == 0.3.0.  
   - Optionally ship **Core 6 collab** behind a server capability flag (browser + Cap), not permanently stripped.  
4. **Never merge into Cap:** Windows updater, CLAP/DLL, Authenticode, cleartext HTTP, arbitrary plugin JS.  
5. **UI:** keep Ui Designer’s touch chrome; do not drop panels to “simplify” mobile.  
6. **QA matrix:** physical iOS+Android — mic, BT interrupt, export WAV+MP3+ZIP under/over 256MB, journal recovery, Precision/GRIM/master, Classic MP3, optional collab voice mute-on-rec.

## Short reply for cloud agent

> Expand Cap beyond chrome: keep Core 5 `dist` complete; port Vocal Lab 0.3.0 Project Lab + Smart Mix+Master CTAs; verify loop-while-record; optionally bootstrap Core 6 collab (already in vendor) behind flag; exclude DLL/CLAP/Windows updater.

## Related docs

- `/workspace/infected-nation/docs/STUDY-infectedvoices-parity.md`  
- `/workspace/InfectedVoices/MOBILE-FEATURE-MAP.md`  
- `/workspace/InfectedVoices/docs/UI-mobile-chrome.md`
