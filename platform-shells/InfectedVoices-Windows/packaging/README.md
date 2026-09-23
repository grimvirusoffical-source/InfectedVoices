# Windows packaging hook

Selected host: WebView2, recorded in `host.json`.

1. `sh scripts/init-core.sh` checks out the pinned Core commit.
2. `npm run stage` runs Core `npm run build:web` and copies `dist/` to gitignored `payload/app`.
3. A later WebView2 host should load `payload/app` (or `core/dist`) as the web view. That host is not in this commit.
4. A later Authenticode sign happens on a release machine. No certificate is stored here.
5. A later real Release replaces `release/SHA256SUMS.txt` with the installer's SHA-256 and publishes that hash beside the file on `/get`.

Electron and Tauri are listed in `host.json` as `alternatesNotImplemented`. Do not add their trees in this repo unless Core's packaging choice changes.

`scripts/package-windows.ps1` runs the check. `-BuildPayload` runs step 2. Passing `release` or `sign` stops before any signing tool.
