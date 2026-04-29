const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  generateContent: (args) => ipcRenderer.invoke('generate-content', args)
});
