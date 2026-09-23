# Platform shell histories

These four trees are the populated Infected Voices shells. Each one pins Core `main` at `2fb04c2ce1ac4e49ea9105207f436b8b6cf1d80d` (`Merge Cap PR #3: Core mobile clear bar (Stress PASS)`, Stress CLEAR BAR PASS) as a git submodule named `core`. DSP stays in that submodule.

There is no Mac shell. Mac is Open web (`/voices`) or the iOS app (Designed for iPad).

## Why this directory is on Core

Pushing branch `cursor/populate-shell-from-core-aeef` to the shell repos returned:

`Permission to grimvirusoffical-source/InfectedVoices-Web.git denied to cursor[bot].`

The Cursor GitHub app installation for this run includes only `grimvirusoffical-source/InfectedVoices`. Creating a fork of `InfectedVoices-Web` returned `Resource not accessible by integration`.

This directory is the carrier for those histories. The merge target for each history is that shell repo's `main`, after a push from an account that can write to it.

## Exact commits

| Shell | Commit | Bundle |
|---|---|---|
| InfectedVoices-Web | `d4f2606508496c13f1173fa76af5d15410857abc` | `bundles/InfectedVoices-Web.bundle` |
| InfectedVoices-Windows | `dc752dbc5172adc2bbb667115454ba20a4262b79` | `bundles/InfectedVoices-Windows.bundle` |
| InfectedVoices-Android | `6d0191f0dfa358a2a83767ddf8da466ce8835778` | `bundles/InfectedVoices-Android.bundle` |
| InfectedVoices-iOS | `7b0dc0c8277b22f6e4d0bc2299df0bc8f25e52c3` | `bundles/InfectedVoices-iOS.bundle` |

The exploded folders match those commits except the `core` gitlink, which `verify.sh` adds at the pin above. `sh platform-shells/verify.sh` rebuilds that gitlink in a temp repo and runs each shell's `npm test`.

## Push, then open the PR

From an account that can push to the shell:

```bash
git clone platform-shells/bundles/InfectedVoices-Web.bundle
cd InfectedVoices-Web
git remote add origin https://github.com/grimvirusoffical-source/InfectedVoices-Web.git
git push -u origin cursor/populate-shell-from-core-aeef
gh pr create --repo grimvirusoffical-source/InfectedVoices-Web \
  --base main --head cursor/populate-shell-from-core-aeef \
  --title "Host /voices and /get from pinned Core" \
  --body-file - <<'EOF'
Pins Core main at 2fb04c2 (Cap PR #3, Stress CLEAR BAR PASS) as a submodule.

/voices is the open web host. /get and /download serve Core's download page (store-only mobile). No raw ipa or aab, no Mac .app, no Windows Release, no EAS upload.
EOF
```

Repeat with the Windows, Android, and iOS bundles. Titles:

- Windows: `Add a WebView2 packaging hook pinned to Core`
- Android: `Pin Core for the Capacitor Android shell`
- iOS: `Pin Core for the Capacitor iOS shell`

Windows `release/SHA256SUMS.txt` stays `UNPROVISIONED`. Android and iOS scripts exit 2 on submit, upload, and EAS. iOS also exits 2 for a Mac, Catalyst, or macOS target.

## Shared vs shell-specific

Shared, only inside the Core submodule: vendor DSP (`0.6.6-core6.1`, SHA-256 `e6288c29a180d8d6048fcc9117a6f6a50e7d3225920aadeb2fe48288adaf8967`), Free / Basic / Pro, and the one-time 7-day trials (`basicTrialUsedAt`, `proTrialUsedAt`).

- Web owns the static host for `/voices`, `/get`, and `/download`.
- Windows owns the WebView2 packaging hook. Electron and Tauri are recorded as not implemented.
- Android and iOS own the prepare scripts. The Capacitor projects stay in Core (`android/`, `ios/`) so the Cap shell is not copied a second time.

`STUDY-infectedvoices-repo-split.md` and a platform-artifacts doc are not in Core at this pin. The shells follow `docs/PARITY-CHECKLIST.md`, `docs/STUDY-infectedvoices-parity.md`, `docs/STUDY-infectedvoices-merge-gaps.md`, `download/index.html`, and the scaffold READMEs.
