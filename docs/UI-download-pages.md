# Get / download

`/get` and `/download` both serve `download/index.html`. The page does not host an ipa, an aab, or a Mac `.app`. Open web goes to `/voices`.

## Honest Windows copy

The Core source zipball is source, not the Windows installer. Do not invent a checksum.

### Before `--release`

Use this copy until InfectedVoices-Windows Releases has a real Authenticode build:

- Body: “Windows installer from Releases when available.”
- CTA: “View Windows Releases” → https://github.com/grimvirusoffical-source/InfectedVoices-Windows/releases/latest
- Do not say the build is signed.
- Do not show a SHA-256.
- Do not claim an installer file exists.

### After `--release`

Once that Releases page publishes an Authenticode-signed installer, the page may name that file and show the checksum published beside it. The hash comes from the Release asset. This doc does not store one.
