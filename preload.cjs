const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onOpenFile: (callback) => {
    ipcRenderer.on('open-file', (_event, filePath) => callback(filePath))
  },
})
