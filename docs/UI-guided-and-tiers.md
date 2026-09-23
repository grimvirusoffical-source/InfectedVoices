# Infected Voices — guided UX + tiers (all platforms)

**For:** @Proframmer  
**Look:** House zinc/indigo (`UI-mobile-chrome.md`). Same chrome on Windows / browser / Cap — layout adapts; no second brand.  
**Rule:** Newbies get guided + one-click. Advanced stays reachable (More / Producer). Never strip Core 5 panels.

---

## 1. Product rails (two modes, one app)

| Mode | Who | What they see first |
|------|-----|---------------------|
| **Create** (default) | New / casual | Walkthrough + one-click CTAs |
| **Studio** | Pros | Full Arrangement / Classic / Producer (current density) |

Toggle in header: segmented **Create | Studio**. Persist per account. Switching never deletes project data.

---

## 2. Guided walkthrough (record → tune → mix → export)

### First-run coach (8 steps, dismissible)
Overlay or coach marks — not a separate app.

| Step | Title | Spotlight | Primary CTA | Skip |
|------|-------|-----------|-------------|------|
| 1 | Record | REC + mic permission | **Record a take** | Skip tour |
| 2 | Loop | Bar-range loop | **Arm the loop** | |
| 3 | Tune | InfectedTune / Precision | **Auto-tune take** | |
| 4 | Pocket | Precision Pocket | **Open Pocket** | |
| 5 | Mix | Smart Mix + Master | **One-click mix** | |
| 6 | Project Lab | Project Lab | **Open Project Lab** | |
| 7 | Producer | GRIM, Precision, Core 5 | **Open Producer** | |
| 8 | Export | Export / Share | **Export WAV** | Done |

- Progress dots 1–8; Back / Next; “Don’t show again” on last step  
- Resume coach from More → **Guided tour** anytime  
- Cap: 44px CTAs; sheet from bottom on phone  
- Desktop: right-side tip card 320px, same copy

### Create-mode checklist (persistent card until all ✓)
```
☐ Record   ☐ Tune   ☐ Mix   ☐ Export
```
Tap any row jumps to that tool. Completing all collapses card to “Tour complete — open Studio for advanced.”

---

## 3. Newbie one-click presets (still sound good)

Place on **Create** home (and Classic/Producer top when unlocked):

| CTA | Action | Tier |
|-----|--------|------|
| **Auto-Tune** | Apply good default InfectedTune (Natural + mild retune) | Basic+ ; **AI Auto-Tune** pack = Pro |
| **Lock to Beat** | Pocket Assist / Precision Pocket default | Basic timing nudge; **AI Beat-Lock** = Pro |
| **Smart Mix + Master** | One-button 48k/24 chain (0.3.0-style) | Basic loudness; **AI Mix/Master** = Pro |
| **Isolate Vocal** | Vocal stem / isolation | **Pro only** |
| **Export stems** | Stem ZIP / multitrack | **Pro only** |

Visual: large primary cards in a 1-col phone / 2-col tablet grid. Subtext one line (“Sounds good fast — tweak later in Studio”).

After one-click: toast + “Open advanced settings” ghost link → same underlying panel (don’t hide).

---

## 4. Advanced stays reachable

| Area | How newbies find it |
|------|---------------------|
| Precision Tune / GRIM / automation | Studio mode + More → Producer |
| Project Lab / stem board | More → Project Lab |
| Mixer buses / EQ / sidechain | Studio → Mix tab |
| Manual loop-while-rec, punch, comps | Arrange tools (unchanged) |

Panels stay visible. Lock Basic and Pro actions in the sheet. Free’s local InfectedTune and Pocket stay unlocked, with no lock icon.

---

## 5. Tiers (Free / Basic $20 / Pro $40)

Source of truth: `docs/STUDY-infectedvoices-pricing.md`.

| | **Free** | **Basic — $20** | **Pro — $40** |
|--|----------|-----------------|---------------|
| Record, arrange, Core 3, local InfectedTune, conservative Pocket, MP3, 16-bit WAV, walkthrough | ✓ | ✓ | ✓ |
| Precision Tune / Pocket, GRIM, Core 5 automation and master, 24-bit WAV, Smart Mix + Master, Project Lab, portable project | ✗ | ✓ | ✓ |
| Stems, AI mix/master, AI auto-tune, AI beat-lock, vocal isolation | ✗ | ✗ | ✓ |

Free’s local InfectedTune and Pocket cards do not get a lock icon. Smart Mix + Master stays visible and locks on Free.

### Lock sheet
Basic gates use “Unlock with Basic” and “Get Basic — $20”. Pro gates use “Unlock with Pro” and “Get Pro — $40”. Maybe later stays. Activate Basic / Activate Pro is the QA plan flip until store products are live. Cap has no Stripe button and no “Pro on web/desktop” link.

### Subscribe screen
Three cards: Free, Basic $20, Pro $40. Current plan is disabled. Free has no in-app product. Purchase buttons open the store sheet, and that sheet shows a buy button only when the catalog returns the product.

---

## 6. Screen map (Create mode)

1. **Create Home** — checklist + one-click grid + “Open full Studio”  
2. **Record** — big REC, timer, loop pill  
3. **Tune** — Auto-Tune CTA + “Advanced tune”  
4. **Mix** — Smart Mix + Master + “Open mixer”  
5. **Export** — WAV/MP3; stems locked→Pro sheet  
6. **Subscribe** — Basic/Pro cards  
7. **Studio** — existing Cap/desktop chrome (unchanged feature set)

---

## 7. Implement order

1. Create|Studio toggle + Create Home  
2. Four-step coach + checklist  
3. One-click CTAs wired to existing engines  
4. Pro lock sheets on stems / AI features  
5. Subscribe cards + entitlement helper  

Files to keep in sync: `UI-mobile-chrome.md`, `UI-mobile-merge-surfaces.md`, Studier parity/merge docs.
