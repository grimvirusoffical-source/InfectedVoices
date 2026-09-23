import './mobile-shell-src.js';

const config = await window.ivShell.config();
window.ivNative = {
  serverOrigin: config.serverOrigin,
  platform: config.platform,
  nativeVersion: config.nativeVersion,
  openExternal: window.ivShell.openExternal,
  saveFile: async (name, bytes) => window.ivShell.saveFile(name, bytes),
};
window.ivDesktop = {
  platform: config.platform,
  version: config.nativeVersion,
  setSessionState: window.ivShell.setSessionState,
  checkUpdates: window.ivShell.checkUpdates,
  checkForUpdates: async () => {
    await window.ivOpenNativeUpdates?.();
    return {message: 'Mobile store update dialog opened.'};
  },
};

const {mountStudioChrome} = await import('./studio-chrome.js');
await mountStudioChrome();
