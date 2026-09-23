# Changelog

## 0.7.0 browser host

- `npm run build:browser` now serves Studio 0.7.0 from `browser-dist/` on the RedX path. Arrangement Studio, the classic lab, and the existing account adapter stay in that folder.
- Vocal Lab v0.4.1 surface: layout modes (Auto / iOS / Android / PC), one-bar loop, recording compensation, A–B song map with a check-by-ear key estimate, Ultimate Mic Master loudness / headroom / ducking / width / tone, Grim Beats as local preparation, and a device-only RoEx key field that does not upload audio.
- Windows channel links the published GitHub release: tag `Release`, name `v0.4.0`, branch `native/v040-unified-studio`, source zipball `https://github.com/grimvirusoffical-source/InfectedVoices/zipball/Release`. Vocal Lab v0.4.1 stays the in-host channel. No v0.4.1 release and no installer asset are invented.
- RedXAIHost `install_command` is `npm install --include=dev --ignore-scripts`. `esbuild` is a devDependency; omitting `--include=dev` breaks `build:browser` when `NODE_ENV=production`.
- RedX browser server defaults to port 8791.
- Capacitor `build:web` / native scripts and the EAS cloud release path are unchanged.
- `native/v040-unified-studio` only added a source-extract workflow; it is included here as a manual workflow.

## 0.6.6-mobile.1

- EAS cloud release branch with RedX browser packaging and Core 5 mobile containers.
