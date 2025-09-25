const { Tray, nativeImage, app } = require('electron');
const path = require('path');
const fs = require('fs');

function createTray(appInstance) {
  
  let trayIconPath;
  
  if (app.isPackaged) {
    trayIconPath = path.join(process.resourcesPath, 'assets', 'logo.png');
  } else {
    trayIconPath = path.join(__dirname, '..', 'assets', 'logo.png');
  }
  
  // console.log('Looking for tray icon at:', trayIconPath);
  
  let trayIcon;

  try {
    if (!fs.existsSync(trayIconPath)) {
      throw new Error('Tray icon file does not exist: ' + trayIconPath);
    }
    
    trayIcon = nativeImage.createFromPath(trayIconPath);
    if (trayIcon.isEmpty()) {
      throw new Error('Tray icon is empty');
    }
    
    // Resize icon based on platform
    if (process.platform === 'win32') {
      trayIcon = trayIcon.resize({ width: 32, height: 32 });
    } else {
      trayIcon = trayIcon.resize({ width: 25, height: 25 });
    }
  } catch (error) {
    console.error('Failed to load tray icon from ' + trayIconPath + ', using fallback:', error);
    const iconCanvas = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0xF3, 0xFF, 0x61, 0x00, 0x00, 0x00,
      0x4A, 0x49, 0x44, 0x41, 0x54, 0x38, 0x8D, 0x63, 0x60, 0x18, 0x05, 0xA3,
      0x60, 0x14, 0x8C, 0x02, 0x08, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x85, 0xE2, 0x04, 0x36, 0xE2, 0xC5,
      0x9C, 0x01, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42,
      0x60, 0x82
    ]);
    trayIcon = nativeImage.createFromBuffer(iconCanvas);
  }

  trayIcon.setTemplateImage(true);

  const tray = new Tray(trayIcon);
  console.log('Tray object created');
  tray.setToolTip('DropDesk - Drag & Drop File Manager');

  tray.on('click', () => {
    console.log('Tray clicked');
    appInstance.showDropWindow();
  });

  tray.on('drop-files', async (event, files) => {
    // console.log('Files dropped on tray:', files);
    if (files && files.length > 0) {
      appInstance.showDropWindow();
      
      const { BrowserWindow } = require('electron');
      const windows = BrowserWindow.getAllWindows();
      const dropWindow = windows.find(win => win.getTitle() === 'DropDesk');
      
      if (dropWindow) {
        dropWindow.webContents.send('files-dropped-on-tray', files);
      }
    }
  });

  // Handle folder drops on tray
  tray.on('drop-directories', async (event, folders) => {
    // console.log('Folders dropped on tray:', folders);
    if (folders && folders.length > 0) {
      appInstance.showDropWindow();
      
      const { BrowserWindow } = require('electron');
      const windows = BrowserWindow.getAllWindows();
      const dropWindow = windows.find(win => win.getTitle() === 'DropDesk');
      
      if (dropWindow) {
        dropWindow.webContents.send('folders-dropped-on-tray', folders);
      }
    }
  });

  // console.log('Tray creation completed');
  return tray;
}

module.exports = { createTray };