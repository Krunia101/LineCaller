/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow } = require("electron");

let adminWindow;
let displayWindow;

function createWindows() {
  // WINDOW DISPLAY
  displayWindow = new BrowserWindow({
    width: 900,
    height: 600,
    autoHideMenuBar: true,
  });

  displayWindow.loadURL("http://localhost:3000/display");

  displayWindow.maximize();

  // WINDOW ADMIN
  adminWindow = new BrowserWindow({
    width: 500,
    height: 600,
    autoHideMenuBar: false,
  });

  adminWindow.loadURL("http://localhost:3000/admin");
}

app.whenReady().then(createWindows);
