# Shared vs this shell

| Shared from Core | Android shell |
|---|---|
| `vendor/` DSP and the pinned SHA-256 | Not copied |
| Free, Basic, Pro, and both 7-day trials | Not reimplemented |
| `android/` Capacitor project | Stays at `core/android` |
| `eas.json`, upload keystore, Play service account | Stay in Core or in uncommitted `.secrets/`. Not copied |
| `npm run native:android` | Invoked by `npm run sync` |
| Play upload / EAS submit | Refused (`--submit`, `--upload`, `--eas`, `--release`) |
