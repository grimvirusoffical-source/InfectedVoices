# Infected Voices pinned sources

The canonical studio is the TypeScript app in `studio/` (version 0.7.0). `npm run build:web` compiles it to `dist/`.

The Core 5 arrangement payload copied to `dist/arrangement/` is still the pinned archive below. The build refuses to extract it if the SHA-256 does not match.

Studio source archive SHA-256:

`e6288c29a180d8d6048fcc9117a6f6a50e7d3225920aadeb2fe48288adaf8967`

The build concatenates `vendor/studio-source.part00.b64` through `part33.b64`, decodes the Base64 archive and refuses to extract it unless this SHA-256 matches.
