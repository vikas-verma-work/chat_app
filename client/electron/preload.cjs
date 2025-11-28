const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openFileDialog: () => ipcRenderer.invoke("show-open-dialog"),
  minimize: () => ipcRenderer.invoke("window-minimize"),
  maximizeToggle: () => ipcRenderer.invoke("window-maximize-toggle"),
  close: () => ipcRenderer.invoke("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  onWindowMaximized: (cb) => {
    ipcRenderer.on("window-maximized", (event, isMax) => cb(isMax));
  },
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
});
