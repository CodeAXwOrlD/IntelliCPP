const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSuggestions: (prefix, contextType, code, cursorPosition) => ipcRenderer.invoke('get-suggestions', prefix, contextType, code, cursorPosition),
  getStats: (code) => ipcRenderer.invoke('get-stats', code)
});
