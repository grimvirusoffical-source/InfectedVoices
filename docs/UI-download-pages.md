# Infected Voices — Get / Download pages

**For:** @Proframmer  
**Routes (suggest):** `/get` (hub) · `/get/windows` · `/get/ios` · `/get/android` · `/get/web` (or `/studio` open-in-browser)  
**Look:** Same house tokens as `UI-create-subscribe.md` / `UI-mobile-chrome.md` — zinc + indigo, Inter, dark-first. Professional AF, not steam-sale spam.

Cap PR #3 = Create+Subscribe inside the app. These pages are the **browser marketing / install** chrome — ship in same PR or immediate follow-up.

---

## Tokens (reuse)
```css
--bg #09090B; --surface #111113; --elev #18181B; --border #27272A;
--text #FAFAFA; --muted #A1A1AA; --faint #71717A;
--accent #6E79D6; --accent-hover #828FFF; --danger #EF4444;
--radius 10px; --radius-lg 16px; --font Inter, system-ui, sans-serif;
```

---

## 1. Hub `/get`

**Layout (max 960px centered):**
```
[ wordmark Infected Voices ]
[ h1: Make vocals that sound finished ]
[ lede: Record, tune, mix, and export — Create mode for one-click, Studio for full producer control ]

[ 2×2 card grid ≥640 / 1-col phone ]
  Windows desktop
  iPhone / iPad
  Android
  Open in browser

[ Free forever · Basic $20 · Pro $40 ] muted plan strip → link /subscribe or in-app
[ Footer: Privacy · Support · InfectedNation ]
```

### Platform card recipe
```
elev card · border · radius-lg · padding 24
  Platform label (11px uppercase faint)
  Title (18/700)
  One-line benefit
  Primary CTA (44px)
  Ghost secondary (optional)
```

| Card | Primary CTA | Secondary |
|------|-------------|-----------|
| **Windows** | Download for Windows | System requirements |
| **iOS** | View on the App Store | TestFlight (if used) |
| **Android** | Get on Google Play | APK note only if sideload allowed — prefer Play |
| **Open web** | Launch studio | Works on Chrome / Edge / Safari |

Detect UA lightly: sticky “Recommended” badge on the matching card (accent-muted). Never hide other platforms.

**Mac:** no Mac `.app` card and no `native:mac` target. A Mac user-agent highlights **Open web**, and that card launches `/voices/`. Windows, iOS, and Android cards stay as listed above. Do not publish store builds or `InfectedVoices-Windows` Releases until Stress clears this PR.

---

## 2. Windows `/get/windows`

```
Hero: Download Infected Voices for Windows
Meta: Win 10/11 x64 · mic required · ~XX MB
[ Download .exe ] primary
[ Download portable ZIP ] ghost (if offered)

What’s included — checklist (local tune, Create one-clicks, Studio, Free/Basic/Pro)
Requirements — short bullet list
After install — “Sign in with InfectedNation → pick Create or Studio”
```

No fake “100% virus free” badges. Optional checksums in faint mono under CTA.

---

## 3. iOS `/get/ios`

```
Hero: Infected Voices on iPhone & iPad
[ View on the App Store ] → App Store URL
Meta: Same Core 5 studio as desktop · mic permission · Store updates only
Screenshots row (3–5 device frames) — dark UI, Create home + Studio
Note: Pro / Basic via Apple IAP (no Stripe on Cap)
```

---

## 4. Android `/get/android`

```
Hero: Infected Voices on Android
[ Get on Google Play ]
Same meta + screenshot row
Note: Play Billing for Basic/Pro; 256 MB export safety cap called out faintly
```

---

## 5. Open web `/get/web` → `/voices/` or studio host

```
Hero: Run Infected Voices in your browser
[ Launch studio ] primary → /voices/
[ Create free account ] ghost → identity
Meta: Chrome / Edge / Safari · headphones recommended · full Create + Studio
Plan chips Free / Basic / Pro → Stripe on web
```

If `/voices/` is down: honest empty “Studio temporarily offline” + retry — no fake launcher.

---

## 6. Shared chrome

- Top nav: Get · Features · Pricing · Sign in · Launch  
- Pricing blurb matches Studier matrix (Free floor · Basic $20 · Pro $40 · trials)  
- No password fields, no Discord-style credential harvest  
- Mobile: sticky bottom “Launch studio” or “Download” matching detected platform  
- Accessibility: real headings, contrast on muted text, focus rings accent

---

## 7. Implement order

1. Hub `/get` with four cards  
2. Deep links Windows / iOS / Android / Web  
3. Wire real store + exe URLs from env  
4. Screenshot assets (later) — placeholders OK for PR follow-up  

Keep Cap in-app Create+Subscribe per `UI-create-subscribe.md` — download pages don’t replace it.
