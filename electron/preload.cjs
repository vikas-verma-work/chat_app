const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mainRendererMain", {
  // Renderer -> Main (fire-and-forget)
  sendToMain: (channel, payload) => {
    ipcRenderer.send(channel, payload);
  },

  // Renderer -> Main (request/response)
  invokeToMain: (channel, payload) => {
    return ipcRenderer.invoke(channel, payload);
  },

  // Main -> Renderer (push)
  // main sends: mainWindow.webContents.send("sendToRender", message)
  sendToRender: (channel, cb) => {
    ipcRenderer.on(channel, (event, payload) => {
      cb(payload);
    });
  },

  // Renderer -> Child (via main, fire-and-forget)
  sendToChild: (channel, payload) => {
    ipcRenderer.send(channel, payload);
  },

  // Child -> Renderer (via main, push)
  getFromChild: (channel, cb) => {
    ipcRenderer.on(channel, (event, payload) => {
      cb(payload);
    });
  },

  // Renderer -> Child (via main, request/response)
  askedToChild: (channel, payload) => {
    return ipcRenderer.invoke(channel, payload);
  },
});
