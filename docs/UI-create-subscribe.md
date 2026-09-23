# Create + Subscribe chrome (Vocal Lab / Cap / web)

**For:** @Proframmer · pairs with `PLAN-vocal-lab-features.md` + `UI-guided-and-tiers.md`  
**Look:** house zinc/indigo · professional AF, not toy demo

---

## Header (all modes)
```
[ Infected Voices ]  [ Create | Studio ]     [ plan chip ] [ Toxins? n/a ] [ Account ]
```
- Plan chip: Free · Basic · Pro · Basic trial · Xd · Pro trial · Xd  
- Create|Studio: segmented control, persist per account

---

## Create Home
1. **Checklist card** — Prepare · Record · Tune · Mix · Master · Export (tap jumps). Collapse when all ✓.  
2. **One-click grid** (2-col ≥640 / 1-col phone):
   - Auto-Tune (local) · Lock to Beat (local) · Smart Mix + Master (Basic+)  
   - AI Auto-Tune · AI Beat-Lock · AI Mix + Master · Isolate · Export stems → Pro locks  
3. Each card: title, one-line promise, primary CTA, ghost “Open advanced”  
4. After one-click: Undo toast + link to advanced panel  
5. Footer CTA: **Open full Studio**

---

## 8-step coach (Prepare → Export)
Bottom sheet / tip rail — producer language:

| # | Stage | Spotlight | Primary |
|---|-------|-----------|---------|
| 1 | Prepare | New song / import beat | Set up session |
| 2 | Record | REC | Record a take |
| 3 | Comp | Takes / punch | Keep best take |
| 4 | Tune | Auto-Tune CTA | Auto-tune take |
| 5 | Pocket | Lock to Beat | Lock timing |
| 6 | Mix | Smart Mix | One-click mix |
| 7 | Master | LUFS / Smart Mix+Master | Master loudness |
| 8 | Export | Export dialog | Export WAV |

Dots + Back/Next + Don’t show again. Resume: More → Guided tour.

---

## Subscribe (3 cards)
Stack phone / 3-col desktop:

| Free | Basic $20/mo | Pro $40/mo |
|------|--------------|------------|
| Included forever | Full local pro tools | AI + stems + isolation |
| Current / no pay | Subscribe · **7-day trial** | Subscribe · **7-day trial** (accent) |

- Trial CTA only if unused + store-eligible  
- Current plan: disabled “Current plan”  
- Cap: IAP only. Web: Stripe. No Stripe buttons in Cap.

### Lock sheet ladder
Free hits Basic gate → “Unlock Basic” + trial  
Anyone hits Pro gate → “Unlock Pro” + trial  
Copy: “{feature} needs {Basic|Pro}.” Never lock Free’s local InfectedTune / conservative Pocket.

---

## Preview → Keep
Whenever pitch/time/AI runs: sticky bar **Preview | Keep | Undo** above tab bar / transport. Keep is primary.

## Meters
Honest peak + LUFS + true-peak readouts near master — tabular-nums, faint labels, no fake green.

Ship with Cap PR #3: Create|Studio, Create Home, coach, 3-card Subscribe + trials, lock sheets. Rest follows PLAN ship order.
