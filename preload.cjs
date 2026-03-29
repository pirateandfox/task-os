const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onOpenFile: (callback) => {
    ipcRenderer.on('open-file', (_event, filePath) => callback(filePath))
  },
  // In production the UI is loaded from disk (file://) so fetch needs absolute URLs
  apiBase: process.env.NODE_ENV !== 'development' ? 'http://127.0.0.1:3456' : '',
  // POST via IPC so Node's http module makes the request, bypassing Chromium's
  // network stack which silently blocks POST to localhost on some systems.
  httpPost: (path, jsonBody, formBody) => ipcRenderer.invoke('http-post', path, jsonBody, formBody),
})
