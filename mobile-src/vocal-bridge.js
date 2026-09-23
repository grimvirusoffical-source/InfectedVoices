import './mobile-shell.js';

const shell = window.ivShell;
const config = await shell.config();
window.ivNative = {
  serverOrigin: config.serverOrigin,
  openExternal: shell.openExternal,
  saveFile: (name, data) => shell.saveFile(name, data)
};
document.documentElement.classList.add('iv-mobile');
