const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js') // Attach preload script
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
  // Setup IPC handler for generating content
  ipcMain.handle('generate-content', async (event, args) => {
    try {
      const response = await ai.models.generateContent(args);
      // Return a plain object to avoid IPC serialization errors
      return {
        text: response.text,
        candidates: response.candidates
      };
    } catch (error) {
      console.error("IPC Error generating content:", error);
      throw error;
    }
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
