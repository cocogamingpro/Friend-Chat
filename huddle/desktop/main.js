const { app, BrowserWindow, shell, Menu } = require('electron');
const fs = require('fs'), path = require('path');

// The server address lives in app-url.txt (same folder as this file).
let APP_URL = '';
try { APP_URL = fs.readFileSync(path.join(__dirname, 'app-url.txt'), 'utf8').trim().replace(/\/+$/, ''); } catch {}
const configured = /^https?:\/\//.test(APP_URL) && !APP_URL.includes('YOUR-APP-NAME');

// Small built-in status page shown while connecting.
const page = msg => 'data:text/html;charset=utf-8,' + encodeURIComponent(
  `<body style="margin:0;display:grid;place-items:center;height:100vh;background:#1e2140;color:#fff;font-family:Segoe UI,sans-serif;text-align:center"><div><h1>Huddle</h1><p>${msg}</p></div></body>`);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win;
  const createWindow = () => {
    Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      width: 1100, height: 750, minWidth: 380, minHeight: 500,
      title: 'Huddle', icon: path.join(__dirname, 'icon.png'), backgroundColor: '#1e2140',
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    if (!configured) {
      win.loadURL(page('No server address set yet.<br>Edit <b>app-url.txt</b> and rebuild the app.'));
      return;
    }
    const load = () => win.loadURL(APP_URL);
    // Render's free plan sleeps; keep retrying until the server wakes up.
    win.webContents.on('did-fail-load', (_e, code, _d, _u, isMainFrame) => {
      if (!isMainFrame || code === -3) return; // -3 = cancelled, ignore
      win.loadURL(page('Connecting to the server…<br>It may be waking up, this can take up to a minute.'));
      setTimeout(load, 3000);
    });
    // Open outside links in the normal browser, not inside the app.
    win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
    load();
  };
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
