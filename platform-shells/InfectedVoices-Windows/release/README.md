# Windows release slot

Empty on purpose.

`SHA256SUMS.txt` says `UNPROVISIONED` because this repo does not contain a signed installer. Do not paste a hash of the GitHub source zipball here. That zipball is source, not the Windows app.

When a real Release exists:

- the installer file is the signed artifact
- `SHA256SUMS.txt` contains one line: `<sha256>  <file name>`
- `/get` links that file and shows the same hash
- this directory still does not contain an `.ipa` or `.aab`
