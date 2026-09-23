# Shared vs this shell

| Shared from Core | Windows shell |
|---|---|
| `vendor/` DSP and the pinned SHA-256 | Not copied |
| Free, Basic, Pro, and both 7-day trials | Not reimplemented |
| `npm run build:web` → `dist/` | Staged into gitignored `payload/app` when requested |
| Signed updater design (`docs/signed-private-updates.md`) | Not implemented. No key is committed |
| Authenticode, installer, real SHA-256, GitHub Release | Placeholder only. Scripts refuse `--release` and `--sign` |

WebView2 is the selected host. Electron and Tauri are not implemented, so this repo does not grow three desktop trees.
