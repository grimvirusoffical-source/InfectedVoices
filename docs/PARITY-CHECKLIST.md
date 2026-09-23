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
| HTTPS host switch, store updates | Settings and Updates sheets |
| Plugins, Release & connect, AI tools, tutorial | More sheet search |

## Intentional platform gaps

- Export files above 256 MB are rejected. Split stems or shorten the render.
- Updates come from the App Store or Play Store. There is no web updater and no Windows self-updater in Cap.
- Core 6 collaboration is not bootstrapped. The old collaboration-pilot launch page is not the Cap home.
- iOS and Android do not show a Stripe purchase button until StoreKit / Play Billing is wired. Web/desktop can open the account portal.
- Arbitrary JS/WASM plugins are rejected. Preset JSON plugins stay.
- A member’s RoEx key stays on device. This build does not upload audio or spend RoEx credits.
