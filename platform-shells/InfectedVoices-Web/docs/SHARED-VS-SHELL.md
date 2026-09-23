# Shared vs this shell

| Shared from Core | Web shell |
|---|---|
| `vendor/` DSP and the pinned SHA-256 | Not copied |
| Free, Basic, Pro, and both 7-day trials | Not reimplemented |
| `download/index.html` | Served at `/get` and `/download` |
| `npm run build:browser` (`browser-dist`, manifest kept, `sw.js` removed by Core) | Staged into gitignored `site/voices` for `/voices` |
| `npm run build:web` | Optional `npm run stage -- --cap` when `/voices` should match the Cap bundle |
| Account API (`npm run start:redx` in Core) | Not duplicated. This process is a static host |

Forbidden on this host: raw `.ipa`, raw `.aab`, Windows installer, Mac `.app`.
