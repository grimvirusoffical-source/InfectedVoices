const { contextBridge } = require('electron');

const VERSION = '0.7.0';

contextBridge.exposeInMainWorld('ivDesktop', {
  platform: 'desktop',
  version: VERSION,
  checkUpdates: async () => ({
    ready: false,
    signedChannel: 'unprovisioned',
    storeManaged: false,
    message:
      'Signed private updates are not provisioned. This build does not ship a signing key or an update URL. When a key is installed outside the repository, the shell can verify a release manifest before replacing files. Takes and presets stay put until you approve an install.',
  }),
});
