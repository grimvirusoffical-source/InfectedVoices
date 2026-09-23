# Infected Voices — mobile chrome (Capacitor / Core 5)

**For:** @Proframmer · repo `grimvirusoffical-source/InfectedVoices`  
**Rule:** Same features as Windows + browser (see `MOBILE-FEATURE-MAP.md`). Layout/type/touch change only — **not** a second product look.  
**Tokens:** House system (`/workspace/ui-system/`) zinc + indigo. Dark-first for studio.

Apply in `mobile-src/mobile.css` (+ Cap web view). Replace ad-hoc `#101014` / `#0c0b10` / `#ffffff18` with tokens below.

---

## 1. Tokens (dark studio)

```css
:root {
  --bg: #09090B;
  --surface: #111113;
  --elev: #18181B;
  --elev-2: #1C1C1F;
  --border: #27272A;
  --border-strong: #3F3F46;
  --text: #FAFAFA;
  --muted: #A1A1AA;
  --faint: #71717A;
  --accent: #6E79D6;
  --accent-hover: #828FFF;
  --accent-muted: color-mix(in srgb, var(--accent) 16%, transparent);
  --danger: #EF4444;
  --on-accent: #FFF;
  --radius: 10px;
  --radius-lg: 14px;
  --font: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --touch: 44px; /* Apple HIG minimum */
  --iv-safe-top: env(safe-area-inset-top, 0px);
  --iv-safe-right: env(safe-area-inset-right, 0px);
  --iv-safe-bottom: env(safe-area-inset-bottom, 0px);
  --iv-safe-left: env(safe-area-inset-left, 0px);
}
```
`capacitor.config.json` `backgroundColor` → `#09090B` (match `--bg`).

Type: body 14–16px (inputs **16px** to kill iOS zoom). Labels 11–12 / 600 / tracking 0.04em. Titles 18–22 / 700 / -0.03em. Tabular-nums on clocks/timers.

---

## 2. Touch rules (hard)

| Control | Min size | Notes |
|---------|----------|--------|
| Buttons, tab items, icon hits | 44×44 CSS px | `min-height/min-width: var(--touch)` |
| Transport Play/Rec/Stop | ≥52×44 | Rec uses danger fill when armed |
| Faders / knobs hit area | 44px wide invisible hit | Visual can be thinner |
| Range inputs | height 44 | thumb ≥24 |
| List rows | min-height 48 | |

- `touch-action: manipulation`; `-webkit-tap-highlight-color: transparent`
- No hover-only actions — every control works with tap
- Prefer bottom sheets over tiny desktop popovers on ≤900px
- Keep `font-size: 16px` on inputs/selects/textareas

---

## 3. Phone layout (≤900px) — keep Cap structure

Existing shell is right; restyle only:

### Sticky stack (top → bottom)
1. **App header** — blur surface, hairline `--border`, safe-top padding. Brand “Infected Voices” 14–15/700. Account actions wrap; hide Tutorial on phone.
2. **Project bar** — single column; file actions horizontal scroll chips
3. **Transport** — sticky; Play/Stop/Rec row full width; clock left-aligned under; meters full bleed
4. **Workspace** — column: Arrangement → Library → Inspector (order already in `mobile.css`)
5. **Bottom tab bar** (fixed) — 5 tabs, safe-bottom padding, surface + border-top

### Tab bar labels (suggested)
Arrange · Tracks · Mix · Tune · More  
(Map to existing Core 5 panels — don’t invent new features.)

### Horizontal scroll strips
Engine bar, steps, arrangement tools, collab bar, mixer channels (`min-width: 210px` channels OK) — keep; style chips with `--surface` / active `--accent-muted`.

### Dialogs
`width: calc(100vw - 8px)`, `border-radius: 14px`, max-height `100dvh - safe insets - 14px`, sticky dialog header on `--elev`.

### Login wall
Single column; art strip ≤180px or hide in short landscape; h1 clamp 42–68px; primary CTA full width 48px.

---

## 4. Tablet / landscape

- **iPad / ≥901px width:** restore 2–3 column workspace (Arrangement + Inspector); tab bar optional hide if desktop nav fits
- **Short landscape (max-height 560):** relative (not sticky) header/transport; hide login art — already in CSS

---

## 5. Component recipes (mobile)

| Piece | Spec |
|-------|------|
| Primary button | accent fill, radius 8–10, h 44–48, weight 600 |
| Secondary | surface + border |
| Destructive | danger text or danger fill only for Rec/Delete confirm |
| Chips / steps | pill or 8px radius; active = accent-muted + accent text |
| Cards / panels | surface, 1px border, radius 10–12 — **no neon glass stacks** |
| Tab bar active | accent-muted fill + 2px accent top bar on button |
| Scrim | `rgba(9,9,11,.55)` |
| Toast | elev + border, above tab bar |

---

## 6. Same-functionality checklist (UI must expose)

Do not hide behind “desktop only”:
- Multitrack record + punch/comp
- InfectedTune / Precision Tune / Pocket
- Mixer buses / EQ / compression / GRIM rack
- Automation / sidechain (Core 5)
- Mastering LUFS / true-peak
- Export WAV / stems / ZIP / Classic MP3 (native share sheet)
- Account + HTTPS host switching in Mobile Settings
- Recording journal / recovery

If a panel is dense, use **More → sheet** with search, never drop the feature.

---

## 7. InfectedNation mobile shell (later)

If Nation ships Cap later: **same tokens**. Bottom tabs HOT · Studio · Battles · Crews · Profile. Studio tab = handoff into Voices webview (`/voices/` or in-app browser) — see `infected-nation/docs/UI-studio-handoff.md`. No second palette.

---

## 8. Implement order

1. Swap Cap `backgroundColor` + `:root` to house tokens in `mobile-src/mobile.css`
2. Restyle `.mobile-tabbar`, `.app-header`, `.transport`, dialogs to token borders/surfaces
3. Enforce `--touch` on all interactive controls
4. Verify feature map screens still reachable on a 390×844 viewport
5. Screenshot phone + tablet for Stress Tester

**Don’t:** purple wash backgrounds, white 18% borders, neon accents, or a separate “mobile brand.”
