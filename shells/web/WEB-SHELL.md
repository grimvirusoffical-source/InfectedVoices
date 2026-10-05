# Infected Voices — Web shell

The Web shell is the RedXAIHost browser deploy of the studio, pinned to Core **`4d280e8`** (`4d280e871dc31916549ba317032300510403a8b2`, the PR #8 merge on `main`).

It does not fork `StudioApp`. It wraps the existing build:

```
node shells/web/check-core-pin.mjs   # Core pin gate
npm --prefix shells/web test         # parity tests against Core modules
npm --prefix shells/web run build    # pin gate -> npm run build:browser -> stamp -> verify
```

`npm run build:browser` already runs `scripts/build-web.mjs` (the `build:web` payload) and the studio `build:host` (assemble `StudioApp.tsx` → `tsc -b` → `vite build`). The output is `browser-dist/`, which is what `npm run start:redx` serves (see `docs/REDX-HOST.md`). The shell build also writes `browser-dist/core-pin.json`.

## Pin

- `shells/web/core-pin.json` is the pin.
- `check-core-pin.mjs` fails the build if the pinned commit is missing, isn't an ancestor of HEAD, or if **any** file outside `shells/web/` and `.github/workflows/web-shell.yml` differs from the pin. A Core change needs a deliberate re-pin.
- `WEB_SHELL_ALLOW_UNPINNED=1` turns the failure into a warning and stamps `"pinned": false`. This is for local experiments only. CI never sets it.

## CI

`.github/workflows/web-shell.yml` runs on Node 22 with `fetch-depth: 0`. It runs the pin gate, the Core unit tests, the shell parity tests, and the shell build with bundle verification, then uploads `browser-dist/` as an artifact.

## Parity checklist (Casey's bar)

| Item | Status | How |
|---|---|---|
| Core pinned to `4d280e8` | **Automated** | `check-core-pin.mjs` (no drift outside shell paths), `browser-dist/core-pin.json` stamp checked by `verify-web-shell.mjs` |
| Free / Basic $20 / Pro $40 locks | **Automated** (logic + bundle) / **Manual** (rendered UI) | `parity.test.ts` asserts the lock matrix through Core `gates.ts`. The bundle must contain `Basic $20`, `Pro $40`, `feature-lock`, `feature-lock-`, `upgrade-cta` and `subscribe-panel` |
| Trial CTAs | **Automated** (logic + bundle) / **Manual** (click-through) | `trial-cta-basic` and `trial-cta-pro` are in the bundle. The test covers once-per-account eligibility |
| Export bit depth | **Automated** (logic + bundle) / **Manual** (exported file header) | `export-bit-depth` testid. Labels are `16-bit · locked`, `24-bit / 48kHz`, `16-bit WAV` and `48 kHz · 24-bit WAV` |
| Offline expiry → Free | **Automated** (logic) / **Manual** (browser focus after more than 15 min offline) | `readCachedEntitlements` stale cache → Free/16-bit. The bundle keeps the `focus` refresh path |
| GRIM chain | Bundle marker / **Manual** audio check | `Tone (GRIM)`, `Grim abyss`, and offline autotune sharing GRIM settings |
| Mic Master (`ultimateMicMaster`) | Bundle marker / **Manual** render | `Ultimate Mic Master`, `Quick Mic Master` |
| Loop save | Bundle marker / **Manual** | `Apply loop points`, save-the-pass flow (`saveProject` with loop range) |
| Metronome excluded from export | Bundle marker / **Manual** listen to bounce | `metronome stays cue-only`, `cue metronome stays out of the bounce` |
| Realtime + offline auto-tune | Bundle marker / **Manual** | `Offline autotune`, `ai_autotune` |
| No feature cut vs web | **Automated** | The shell *is* the browser build at the pin. No Core file may differ, so nothing can be removed |

"Bundle marker" means the built `assets/index-*.js` contains the feature's user-facing strings. That proves the feature shipped in the bundle, not that its audio output is correct. Casey and Morgan own the manual audio and UI checks.

## Known platform notes

- `build-browser.mjs` deletes `sw.js` at the pin, so the web shell has `manifest.webmanifest` but **no service worker**. Offline means the entitlement TTL fallback, not offline asset caching. Adding a service worker would be a Core change and is out of scope.
- Browser Stripe checkout stays in the browser build. Cloud AI routes stay real `503 provider_not_configured`.
