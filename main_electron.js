let {expressApp} = require("./public/scripts/main_setup");
const {port} = require("./public/scripts/main_setup");

const { app, BrowserWindow } = require('electron');
app.on('ready', function() {
  let mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true
    },
    autoHideMenuBar: true,
    useContentSize: true,
    resizable: true,
  });
  mainWindow.loadURL(`http://localhost:${port}/`);
  mainWindow.focus();
});



