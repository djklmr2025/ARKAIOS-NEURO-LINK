const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#020617', // Match arkaios-900
    webPreferences: {
      nodeIntegration: false, // Security: keep false
      contextIsolation: true, // Security: keep true
      sandbox: false, // Allow File System Access API
      webSecurity: true
    },
    autoHideMenuBar: true,
    titleBarStyle: 'hidden', // Modern borderless look
    titleBarOverlay: {
      color: '#020617',
      symbolColor: '#22d3ee',
      height: 40
    }
  });

  // Load the index.html of the app.
  // In development, you might load localhost if using a dev server,
  // but for the standalone build, we load the file directly.
  mainWindow.loadFile('index.html');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});