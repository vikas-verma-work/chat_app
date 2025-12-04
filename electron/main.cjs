const { fork } = require("child_process");
const { BrowserWindow, app, ipcMain } = require("electron");
const path = require("path");

let mainWindow;
let child;
const isDev = true;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function setupIpcWithRenderer() {
  // Renderer -> Main (fire-and-forget)
  ipcMain.on("sendToMain", (event, payload) => {
    console.log("[main] sendToMain from renderer:", payload);
  });

  // Renderer -> Main (request/response)
  ipcMain.handle("invokeToMain", async (event, payload) => {
    console.log("[main] invokeToMain from renderer:", payload);
    return "Hello from main";
  });

  // Main -> Renderer (push)
  function sendToRenderer(message) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("sendToRender", message);
    }
  }

  // Example: send a one-off message 8 seconds after app is ready
  setTimeout(() => {
    console.log("[main] sending message to renderer");
    sendToRenderer("Hi from main after 8 seconds");
  }, 8000);
}

function setupChildProcess() {
  child = fork(path.join(__dirname, "child.cjs"));
  console.log("[main] child forked, pid:", child.pid);

  // Renderer -> Child (fire-and-forget)
  ipcMain.on("sendToChild", (event, payload) => {
    console.log("[main] sendToChild from renderer:", payload);

    if (child && child.send) {
      child.send({
        type: "simpleMessage",
        payload,
      });
    }
  });

  // Renderer -> Child (request/response via main)
  ipcMain.handle("askToChild", async (event, payload) => {
    console.log("[main] askToChild from renderer:", payload);

    return new Promise((resolve, reject) => {
      if (!child || !child.send) {
        return reject(new Error("Child process is not available"));
      }

      const requestId =
        Date.now() + "-" + Math.random().toString(36).slice(2, 8);

      function onChildMessage(msg) {
        if (msg && msg.__replyTo === requestId) {
          child.removeListener("message", onChildMessage);
          console.log("[main] response from child for id:", requestId, msg);
          resolve(msg.payload);
        }
      }

      child.on("message", onChildMessage);

      child.send({
        type: "request",
        id: requestId,
        payload,
      });

      setTimeout(() => {
        child.removeListener("message", onChildMessage);
        reject(new Error("Timed out waiting for child response"));
      }, 5000);
    });
  });

  // Child -> Main (global listener; e.g. broadcast to renderer)
  child.on("message", (msg) => {
    if (!msg || typeof msg !== "object") return;

    const { type, payload } = msg;

    if (type === "childBroadcast") {
      console.log("[main] broadcast from child:", payload);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("childToRender", payload);
      }
    } else {
      if (type !== "response") {
        console.log("[main] child message (unhandled type):", msg);
      }
    }
  });

  child.on("exit", (code, signal) => {
    console.log("[main] child exited with", { code, signal });
    child = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();
  setupIpcWithRenderer();
  setupChildProcess();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (child) {
      child.kill();
    }
    app.quit();
  }
});
