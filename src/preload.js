const { contextBridge, ipcRenderer } = require('electron');

// Helper function to remove all listeners for a channel
const removeAllListeners = (channel) => {
  ipcRenderer.removeAllListeners(channel);
};

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  processDroppedFiles: (filePaths) => ipcRenderer.invoke('file-dropped', filePaths),
  processDroppedFolders: (folderPaths) => ipcRenderer.invoke('folder-dropped', folderPaths),
  startFileDrag: (filePath) => ipcRenderer.invoke('start-file-drag', filePath),
  
  // History management
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  exportHistory: () => ipcRenderer.invoke('export-history'),
  deleteFileFromHistory: (fileId) => ipcRenderer.invoke('delete-file-from-history', fileId),
  
  // File actions
  copyFile: (filePath) => ipcRenderer.invoke('copy-file', filePath),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
  getFileIcon: (filePath) => ipcRenderer.invoke('get-file-icon', filePath),
  openLink: (url) => ipcRenderer.invoke('open-link', url),
  saveFileToLocation: (sourcePath, destinationPath) => ipcRenderer.invoke('save-file-to-location', sourcePath, destinationPath),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Auto-launch
  getAutoLaunchStatus: () => ipcRenderer.invoke('get-auto-launch-status'),
  toggleAutoLaunch: (enable) => ipcRenderer.invoke('toggle-auto-launch', enable),
  
  // Window management
  showDropWindow: () => ipcRenderer.invoke('show-drop-window'),
  
  // App control
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // Event listeners
  onFilesDroppedOnTray: (callback) => {
    ipcRenderer.on('files-dropped-on-tray', (event, files) => callback(files));
  },
  
  onFoldersDroppedOnTray: (callback) => {
    ipcRenderer.on('folders-dropped-on-tray', (event, folders) => callback(folders));
  },
  
  // Remove listeners
  removeAllListeners
});