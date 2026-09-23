# Studier Intel — Infected Voices studio pricing (FREE / BASIC / PRO)

**Date:** 2026-09-23 (updated: Free tier)  
**Audience:** @Proframmer, @Ui Designer, @Stress Tester  
**Scope:** Infected Voices studio only (Cap / Windows / browser). **Not** InfectedNation social tiers.  
**Prices (Joshua):** FREE · BASIC **$20/mo** · PRO **$40/mo**

## Product framing

| Tier | Price | Promise |
|------|-------|---------|
| **FREE** | $0 | **Most** of the local studio: record, arrange, local tune/pocket, Core 3 mix FX, walkthrough + one-click newbie paths, MP3 / 16-bit WAV export. Enough to finish real songs — not a toy demo. |
| **BASIC** | $20/mo | **Full** local pro studio: Precision Tune/Pocket, GRIM, Core 5 automation/sidechain, Core 5 LUFS/true-peak master, 24-bit WAV, Smart Mix+Master (local), Project Lab surfaces |
| **PRO** | $40/mo | Everything in BASIC **plus** stems + AI mix/master + AI auto-tune + AI quality-preserving on-beat + vocal isolation |

UX (all tiers that can open Studio): professional chrome; one-click newbie paths; advanced panels visible (locks only where gated); process walkthrough.

---

## Feature → tier matrix

Legend: ✓ included · ✗ gated (upsell) · — desktop-only

### Local studio (most on Free)

| Feature | FREE | BASIC | PRO | Gate key (if locked) |
|---------|------|-------|-----|----------------------|
| Account / identity | ✓ | ✓ | ✓ | |
| Arrangement + tracks/clips/transport | ✓ | ✓ | ✓ | |
| Mic record, journal, recovery, punch/comp | ✓ | ✓ | ✓ | |
| Import beat / audio | ✓ | ✓ | ✓ | |
| Loop / practice takes | ✓ | ✓ | ✓ | |
| Walkthrough + one-click “sound good” | ✓ | ✓ | ✓ | |
| Local InfectedTune (Legacy + Infected) | ✓ | ✓ | ✓ | |
| Local Pocket (conservative / Rap-on-beat preview→Keep) | ✓ | ✓ | ✓ | |
| Core 3 mixer / EQ / comp / shared FX | ✓ | ✓ | ✓ | |
| Classic Studio local path | ✓ | ✓ | ✓ | |
| Export **MP3** mix | ✓ | ✓ | ✓ | |
| Export **16-bit** master WAV | ✓ | ✓ | ✓ | |
| Save project on device | ✓ | ✓ | ✓ | |
| **Precision Tune** (full manual / advanced) | ✗ | ✓ | ✓ | `precision_tune` |
| **Precision Pocket** (warp anchors / advanced) | ✗ | ✓ | ✓ | `precision_pocket` |
| **GRIM** character rack | ✗ | ✓ | ✓ | `grim_rack` |
| Core 5 automation / sidechain | ✗ | ✓ | ✓ | `core5_automation` |
| Core 5 **local** LUFS / true-peak mastering | ✗ | ✓ | ✓ | `core5_master` |
| Export **24-bit** master WAV | ✗ | ✓ | ✓ | `wav24` |
| Smart Mix + Master (local one-click) | ✗ | ✓ | ✓ | `smart_mix_local` |
| Project Lab stem board (local) | ✗ | ✓ | ✓ | `project_lab` |
| Portable `.ivproject` backup export | ✗ | ✓ | ✓ | `portable_project` |
| FL Studio CLAP / Windows updater | — | — | — | desktop-only |

### PRO-only (unchanged)

| Feature | FREE | BASIC | PRO | Gate key |
|---------|------|-------|-----|----------|
| Aligned **stem** export (ZIP / per-track) | ✗ | ✗ | ✓ | `stems` |
| **AI mix / mastering** (RoEx) | ✗ | ✗ | ✓ | `ai_mix_master` |
| **AI auto-tune** | ✗ | ✗ | ✓ | `ai_autotune` |
| **AI put-vocals-on-beat** (quality-preserving) | ✗ | ✗ | ✓ | `ai_pocket` |
| **Remove music from vocals** (isolation) | ✗ | ✗ | ✓ | `vocal_isolation` |

Upsell copy: Free→Basic for “full local pro tools”; Basic→Pro for “AI + stems + isolation”. Never put lock icons on Free’s included local InfectedTune / Pocket.

---

## Entitlement model (code)

```ts
type StudioPlan = 'free' | 'basic' | 'pro'

type StudioEntitlement =
  | 'precision_tune' | 'precision_pocket' | 'grim_rack'
  | 'core5_automation' | 'core5_master' | 'wav24'
  | 'smart_mix_local' | 'project_lab' | 'portable_project'
  | 'stems' | 'ai_mix_master' | 'ai_autotune' | 'ai_pocket' | 'vocal_isolation'

const BASIC_PLUS: StudioEntitlement[] = [
  'precision_tune', 'precision_pocket', 'grim_rack',
  'core5_automation', 'core5_master', 'wav24',
  'smart_mix_local', 'project_lab', 'portable_project',
]

const PRO_ONLY: StudioEntitlement[] = [
  'stems', 'ai_mix_master', 'ai_autotune', 'ai_pocket', 'vocal_isolation',
]

function can(plan: StudioPlan, e: StudioEntitlement) {
  if (plan === 'pro') return true
  if (plan === 'basic') return !PRO_ONLY.includes(e)
  // free
  return !BASIC_PLUS.includes(e) && !PRO_ONLY.includes(e)
}
```

Default signed-in plan: **`free`** (not `none`). Server remains source of truth.

---

## Cap IAP / Stripe placeholders

| Product | Placeholder ID | Price |
|---------|----------------|-------|
| BASIC monthly iOS | `space.infectedvoices.studio.basic.monthly` | $20 |
| PRO monthly iOS | `space.infectedvoices.studio.pro.monthly` | $40 |
| BASIC Android | `iv_studio_basic` | $20 |
| PRO Android | `iv_studio_pro` | $40 |
| Stripe BASIC | `IV_STRIPE_PRICE_BASIC` | $20 |
| Stripe PRO | `IV_STRIPE_PRICE_PRO` | $40 |

No IAP for Free. Cap: StoreKit/Play only (no Stripe CTA). Web/Windows: Stripe.

---

## Trial / demo

Free **is** the ongoing free tier — no need for a crippled demo mode. Optional: 7-day PRO trial once per store account later. Until IAP live, everyone on Free + in-app “Activate Basic/Pro” demo flip for QA (same `plan` field).

## Stress checks

1. Free: local InfectedTune + Pocket work; Precision/GRIM/Core5 master/24-bit/stems/AI → lock → Basic or Pro sheet  
2. Basic: all local pro tools; AI/stems/isolation still locked  
3. Pro: all five Pro paths work  
4. Nation social plan never sets studio `pro` by accident  

## Related

- `STUDY-infectedvoices-parity.md`, `STUDY-infectedvoices-merge-gaps.md`  
- Ui: `UI-guided-and-tiers.md`
