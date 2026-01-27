/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const http = require("http");

let adminWindow;
let displayWindow;

function createWindows() {
  displayWindow = new BrowserWindow({
    width: 900,
    height: 600,
    autoHideMenuBar: true,
  });
  
  
  displayWindow.loadURL("http://localhost:3000/display");
  displayWindow.maximize();
  
  adminWindow = new BrowserWindow({
    width: 500,
    height: 600,
    autoHideMenuBar: false,
    webPreferences: {
      // Enable ipcRenderer in the renderer process for silent printing.
      // For production consider using a preload script to expose a safe API.
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Handle silent print requests from renderer
  ipcMain.on("silent-print", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || adminWindow;
    if (!win) return;
    win.webContents.print({ silent: true, printBackground: true }, (success, failureReason) => {
      try {
        event.reply("silent-print-done", { success, failureReason });
      } catch (e) {
        // ignore
      }
    });
  });

  adminWindow.loadURL("http://localhost:3000/admin");
  adminWindow.loadURL("http://localhost:3000/admin");
}
function warmUpSocket() {
http.get("http://localhost:3000/api/socket", () => {
  console.log("✅ Socket API warmed up");
}).on("error", (err) => {
  console.error("❌ Warmup socket gagal:", err.message);
});
}

async function startProdServerAndCreate() {
  if (app.isPackaged) {
    console.log('Packaged mode: starting Next production server...');
    const next = require("next");
    const { createServer } = require("http");
    const { parse } = require("url");

    const nextApp = next({ dev: false, dir: path.join(__dirname, "..") });
    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    server.listen(3000, () => {
      console.log('Next server listening on http://localhost:3000');
      warmUpSocket();
      createWindows();
    });
  } else {
    console.log('Dev mode: creating windows using existing dev server');
    createWindows();
  }
}

app.whenReady().then(startProdServerAndCreate);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Open DevTools when DEBUG_ELECTRON=true for packaged apps
if (process.env.DEBUG_ELECTRON === 'true') {
  app.on('browser-window-created', (e, window) => {
    window.webContents.openDevTools();
  });
}