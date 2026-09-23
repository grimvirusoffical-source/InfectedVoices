# Signed private updates

Design notes for the Windows channel. This repository does not contain a private key, a public key, an update URL, or a verifier.

## What the desktop shell is allowed to do later

1. Fetch a release manifest that lists version, file names, sizes, and SHA-256 hashes.
2. Verify a detached signature with a public key installed next to the app on the release machine. The key is not committed here.
3. Show the notes and wait for an explicit install approval.
4. Replace application files only. Takes, presets, and projects stay in local storage.
5. Offer rollback to the last verified build without moving those files.

## What 0.7.0 actually does

- Browser builds do not check for updates.
- iOS and Android open the App Store or Google Play. They do not download a replacement studio.
- The Windows preload reports the channel as unprovisioned and does not contact a server.
- The in-app Updates panel describes the steps above so the flow is visible before a key exists.

Do not invent a keypair or paste a signature into the app to make the panel look live.
