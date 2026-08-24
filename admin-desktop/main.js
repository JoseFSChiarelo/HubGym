const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

const isDev = !!process.env.ELECTRON_START_URL;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true
    }
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexFile = path.join(__dirname, 'renderer', 'index.html');
    if (!fs.existsSync(indexFile)) {
      win.loadURL(
        'data:text/html;charset=utf-8,' +
          encodeURIComponent(
            '<h2 style="font-family:sans-serif;color:#111">Bundle não encontrado.</h2><p style="font-family:sans-serif;color:#333">Rode <code>npm run build</code> em <strong>admin-desktop</strong> para gerar o renderer.</p>'
          )
      );
    } else {
      const indexPath = url.pathToFileURL(indexFile).href;
      win.loadURL(indexPath);
      win.webContents.openDevTools({ mode: 'detach' }); // abrir devtools para facilitar debug
    }
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
