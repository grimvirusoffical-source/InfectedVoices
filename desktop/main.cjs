const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function studioIndex() {
  const beside = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(beside)) return beside;
  return path.join(__dirname, '..', 'dist', 'index.html');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#09090b',
    title: 'Infected Voices',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  const index = studioIndex();
  if (!fs.existsSync(index)) {
    throw new Error('Missing studio build at ' + index + '. Run npm run build:web first.');
  }
  win.loadFile(index);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
