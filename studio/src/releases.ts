/** Published GitHub source release. There is no v0.4.1 release and no uploaded installer. */
export const VOCAL_LAB_V040 = {
  name: 'v0.4.0',
  tag: 'Release',
  branch: 'native/v040-unified-studio',
  zipball: 'https://github.com/grimvirusoffical-source/InfectedVoices/zipball/Release',
  page: 'https://github.com/grimvirusoffical-source/InfectedVoices/releases/tag/Release',
} as const

/** Exact RedXAIHost install line. esbuild is a devDependency. */
export const REDX_INSTALL_COMMAND = 'npm install --include=dev --ignore-scripts'
