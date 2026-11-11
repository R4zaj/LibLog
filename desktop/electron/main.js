import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  const distIcon = path.join(__dirname, '../dist/icon.ico');
  const publicIcon = path.join(__dirname, '../public/icon.ico');
  const resolvedIcon = fs.existsSync(distIcon) ? distIcon : publicIcon;

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: resolvedIcon,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Automatically open DevTools in dev mode
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // Resolve from __dirname (dist-electron/) up to the built renderer.
    // process.env.DIST is never set anywhere, so joining on it threw and the
    // window stayed blank in every packaged build.
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
