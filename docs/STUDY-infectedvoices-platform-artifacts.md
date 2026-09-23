# Studier Intel — Platform shells + build/download artifacts

**Date:** 2026-09-23  
**Audience:** @Proframmer  
**Ask:** Confirm Mac shell vs Windows; list artifact paths; same pro feature set on browser / Cap iOS / Cap Android / Windows / **Mac**.

## Verdict: Mac shell

**No separate Mac native shell/repo found on Main PC or under `grimvirusoffical-source`.**

What exists instead:

| Surface | What it is | Repo / path |
|---------|------------|-------------|
| **Shared web studio** | Arrangement + Classic (Core 5/6 payload) | `InfectedVoices` vendor / `InfectedVoices-RedX` `browser-src` + `app-source` |
| **Cap iOS / Android** | Capacitor 8 around same `build:web` dist | GitHub `grimvirusoffical-source/InfectedVoices` |
| **Windows (historical)** | Go launcher + local browser UI + DLL/CLAP (0.3.0 Vocal Lab); later RedX browser server | Zip packages on disk; **no dedicated public Windows git repo found** beside Cap |
| **Mac** | **Browser-only** today (same web as Windows RedX browser). Folder name `Infected-Voices-v0.6.0-Windows-macOS-Build-Source` is **shared web source**, not a `.app` / Electron / Tauri Mac shell | Downloads on Main |

`package.json` Cap scripts: `native:ios` / `native:android` only — **no `native:mac` / Electron / DMG pipeline**.

### Implication for “all platforms including Mac”

1. **Feature parity** = one web Core payload (Create|Studio, Free/Basic/Pro) served to browser + Cap WebView + Windows desktop wrapper.  
2. **Mac** ships as **browser download page → Open web** until you add a real Mac shell (Electron/Tauri wrapping the same `browser-dist`, or Mac Catalyst).  
3. Don’t invent a Mac repo until that shell exists — document Mac = web for now.

---

## Main PC inventory (paths)

### Working trees (`C:\Users\MainDirectory\`)

| Folder | Remote | Role |
|--------|--------|------|
| `InfectedVoices` | `github.com/grimvirusoffical-source/InfectedVoices` | Cap primary (android/, ios/, vendor, dist) |
| `InfectedVoices-EAS` | same remote | EAS cloud release checkout |
| `InfectedVoices-RedX` | same remote lineage | Richest: `browser-src`, `browser-dist`, `redx-browser-server.mjs`, Cap too |
| `InfectedVoices-StoreClean` | same | Store-clean Cap tree |
| `RedXAIHost\services\infectednation` | local RedX | Identity |
| `RedXAIHost\services\discord-verify` | local RedX | Discord verify bot |

### Downloads artifacts

| Artifact | Path |
|----------|------|
| Windows 0.1.0 package | `Downloads\Infected-Voices-v0.1.0-Windows-x64\` |
| Windows/macOS **web build source** 0.6.0 | `Downloads\Infected-Voices-v0.6.0-Windows-macOS-Build-Source\` |
| Cap Android AAB 0.6.5 | `Downloads\Infected-Voices-0.6.5-v10.aab` |
| Cap iOS IPA 1.0 b7 | `Downloads\Infected-Voices-iOS-1.0-build7.ipa` |
| iOS Xcode project zip/folder | `Downloads\InfectedVoices-iOS-Xcode-Project` |
| Play/service JSON | `Downloads\infectedvoices-5a1230be5b5b.json` |
| Older Vocal Lab 0.3.0 (box) | `/workspace/auto-tune-existing/Infected Voices/` (+ `.exe`, `InfectedTuneEngine.dll`, CLAP) |

### Build outputs (how to produce)

| Platform | Command / output | Push target for store |
|----------|------------------|------------------------|
| **Web / browser** | `InfectedVoices-RedX`: `node scripts/build-browser.mjs` → `browser-dist/` · serve via `redx-browser-server.mjs` / RedX host | Host on RedX / CDN; `/download` “Open web” |
| **Cap web payload** | `npm run build:web` → `dist/` | Embedded in iOS/Android |
| **Android** | `npm run native:android` / EAS → `android/` · AAB e.g. `Infected-Voices-0.6.5-v10.aab` | **InfectedVoices** git → Play Console |
| **iOS** | `npm run native:ios` / EAS → `ios/` · IPA e.g. `Infected-Voices-iOS-1.0-build7.ipa` | **InfectedVoices** git → App Store Connect |
| **Windows desktop** | Historical zip exe; RedX has `eas-windows-bootstrap.ps1` (investigate) + Go 0.3.0 launcher | **Need a Windows repo** (create `InfectedVoices-Windows` or desktop monorepo) — not Cap |
| **Mac desktop** | **None** | Create Electron/Tauri wrapper repo later, or Mac = web only |

---

## Repo push plan (Joshua: Windows → its repo; Apple/Android → theirs)

| Store / desktop | Recommended git remote | Notes |
|-----------------|------------------------|-------|
| iOS + Android (Cap) | `grimvirusoffical-source/InfectedVoices` | Already exists; push Cap PR #3 here |
| Windows native | **Create** `InfectedVoices-Windows` (or `InfectedVoices-Desktop`) | Carry launcher + signed installer; share web `browser-dist` as submodule or CI artifact |
| Mac native | **Defer** or same Desktop repo with `mac` target | Until shell exists, download page = Open in browser |
| Browser site `/download` | Marketing/RedX site | Cards: Windows installer URL, App Store, Play, Open web — **no raw ipa/aab** on CDN |

---

## Same pro feature set (all platforms)

One entitlement matrix (`STUDY-infectedvoices-pricing.md`) + producer bar (`STUDY-infectedvoices-producer-level.md`) on the **shared web payload**. Cap/Windows/browser all load that payload; only shell chrome + file I/O differ (parity doc).

## Related

- `STUDY-infectedvoices-parity.md`, `STUDY-infectedvoices-merge-gaps.md`  
- Cap `UPLOAD-APPLE.md`, `UPLOAD-ANDROID.md`
