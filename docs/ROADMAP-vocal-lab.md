# Infected Voices Vocal Lab — consolidated ROADMAP

**Date:** 2026-09-23  
**Owners:** Proframmer · Studier · Ui Designer · Stress Tester  
**Sources:** PLAN-vocal-lab-features.md + Studier additions + STUDY pricing / producer-level / parity / merge-gaps

---

## Ship order (do not reorder casually)

1. **Cap PR #3** — Create|Studio, Free/Basic/Pro locks, trial CTAs, coach  
2. **Producer honesty** — meters, delivery-note export, Preview→Keep audit, sample-rate label  
3. **Create one-clicks** — de-ess / highpass / Balance to beat / Smart Mix (0.3.0 chain)  
4. **Project Lab Cap UX** + loop-while-rec parity  
5. **Pro AI** — RoEx mix/isolation/autotune/pocket; real errors; credits ≠ sub  
6. **Live billing** — Cap intro offers + Stripe trials/webhooks  
7. **Optional later** — Core 6 flag, auto BPM/key, A/B + mono/dim  

---

## A. Rails & UX

- Create | Studio (same DSP; Create never strips Studio)
- 8-stage walkthrough (Prepare→Export), producer language
- Lock sheets: Free→Basic (Precision/GRIM/Core5/24-bit/Smart Mix/Project Lab); Basic→Pro (stems + four AI)
- Never lock Free’s local InfectedTune / conservative Pocket

## B. Plans

| Plan | Price | Promise |
|------|-------|---------|
| Free | $0 | Local tune + conservative Pocket + Core3 + MP3/16-bit + walkthrough |
| Basic | $20/mo | Full local pro (BASIC_PLUS) |
| Pro | $40/mo | + stems + AI five |
| Trials | 7d Basic + 7d Pro | Once each (`basicTrialUsedAt` / `proTrialUsedAt`) |

Nation social tier must **never** unlock studio Pro.

## C. DSP / local upgrades (Studier)

- Explicit **clip-gain / phrase rides** before compress
- **Count-in** + input peak target guidance (−12…−6 dBFS)
- **Sample-rate honesty:** pick one delivery default and **label it**  
  - **Decision:** Smart Mix / Basic+ master default = **48 kHz / 24-bit** (0.3.0 Vocal Lab); Free 16-bit WAV labeled with actual SR (often 44.1 today — migrate or stamp clearly)
- **De-ess** + **highpass** as Create one-clicks (not buried only in advanced)
- Cap: **BT/wired latency warning** (no ASIO); Windows ASIO/CLAP desktop-only

## D. RoEx / AI (Pro)

Gate keys: `ai_mix_master`, `vocal_isolation`, `ai_autotune`, `ai_pocket` (+ `stems`)

- RoEx **credits ≠ IV subscription**
- Consent checkbox; allowlisted hosts only
- **Never** fake a bounce on failure
- Prefer server-held RoEx key for productized one-click; user-pasted key OK for power users, not required for one-click if productized

## E. Cap IAP / billing

- Soft launch: Free + QA demo plan flip until IAP products exist
- Then: StoreKit/Play intro 7d Basic + 7d Pro; IDs in STUDY-pricing; **no Stripe CTA in Cap**
- Web/Windows: Stripe Prices + webhook → same `plan` / trialUsedAt
- Cap restore purchases sync to same fields

## F. Optional later (don’t block PR #3)

- Core 6 collab behind flag
- Auto BPM/key from beat import
- Reference-track A/B + mono/dim

## G. Stress acceptance (summary)

Free finishes a song; Basic export shows LUFS+TP; Preview→Keep on pitch/time/AI; Create doesn’t hide Studio; Pro stems/AI real; trials once-only; Nation≠studio Pro; no fake RoEx bounce.

