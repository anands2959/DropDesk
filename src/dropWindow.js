const { BrowserWindow } = require('electron');
const path = require('path');

function createDropWindow() {
  let iconPath;
  if (process.platform === 'win32') {
    iconPath = path.join(__dirname, '..', 'build', 'icon.ico');
  } else {
    iconPath = path.join(__dirname, '..', 'assets', 'logo.png');
  }

  const window = new BrowserWindow({
    width: 350,
    height: 450,
    minWidth: 350,
    maxWidth: 350,
    minHeight: 350,
    title: 'DropDesk',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    },
    show: false,
    skipTaskbar: true,
    backgroundColor: '#121212',
    vibrancy: 'dark',
    visualEffectState: 'active',
    thickFrame: true,
    icon: path.join(__dirname, '..', 'assets', 'logo.png')
  });

  window.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  window.once('ready-to-show', () => {
    window.show();
  });

  window.on('minimize', () => {
    return false;
  });

  return window;
}

module.exports = { createDropWindow };