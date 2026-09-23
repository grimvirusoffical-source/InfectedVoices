# RedXAIHost

RedXAIHost registers the `eas-cloud-release` line and must install with this exact command:

```bash
npm install --include=dev --ignore-scripts
```

That string is `redx.install_command` in the root `package.json`. Then:

```bash
npm run build:browser
npm run start:redx
```

`esbuild` is a root devDependency used by `scripts/build-web.mjs` and `scripts/build-browser.mjs`. The host sets `NODE_ENV=production`. A plain `npm install` then omits devDependencies, and `build:browser` fails before it can write `browser-dist/`. `--include=dev` keeps `esbuild`. `--ignore-scripts` is the host rule. The Bungee and audio-processor bundles are already committed in `studio/public/`, so skipping lifecycle scripts does not drop them.

`build:browser` installs the Vite studio the same way: `npm install --include=dev --ignore-scripts --prefix studio`, then `npm run build:host`. The studio overlay replaces `browser-dist/index.html` and its assets. `browser-dist/api.js` stays the existing account adapter.

`start:redx` listens on port **8791** unless `PORT` is set.

The published GitHub source release is tag `Release`, name `v0.4.0`, branch `native/v040-unified-studio`:

https://github.com/grimvirusoffical-source/InfectedVoices/zipball/Release

There is no v0.4.1 GitHub release and no uploaded Windows installer on that release.
