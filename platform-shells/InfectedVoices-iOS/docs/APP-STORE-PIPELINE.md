# App Store pipeline

This repo is the iOS shell for iPhone and iPad. The store upload is a later step, and it is not run by the populate commit.

When a real upload happens, do it from the pinned Core checkout:

- follow `core/UPLOAD-APPLE.md`
- follow `core/STORE-READINESS.md` and `core/APP-REVIEW-NOTES.md`
- bundle id `space.infectedvoices.studio`
- keep the iPad target (Designed for iPad / `supportsTablet`)
- do not add a macOS or Mac Catalyst target
- do not attach an `.ipa` to the marketing CDN or to `/get`

`/get` stays store-only: an App Store link, not a raw package.

`npm run sync` stops after `npm run native:ios` inside Core. `--mac`, `--catalyst`, `--macos`, `--submit`, `--upload`, and `--eas` are refused.
