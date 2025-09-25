const { contextBridge, ipcRenderer } = require('electron');

// Helper function to remove all listeners for a channel
const removeAllListeners = (channel) => {
  ipcRenderer.removeAllListeners(channel);
};

contextBridge.exposeInMainWorld('electronAPI', {

  processDroppedFiles: (filePaths) => ipcRenderer.invoke('file-dropped', filePaths),
  processDroppedFolders: (folderPaths) => ipcRenderer.invoke('folder-dropped', folderPaths),
  startFileDrag: (filePath) => ipcRenderer.invoke('start-file-drag', filePath),
  

  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  exportHistory: () => ipcRenderer.invoke('export-history'),
  deleteFileFromHistory: (fileId) => ipcRenderer.invoke('delete-file-from-history', fileId),
  
 
  copyFile: (filePath) => ipcRenderer.invoke('copy-file', filePath),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
  getFileIcon: (filePath) => ipcRenderer.invoke('get-file-icon', filePath),
  openLink: (url) => ipcRenderer.invoke('open-link', url),
  saveFileToLocation: (sourcePath, destinationPath) => ipcRenderer.invoke('save-file-to-location', sourcePath, destinationPath),
  

  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  

  getAutoLaunchStatus: () => ipcRenderer.invoke('get-auto-launch-status'),
  toggleAutoLaunch: (enable) => ipcRenderer.invoke('toggle-auto-launch', enable),
  
  
  showDropWindow: () => ipcRenderer.invoke('show-drop-window'),
  

  quitApp: () => ipcRenderer.invoke('quit-app'),
  
 
  onFilesDroppedOnTray: (callback) => {
    ipcRenderer.on('files-dropped-on-tray', (event, files) => callback(files));
  },
  
  onFoldersDroppedOnTray: (callback) => {
    ipcRenderer.on('folders-dropped-on-tray', (event, folders) => callback(folders));
  },
  

  removeAllListeners
});