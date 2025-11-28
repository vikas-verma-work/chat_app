const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV !== "production";

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 740,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.autoHideMenuBar = true;

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  win.on("maximize", () => {
    win.webContents.send("window-maximized", true);
  });
  win.on("unmaximize", () => {
    win.webContents.send("window-maximized", false);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.handle("window-minimize", () => {
  if (!win) return;
  win.minimize();
});

ipcMain.handle("window-maximize-toggle", () => {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

ipcMain.handle("window-close", () => {
  if (!win) return;
  win.close();
});

ipcMain.handle("window-is-maximized", () => {
  if (!win) return false;
  return win.isMaximized();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("show-open-dialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
  });
  return result.filePaths;
});
