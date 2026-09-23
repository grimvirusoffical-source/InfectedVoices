# Studier Intel — Infected Voices: producer-level polish (all platforms)

**Date:** 2026-09-23  
**Audience:** @Proframmer, @Ui Designer, @Stress Tester  
**Ask (Joshua):** Take **all** functionality and make it **extremely professional / producer-level** — Free/Basic/Pro still apply; quality bar rises everywhere.

This is not new features for their own sake. It is how every existing surface behaves, meters, labels, defaults, and guides so a working producer trusts the app like a serious DAW vocal suite.

---

## 1. Bar definition (pass/fail)

Producer-level means:

1. **Honest meters** — sample peak + true-peak where mastering; integrated / short-term LUFS on master path (Core 5 already measures — surface them always when mastering is on).  
2. **Gain-stage safe defaults** — input target guidance (~−12 to −6 dBFS peaks on lead); never start with a slamming limiter.  
3. **Two modes, one engine** — **Create** (one-click, good defaults) and **Studio** (full panels). Same DSP; Create never hides Studio controls permanently.  
4. **Preview → Keep** on every destructive timing/pitch/AI path (already Cap pattern — enforce everywhere).  
5. **Deliverables producers expect** — 24-bit WAV masters (Basic+), aligned stems (Pro), session BPM/key metadata, portable project (Basic+).  
6. **No fake AI** — RoEx/AI paths show real errors; never invent a finished master.  
7. **Tier locks are professional** — sheet names the exact entitlement; Free still feels like a real studio, not a toy.

---

## 2. Guided producer workflow (walkthrough stages)

Map walkthrough + inspector stages to a real vocal chain (keep existing stage coach; tighten copy + defaults):

| Stage | Newbie one-click | Advanced still open |
|-------|------------------|---------------------|
| 1 Prepare | “New song from beat” template (Lead / Beat / Bus) | Full track kinds, import multi-file |
| 2 Record | “Record verse” arm + count-in + loop-while-rec | Punch, comp, journal recovery |
| 3 Comp / edit | “Pick best take” mute flip | Clip gain, fades, take lanes |
| 4 Tune | “Tune my vocals” local InfectedTune preset | Precision Tune (Basic+) |
| 5 Timing | “Tighten timing” conservative Pocket | Precision Pocket / warps (Basic+) |
| 6 Mix | “Balance vocals to beat” auto gains | Full mixer, GRIM, automation, sidechain (Basic+) |
| 7 Master | “Make it release-ready” Core 5 master preset (Basic+) or gentle Free bus | Full LUFS/TP controls (Basic+) |
| 8 Export | “Export song” 16-bit WAV (Free) / 24-bit (Basic+) | Stems ZIP (Pro), MP3 Classic, portable project |

Walkthrough tip text must use producer language (clip gain, headroom, true peak) not gamer slang.

---

## 3. Metering & monitoring (producer chrome)

| Meter | Where | Spec |
|-------|-------|------|
| Input / track peak | Transport + selected track | Sample peak dBFS; clip flag at 0 |
| Track RMS / short loudness | Inspector | Help text for −18…−12 ballpark pre-FX |
| Master sample peak | Master bus | Always visible |
| **True peak (dBTP)** | When Core 5 mastering enabled | Ceiling default **−1.0 dBTP** |
| **Integrated + short-term LUFS** | Master / export dialog | Show after render + live when possible |
| Correlation / mono check | Master (nice-to-have) | Dim + mono buttons on transport |

Export dialog must print: integrated LUFS, true peak, sample rate, bit depth, BPM — like a delivery note.

---

## 4. Professional defaults (Create rail)

One-click actions write **bounded** parameter plans, then still allow Undo:

- Tune: medium correction, genre-aware key if set, never max retune on Free presets  
- Pocket: conservative strength, ±80 ms spirit on Assist path  
- Balance: vocal vs beat gain staging (existing `balance()` — expose as “Balance to beat”)  
- Master (Basic+): streaming-safe TP ceiling −1 dBTP; don’t chase a single LUFS number — show measured LUFS after  
- AI (Pro): consent + credit copy unchanged; preview before commit  

---

## 5. Surface polish checklist (Ui Designer)

- Dense but calm zinc/indigo; tabular nums on clocks/meters  
- Transport sticky; Rec ≥52×44; all hits ≥44px on Cap  
- Producer tools in More/Producer: Project Lab, Smart Mix+Master, GRIM, automation  
- Lock sheets: “Included in Basic $20” / “Included in Pro $40” with feature name  
- Empty states explain next producer step (“Import a beat to set grid + BPM”)  
- No emoji-heavy copy in Studio chrome  

---

## 6. Platform notes

| Platform | Producer-level extra |
|----------|----------------------|
| Cap iOS/Android | Same Create/Studio rails; Share export with delivery stats; no Stripe CTA |
| Browser / Windows | Same; desktop save dialogs; CLAP labeled Windows-only |
| Nation `/voices` embed | Same studio; identity SSO; pricing = IV studio plans not Nation social |

---

## 7. Stress / acceptance (producer bar)

1. Free can finish a song (record → local tune/pocket → mix → 16-bit WAV) with walkthrough.  
2. Basic export dialog shows LUFS + true peak on Core 5 master.  
3. Every pitch/time/AI path is Preview → Keep or cancel.  
4. Create one-clicks don’t remove advanced panels.  
5. Pro stem ZIP imports at time zero with BPM metadata.  
6. Failed RoEx shows error, not a fake bounce.  

## Related

- `STUDY-infectedvoices-pricing.md` (Free / Basic / Pro)  
- `STUDY-infectedvoices-merge-gaps.md`  
- `UI-guided-and-tiers.md`, `UI-mobile-merge-surfaces.md`
