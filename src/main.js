import { app, shell, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { updateElectronApp } from 'update-electron-app';

updateElectronApp();

const userDataPath = app.getPath('userData')
const userDataFile = path.join(userDataPath, 'user-data.json')

if (!fs.existsSync(userDataFile)) {
  fs.writeFileSync(userDataFile, JSON.stringify({}))
}

ipcMain.on('get-user-data', (event, key) => {
  const data = JSON.parse(fs.readFileSync(userDataFile))
  event.returnValue = data[key]
})

ipcMain.on('set-user-data', (event, { key, value }) => {
  const data = JSON.parse(fs.readFileSync(userDataFile))
  data[key] = value
  fs.writeFileSync(userDataFile, JSON.stringify(data))
})

// Add overlay window functionality
let overlayWindow = null;

// Ensure the overlay window does not block interactions with other programs
ipcMain.on('toggle-overlay', (event, enable) => {
  if (enable) {
    if (!overlayWindow) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;

      overlayWindow = new BrowserWindow({
        width,
        height,
        // focusable: false,
        transparent: true,
        frame: false, // Ensure no title bar is displayed
        alwaysOnTop: true,
        autoHideMenuBar: true,
        // resizable: false,
        // focusable: false, // Prevent the overlay from receiving focus
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          sandbox: false,
          preload: path.join(__dirname, 'preload.js'),
        },
      });

      console.log('Overlay window created');

      overlayWindow.setIgnoreMouseEvents(true, { forward: true }); // Allow mouse events to pass through
      console.log(`OVERLAY_WINDOW_VITE_DEV_SERVER_URL`, OVERLAY_WINDOW_VITE_DEV_SERVER_URL)
      if (OVERLAY_WINDOW_VITE_DEV_SERVER_URL) {
          overlayWindow.loadURL(`${OVERLAY_WINDOW_VITE_DEV_SERVER_URL}/overlay.html`);
      } else {
          overlayWindow.loadFile(path.join(__dirname, `../renderer/${OVERLAY_WINDOW_VITE_NAME}/overlay.html`));
      }
      overlayWindow.setAlwaysOnTop(true, 'dock');

      // overlayWindow.webContents.openDevTools();

      overlayWindow.on("blur", () => {
        overlayWindow.setResizable(true);
        const [w, h] = overlayWindow.getSize();
        overlayWindow.setSize(w, h + 1);
        overlayWindow.setSize(w, h);
        overlayWindow.setResizable(false);
      });
      overlayWindow.on("focus", () => {
        overlayWindow.setResizable(true);
        const [w, h] = overlayWindow.getSize();
        overlayWindow.setSize(w, h + 1);
        overlayWindow.setSize(w, h);
        overlayWindow.setResizable(false);
      });

      setInterval(() => {
        if (overlayWindow) {
          overlayWindow.setResizable(true);
          const [w, h] = overlayWindow.getSize();
          overlayWindow.setSize(w, h + 1);
          overlayWindow.setSize(w, h);
          overlayWindow.setResizable(false);
        }
      }, 1000);

      overlayWindow.on('closed', () => {
        overlayWindow = null;
      });
    }
  } else {
    if (overlayWindow) {
      overlayWindow.close();
      overlayWindow = null;
    }
  }
});

// Ensure the overlay window receives kill feed updates
ipcMain.on('update-killfeed-data', (event, data) => {
  if (overlayWindow) {
    overlayWindow.webContents.send('update-killfeed', data);
  }
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    // frame: false,
    resizable: true, 
    roundedCorners: true,
    
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.on("blur", () => {
    const [w, h] = mainWindow.getSize();
    mainWindow.setSize(w, h + 1);
    mainWindow.setSize(w, h);
  });
  mainWindow.on("focus", () => {
    const [w, h] = mainWindow.getSize();
    mainWindow.setSize(w, h + 1);
    mainWindow.setSize(w, h);
  });

  setInterval(() => {
    if (mainWindow) {
      const [w, h] = mainWindow.getSize();
      mainWindow.setSize(w, h + 1);
      mainWindow.setSize(w, h);
    }
  }, 1000);


  // Ensure the overlay window closes when the main window is closed
  mainWindow.on('closed', () => {
    if (overlayWindow) {
      overlayWindow.close();
      overlayWindow = null;
    }
  });
};


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
