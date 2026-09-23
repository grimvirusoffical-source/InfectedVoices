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

### First-run coach (4 steps, dismissible)
Overlay or coach marks — not a separate app.

| Step | Title | Spotlight | Primary CTA | Skip |
|------|-------|-----------|-------------|------|
| 1 | Record | REC + mic permission | **Record a take** | Skip tour |
| 2 | Tune | InfectedTune / Precision | **Auto-tune take** | |
| 3 | Mix | Smart Mix + Master | **One-click mix** | |
| 4 | Export | Export / Share | **Export WAV** | Done |

- Progress dots 1–4; Back / Next; “Don’t show again” on last step  
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

Never remove menu entries for Basic tier — **lock** Pro-only actions with sheet (below).

---

## 5. Tiers ($20 Basic vs $40 Pro)

| | **Basic — $20** | **Pro — $40** |
|--|-----------------|---------------|
| Core studio (record, arrange, classic FX) | ✓ | ✓ |
| One-click Auto-Tune / Pocket / Smart Mix (standard) | ✓ | ✓ |
| Export master WAV / MP3 | ✓ | ✓ |
| **Export stems** | ✗ | ✓ |
| **AI Mix / Master** | ✗ | ✓ |
| **AI Auto-Tune** | ✗ | ✓ |
| **AI Beat-Lock** | ✗ | ✓ |
| **Vocal isolation** | ✗ | ✓ |

*(Wire exact entitlements to product IDs; UI labels match this table.)*

### Lock sheet (house pattern — same as Nation)
```
Title: Unlock with Pro
Body: one sentence why (e.g. “Stem export is on Pro.”)
Checklist of Pro perks
[ Subscribe — $40 ] primary
[ Continue with Basic ] ghost
```
No password fields. Web/desktop: Stripe Checkout. Cap store builds: **StoreKit / Play Billing only** (no Stripe CTA in Cap — review). If IAP not ready, show “Pro on web/desktop” meta + link; don’t fake paywall.

### Subscribe screen
Two cards side-by-side (≥640) / stack mobile:
- Basic elevated lightly, Pro with accent border when featured
- Current plan disabled CTA “Current plan”
- Manage → portal / store subscription management

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
