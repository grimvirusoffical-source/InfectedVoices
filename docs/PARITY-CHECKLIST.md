# Cap parity checklist

Cap `webDir` is `dist/` from `npm run build:web`. It embeds the pinned Core 5 arrangement payload and Vocal Lab 0.7.0 from the RedX browser line (`cursor/eas-browser-studio-5693`). Ultimate is not a separate source of truth; its vocal functions that shipped in Studio 0.7.0 are the Vocal Lab page.

## In the Capacitor app

| Function | Where |
|---|---|
| Vocal Lab home (v0.4.1 surface on Studio 0.7.0) | `dist/index.html` — bar/beat loop, Pocket Assist ±80 ms, Ultimate Mic Master, Grim Beats, local RoEx key field, WAV/MP3 |
| Native share + 256 MB cap | `vocal-bridge.js` → `ivShell.saveFile` |
| Arrangement Studio | `studio.html` — multitrack, record, comp/punch, InfectedTune, Pocket, mixer, GRIM, mastering, journal |
| Classic Studio + MP3 | `lab/index.html` |
| Create \| Studio, coach, one-click Basic actions | Arrangement and Classic chrome |
| Pro gates (stems, AI mix/master, AI tune, AI beat-lock, vocal isolation) | Lock sheet. Menus stay |
| House zinc/indigo, 44px targets | `mobile.css` and Vocal Lab controls |
| HTTPS host switch, store updates | Settings and Updates sheets. Health check is RedXAIHost `/api/health` with `service === InfectedVoices` |
| InfectedNation handoff | `https://nation.infectedvoices.space`. Apple, Google, Android/passkey, and email signup and login |
| Studio Plus store billing | Store sheet. Product `infectedvoices.studio.monthly` (Android base plan `monthly`) via `@capgo/native-purchases`, verified at `/api/v1/billing/mobile/verify` |
| Browser RedX helpers | `browser-src/redx-api.js` (Bearer session, email login/signup, TOTP) and `browser-src/auth-choices.js` on the browser host only |
| Plugins, Release & connect, AI tools, tutorial | More sheet search |

## Windows / browser / RedX → Cap

| Source function | Cap |
|---|---|
| Core 5 arrangement, mixer, GRIM, precision, classic lab | Same pinned vendor payload in `dist/` |
| Vocal Lab 0.7.0 | Cap home. Package version stays 0.7.0; native shell line is `0.6.6-mobile.2` |
| InfectedNation connect with flow and method | Cap `signIn({flow, method})` opens Nation. Browser auth grid sets `iv-auth-request` and uses `redx-api.js` |
| RedXAIHost Studio Bearer API | `ivShell.request` sends `Authorization: Bearer` to the configured HTTPS Studio origin. `desktop-session.js` still wraps the JSON as `{data}` |
| Apple IAP / Play Billing Studio Plus | Store sheet. No Stripe button on iOS or Android |
| Browser Stripe checkout | Browser build only (`build-browser.mjs` account rewrites). Not copied into the Cap bundle |
| 256 MB native share, store listing updates, deep links `infectedvoices://auth\|collab` | Kept from the RedX shell |

## Intentional platform gaps

- Export files above 256 MB are rejected. Split stems or shorten the render.
- Updates come from the App Store or Play Store. There is no web updater and no Windows self-updater in Cap.
- Core 6 collaboration is not bootstrapped. The old collaboration-pilot launch page is not the Cap home.
- Stripe is not used inside the iOS or Android apps. If the store product is unavailable, the sheet says so and offers Pro on web/desktop. Browser checkout stays in the browser build.
- There is no separate Basic in-app product in the RedX sources. Basic stays on web/desktop. Pro on iOS and Android opens Studio Plus.
- Arbitrary JS/WASM plugins are rejected. Preset JSON plugins stay.
- A member’s RoEx key stays on device. This build does not upload audio or spend RoEx credits.
