const { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeImage, Tray } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { createTray } = require('./tray');
const { createDropWindow } = require('./dropWindow');
const { FileManager } = require('./fileManager');


const appFolder = process.execPath;
const appFolderName = path.dirname(appFolder);
const appProcess = appFolderName.includes('node_modules') ? 'electron' : path.basename(appFolder);


let tray = null;
let dropWindow = null;

const isDev = process.argv.includes('--dev');

const dataPath = app.isPackaged 
  ? path.join(app.getPath('userData'), 'data')
  : path.join(__dirname, '..', 'data');

class DropDeskApp {
  constructor() {
    this.fileManager = new FileManager(dataPath);
    this.init();
  }

  async init() {
    await this.ensureDataDirectory();
    this.setupAppEvents();
    this.setupIPC();
    this.setupAutoLaunch();
  }

  async ensureDataDirectory() {
    try {
      await fs.access(dataPath);
    } catch {
      await fs.mkdir(dataPath, { recursive: true });
    }
  }

  setupAutoLaunch() {
    // Get current auto-launch setting from settings
    ipcMain.handle('get-auto-launch-status', async () => {
      if (process.platform === 'darwin') {
        const loginItemSettings = app.getLoginItemSettings();
        return { enabled: loginItemSettings.openAtLogin };
      } else {
        try {
          const settings = await this.fileManager.getSettings();
          return { enabled: settings.autoLaunch || false };
        } catch {
          return { enabled: false };
        }
      }
    });

    ipcMain.handle('toggle-auto-launch', async (event, enable) => {
      if (process.platform === 'darwin') {
        app.setLoginItemSettings({
          openAtLogin: enable,
          openAsHidden: true 
        });
        return { success: true, enabled: enable };
      } else {
        try {
          const settings = await this.fileManager.getSettings();
          settings.autoLaunch = enable;
          await this.fileManager.saveSettings(settings);
          return { success: true, enabled: enable };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    });
  }

  setupAppEvents() {
    app.whenReady().then(() => {
      console.log('App is ready, creating tray...');
      setTimeout(() => {
        tray = createTray(this);
        if (process.platform === 'darwin') {
          console.log('Hiding dock icon on macOS');
          app.dock.hide();
        }
      }, 100);
    });

    app.on('window-all-closed', (e) => {
      e.preventDefault();
    });

    app.on('activate', () => {
      if (!dropWindow) {
        this.showDropWindow();
      }
    });

    app.on('before-quit', () => {
      console.log('App is quitting, destroying tray');
      if (tray) {
        tray.destroy();
      }
    });
  }

  setupIPC() {
    ipcMain.handle('file-dropped', async (event, filePaths) => {
      try {
        const fileResults = [];
        const folderResults = [];
        
        for (const filePath of filePaths) {
          try {
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
              const folderInfo = await this.fileManager.processFolder(filePath);
              folderResults.push(folderInfo);
            } else {
              const fileInfo = await this.fileManager.processFile(filePath);
              fileResults.push(fileInfo);
            }
          } catch (error) {
            console.error(`Error processing path ${filePath}:`, error);
          }
        }
        
        return { 
          success: true, 
          files: fileResults,
          folders: folderResults
        };
      } catch (error) {
        console.error('Error processing dropped items:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('folder-dropped', async (event, folderPaths) => {
      try {
        const results = [];
        for (const folderPath of folderPaths) {
          const folderInfo = await this.fileManager.processFolder(folderPath);
          results.push(folderInfo);
        }
        return { success: true, folders: results };
      } catch (error) {
        console.error('Error processing dropped folders:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('minimize-window', () => {
      if (dropWindow) {
        dropWindow.minimize();
      }
    });

    ipcMain.handle('close-window', () => {
      if (dropWindow) {
        dropWindow.hide();
      }
    });

    ipcMain.handle('get-history', async () => {
      try {
        return await this.fileManager.getHistory();
      } catch (error) {
        console.error('Error getting history:', error);
        return [];
      }
    });

    ipcMain.handle('clear-history', async () => {
      try {
        await this.fileManager.clearHistory();
        return { success: true };
      } catch (error) {
        console.error('Error clearing history:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('delete-file-from-history', async (event, fileId) => {
      try {
        await this.fileManager.deleteFileFromHistory(fileId);
        return { success: true };
      } catch (error) {
        console.error('Error deleting file from history:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('export-history', async () => {
      try {
        const result = await dialog.showSaveDialog({
          title: 'Export History',
          defaultPath: 'dropdesk-history.json',
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (!result.canceled) {
          await this.fileManager.exportHistory(result.filePath);
          return { success: true, path: result.filePath };
        }
        return { success: false, canceled: true };
      } catch (error) {
        console.error('Error exporting history:', error);
        return { success: false, error: error.message };
      }
    });

    // File actions
    ipcMain.handle('copy-file', async (event, filePath) => {
      try {
        const { clipboard } = require('electron');
        const fs = require('fs');
        
        if (process.platform === 'darwin') {
          const { execSync } = require('child_process');
          const escapedPath = filePath.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
          execSync(`osascript -e 'set the clipboard to (POSIX file "${escapedPath}")'`);
        } else if (process.platform === 'win32') {
          const { execSync } = require('child_process');
          const escapedPath = filePath.replace(/'/g, "''");
          execSync(`powershell.exe -Command "Set-Clipboard -Path '${escapedPath}'"`);
        } else {
          try {
            const { execSync } = require('child_process');
            execSync(`xclip -selection clipboard -t $(file -b --mime-type "${filePath}" | sed 's/^/\\*\\//') "${filePath}"`, { stdio: 'ignore' });
          } catch (linuxError) {
            clipboard.writeText(filePath);
          }
        }
        
        return { success: true, message: 'File copied to clipboard for pasting' };
      } catch (error) {
        console.error('Error copying file to clipboard:', error);
        try {
          const { clipboard } = require('electron');
          clipboard.writeText(filePath);
          return { success: true, message: 'File path copied to clipboard' };
        } catch (fallbackError) {
          return { success: false, error: fallbackError.message };
        }
      }
    });

    ipcMain.handle('open-file', async (event, filePath) => {
      try {
        await shell.openPath(filePath);
        return { success: true };
      } catch (error) {
        console.error('Error opening file:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('show-in-folder', async (event, filePath) => {
      try {
        shell.showItemInFolder(filePath);
        return { success: true };
      } catch (error) {
        console.error('Error showing file in folder:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-file-icon', async (event, filePath) => {
      try {
        const { nativeImage, app } = require('electron');
        const path = require('path');
        
        let icon;
        if (process.platform === 'darwin') {
          icon = await app.getFileIcon(filePath, { size: 'normal' });
        } else if (process.platform === 'win32') {
          icon = await app.getFileIcon(filePath, { size: 'normal' });
        } else {
          const ext = path.extname(filePath).toLowerCase();
          const canvas = nativeImage.createEmpty();
          icon = canvas;
        }
        
        if (icon && !icon.isEmpty()) {
          const iconDataURL = icon.toDataURL();
          return { success: true, iconDataURL };
        } else {
          return { success: false, error: 'Could not get file icon' };
        }
      } catch (error) {
        console.error('Error getting file icon:', error);
        return { success: false, error: error.message };
      }
    });
    
    // Drag and drop
    ipcMain.handle('start-file-drag', async (event, filePath) => {
      try {
        const { nativeImage, app } = require('electron');
        const path = require('path');
        const fs = require('fs');
        
        const sender = event.sender;
        
        try {
          await fs.promises.access(filePath);
        } catch (err) {
          throw new Error(`File does not exist: ${filePath}`);
        }
        
        let icon = null;
        try {
          icon = await app.getFileIcon(filePath, { size: 'normal' });
        } catch (err) {
          console.log('Could not get file icon, using default:', err);
          icon = nativeImage.createEmpty();
        }
        
        sender.startDrag({
          file: filePath,
          icon: icon
        });
        
        return { success: true };
      } catch (error) {
        console.error('Error starting file drag:', error);
        return { success: false, error: error.message };
      }
    });

    // Settings
    ipcMain.handle('get-settings', async () => {
      try {
        return await this.fileManager.getSettings();
      } catch (error) {
        console.error('Error getting settings:', error);
        return {};
      }
    });

    ipcMain.handle('save-settings', async (event, settings) => {
      try {
        await this.fileManager.saveSettings(settings);
        return { success: true };
      } catch (error) {
        console.error('Error saving settings:', error);
        return { success: false, error: error.message };
      }
    });

    // Window management
    ipcMain.handle('show-drop-window', () => {
      this.showDropWindow();
    });
    
    ipcMain.handle('quit-app', () => {
      app.quit();
    });
    
    ipcMain.handle('open-link', async (event, url) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        console.error('Error opening link:', error);
        return { success: false, error: error.message };
      }
    });
    
    // Save file to specific location
    ipcMain.handle('save-file-to-location', async (event, sourcePath, destinationPath) => {
      try {
        const destDir = path.dirname(destinationPath);
        await fs.mkdir(destDir, { recursive: true });
        

        await fs.copyFile(sourcePath, destinationPath);
        
        return { success: true, path: destinationPath };
      } catch (error) {
        console.error('Error saving file:', error);
        return { success: false, error: error.message };
      }
    });
  }

  showDropWindow() {
    if (!dropWindow) {
      dropWindow = createDropWindow();
      
      dropWindow.on('closed', () => {
        dropWindow = null;
      });
    } else {
      dropWindow.show();
      dropWindow.focus();
    }
  }
}


const appInstance = new DropDeskApp();

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    
    if (dropWindow) {
      if (dropWindow.isMinimized()) dropWindow.restore();
      dropWindow.focus();
    }
  });
}