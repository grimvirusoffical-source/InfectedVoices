/**
 * Third-party code shipped as separate files and listed on the About screen (data-testid `about-licenses`).
 * SoundTouch is LGPL-2.1: it ships unmodified as its own file (vendor/soundtouchjs/soundtouch.js, copied by
 * studio/scripts/copy-worklets.mjs), with its license text alongside, and is never bundled into our code.
 * Keep `version` in step with the exact version pinned in studio/package.json (a unit test checks this).
 */
export type ThirdPartyNotice = {
  name: string
  version: string
  license: string
  licenseUrl: string
  copyright: string
  sourceUrl: string
  shippedFile: string
  licenseFile: string
  usedFor: string
}

export const THIRD_PARTY_NOTICES: ThirdPartyNotice[] = [
  {
    name: 'SoundTouchJS (soundtouchjs)',
    version: '0.3.0',
    license: 'GNU Lesser General Public License v2.1 (LGPL-2.1)',
    licenseUrl: 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html',
    copyright: "Copyright (c) Olli Parviainen, Ryan Berdeen, Jakub Fiala, Steve 'Cutter' Blades",
    sourceUrl: 'https://github.com/cutterbl/SoundTouchJS/tree/v0.3.0',
    shippedFile: 'vendor/soundtouchjs/soundtouch.js',
    licenseFile: 'vendor/soundtouchjs/LICENSE.txt',
    usedFor: 'Pitch shifting for auto-tune, the GRIM pitch drop and Rap on Beat time-stretch',
  },
]
