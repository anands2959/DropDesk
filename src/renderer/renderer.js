class DropDeskRenderer {
  constructor() {
    this.fileList = [];
    this.filteredFiles = [];
    this.isSettingsOpen = false;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadHistory();
    await this.updateUI();
    await this.loadTheme();
    
    // Enable drag and drop on the entire window
    this.enableWindowDragDrop();
  }

  async loadTheme() {
    try {
      const settings = await window.electronAPI.getSettings();
      if (settings && settings.theme) {
        this.applyTheme(settings.theme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  }

  applyTheme(theme) {
    document.body.classList.toggle('light-theme', theme === 'light');
  }

  enableWindowDragDrop() {
    // Enable drag and drop on the entire window
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.add('drag-over');
    });
    
    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!e.currentTarget.contains(e.relatedTarget)) {
        document.body.classList.remove('drag-over');
      }
    });
    
    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.remove('drag-over');
      
      // Get the file paths directly from the dataTransfer
      const files = Array.from(e.dataTransfer.files);
      const filePaths = files.map(file => file.path);
      
      if (filePaths.length > 0) {
        await this.processFiles(filePaths);
      }
    });
  }

  setupEventListeners() {
    // Window controls
    document.getElementById('minimizeBtn')?.addEventListener('click', () => {
      window.electronAPI.closeWindow();
    });
    
    document.getElementById('quitBtn')?.addEventListener('click', () => {
      window.electronAPI.quitApp();
    });

    // Global drag and drop handling
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Only add drag-over class if not already on drop zone
      if (!e.target.closest('#dropZone')) {
        document.body.classList.add('drag-over');
      }
    });

    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Remove drag-over class when leaving the body
      if (e.target === document.documentElement || e.target === document.body) {
        document.body.classList.remove('drag-over');
      }
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Always remove the drag-over class when dropping anywhere
      document.body.classList.remove('drag-over');
    });

    // File handling
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));
    
    document.querySelector('.browse-link')?.addEventListener('click', () => fileInput.click());

    dropZone?.addEventListener('dragover', (e) => this.handleDragOver(e));
    dropZone?.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    dropZone?.addEventListener('drop', (e) => this.handleDrop(e));

    // Search
    document.getElementById('searchInput')?.addEventListener('input', (e) => this.handleSearch(e));

    // Buttons
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.toggleSettings());
    document.getElementById('exportBtn')?.addEventListener('click', () => this.exportHistory());
    document.getElementById('clearBtn')?.addEventListener('click', () => this.clearHistory());
    document.getElementById('backToMain')?.addEventListener('click', () => this.toggleSettings());
    
    // Theme
    document.getElementById('theme')?.addEventListener('change', (e) => this.changeTheme(e.target.value));

    // IPC Events
    window.electronAPI.onFilesDroppedOnTray((files) => {
      this.processFiles(files);
    });
    
    window.electronAPI.onFoldersDroppedOnTray((folders) => {
      this.processFolders(folders);
    });
    
    document.getElementById('developerLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.electronAPI.openLink('https://github.com/anands2959');
    });
  }

  async changeTheme(theme) {
    try {
      this.applyTheme(theme);
      const settings = await window.electronAPI.getSettings();
      settings.theme = theme;
      await window.electronAPI.saveSettings(settings);
    } catch (error) {
      console.error('Error changing theme:', error);
    }
  }

  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('dropZone')?.classList.add('drag-over');
  }

  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      document.getElementById('dropZone')?.classList.remove('drag-over');
    }
  }

  async handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('dropZone')?.classList.remove('drag-over');
    // Also remove global drag-over class
    document.body.classList.remove('drag-over');

    // Get the file paths directly from the dataTransfer
    const files = Array.from(e.dataTransfer.files);
    const filePaths = files.map(file => file.path);
    
    if (filePaths.length > 0) {
      await this.processFiles(filePaths);
    }
  }

  async handleFileSelect(e) {
    const files = Array.from(e.target.files).map(file => file.path);
    await this.processFiles(files);
  }

  async processFiles(filePaths) {
    if (!filePaths || filePaths.length === 0) return;

    try {
      this.updateStatus('Processing files...');
      const result = await window.electronAPI.processDroppedFiles(filePaths);
      
      document.body.classList.remove('drag-over');
      
      if (result.success) {
        await this.loadHistory();
        await this.updateUI();
        this.updateStatus(`Added ${result.files.length} file(s)`);
        setTimeout(() => this.updateStatus('Ready'), 2000);
      } else {
        this.updateStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing files:', error);
      // Always remove the global drag-over class even on error
      document.body.classList.remove('drag-over');
      this.updateStatus('Error processing files');
    }
  }

  async processFolders(folderPaths) {
    if (!folderPaths || folderPaths.length === 0) return;

    try {
      this.updateStatus('Processing folders...');
      const result = await window.electronAPI.processDroppedFolders(folderPaths);
      
      // Always remove the global drag-over class after processing
      document.body.classList.remove('drag-over');
      
      if (result.success) {
        await this.loadHistory();
        await this.updateUI();
        this.updateStatus(`Added ${result.folders.length} folder(s)`);
        setTimeout(() => this.updateStatus('Ready'), 2000);
      } else {
        this.updateStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing folders:', error);
      // Always remove the global drag-over class even on error
      document.body.classList.remove('drag-over');
      this.updateStatus('Error processing folders');
    }
  }

  async loadHistory() {
    try {
      this.fileList = await window.electronAPI.getHistory();
      this.filteredFiles = [...this.fileList];
    } catch (error) {
      console.error('Error loading history:', error);
      this.fileList = [];
      this.filteredFiles = [];
    }
  }

  async handleSearch(e) {
    const query = e.target.value.toLowerCase();
    await this.filterFiles(query);
  }

  async filterFiles(searchQuery = null) {
    const query = searchQuery !== null ? searchQuery : 
                  document.getElementById('searchInput')?.value.toLowerCase() || '';

    this.filteredFiles = this.fileList.filter(file => {
      return !query || 
        file.fileName.toLowerCase().includes(query) ||
        file.originalPath.toLowerCase().includes(query);
    });

    await this.updateFileList();
  }

  async updateUI() {
    await this.updateFileList();
    this.updateStatusBar();
  }

  async updateFileList() {
    const fileListElement = document.getElementById('fileList');
    const emptyState = document.getElementById('emptyState');
    
    if (!fileListElement || !emptyState) return;

    if (this.filteredFiles.length === 0) {
      fileListElement.innerHTML = '';
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';
    fileListElement.innerHTML = '';

    for (const file of this.filteredFiles) {
      const fileElement = await this.createFileElement(file);
      fileListElement.appendChild(fileElement);
    }
  }

  async createFileElement(file) {
    const template = document.getElementById('fileItemTemplate');
    const fileElement = template.content.cloneNode(true).firstElementChild;

    const appIcon = fileElement.querySelector('.file-app-icon');
    const typeIcon = fileElement.querySelector('.file-type-icon');
    
    const previewLoaded = await this.loadFilePreview(file, appIcon, typeIcon);
    
    if (!previewLoaded) {
      try {
        const iconResult = await window.electronAPI.getFileIcon(file.originalPath);
        if (iconResult.success && iconResult.iconDataURL) {
          appIcon.src = iconResult.iconDataURL;
          appIcon.style.display = 'block';
          typeIcon.style.display = 'none';
        } else {
          this.setFallbackIcon(typeIcon, file.type);
        }
      } catch (error) {
        console.error('Error loading file icon:', error);
        this.setFallbackIcon(typeIcon, file.type);
      }
    }

    fileElement.querySelector('.file-name').textContent = file.fileName;
    fileElement.querySelector('.file-size').textContent = this.formatFileSize(file.sizeKB);
    fileElement.querySelector('.file-date').textContent = this.formatDate(file.addedToHistory);

    fileElement.setAttribute('draggable', 'true');
    fileElement.dataset.filePath = file.originalPath;
    fileElement.dataset.fileId = file.id;
    
    fileElement.addEventListener('dragstart', (e) => this.handleDragStart(e, file.originalPath));
    fileElement.addEventListener('dragend', (e) => this.handleDragEnd(e));

    // Action buttons
    fileElement.querySelector('.copy-btn')?.addEventListener('click', () => this.copyFileToClipboard(file.originalPath));
    fileElement.querySelector('.open-btn')?.addEventListener('click', () => this.openFile(file.originalPath));
    fileElement.querySelector('.show-btn')?.addEventListener('click', () => this.showInFolder(file.originalPath));
    fileElement.querySelector('.delete-item')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteFile(file.id);
    });

    return fileElement;
  }
  
  async loadFilePreview(file, appIcon, typeIcon) {
    try {
      if (file.type === 'image') {
        appIcon.src = `file://${file.originalPath}`;
        appIcon.style.display = 'block';
        typeIcon.style.display = 'none';
        return true;
      }
      
      if (file.extension.toLowerCase() === '.pdf') {
        typeIcon.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <polyline points="10,9 9,9 8,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        typeIcon.style.display = 'flex';
        typeIcon.style.alignItems = 'center';
        typeIcon.style.justifyContent = 'center';
        appIcon.style.display = 'none';
        return true;
      }
      
      if (file.type === 'folder') {
        typeIcon.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        typeIcon.style.display = 'flex';
        typeIcon.style.alignItems = 'center';
        typeIcon.style.justifyContent = 'center';
        appIcon.style.display = 'none';
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading file preview:', error);
      return false;
    }
  }
  
  handleDragStart(e, filePath) {
    e.preventDefault();
    e.stopPropagation();
    
    e.target.classList.add('dragging');
    
    window.electronAPI.startFileDrag(filePath).catch(err => {
      console.error('Error starting file drag:', err);
    });
  }
  
  handleDragEnd(e) {
    e.target.classList.remove('dragging');
  }
  
  setFallbackIcon(typeIcon, fileType) {
    const iconText = this.getFileTypeAbbr(fileType);
    typeIcon.textContent = iconText;
    typeIcon.style.background = 'var(--primary)';
    typeIcon.style.color = 'var(--secondary)';
    typeIcon.style.display = 'flex';
    typeIcon.style.alignItems = 'center';
    typeIcon.style.justifyContent = 'center';
    typeIcon.style.fontWeight = '700';
    typeIcon.style.fontSize = '12px';
  }

  getFileTypeAbbr(type) {
    const abbrs = {
      image: 'IMG',
      document: 'DOC',
      video: 'VID',
      audio: 'AUD',
      code: 'CODE',
      archive: 'ZIP',
      spreadsheet: 'XLS',
      presentation: 'PPT',
      folder: 'FOLDER',
      other: 'FILE'
    };
    return abbrs[type] || abbrs.other;
  }

  formatFileSize(sizeKB) {
    if (sizeKB < 1024) return `${Math.round(sizeKB)} KB`;
    const sizeMB = (sizeKB / 1024).toFixed(1);
    return `${sizeMB} MB`;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  updateStatusBar() {
    const fileCount = this.filteredFiles.length;
    const totalSize = this.filteredFiles.reduce((sum, file) => sum + file.sizeKB, 0);
    
    const fileCountElement = document.getElementById('fileCount');
    const totalSizeElement = document.getElementById('totalSize');
    
    if (fileCountElement) {
      fileCountElement.textContent = `${fileCount} item${fileCount !== 1 ? 's' : ''}`;
    }
    
    if (totalSizeElement) {
      totalSizeElement.textContent = this.formatFileSize(totalSize);
    }
  }

  updateStatus(message) {
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
      lastUpdateElement.textContent = message;
    }
  }

  toggleSettings() {
    this.isSettingsOpen = !this.isSettingsOpen;
    
    const settingsPanel = document.getElementById('settingsPanel');
    const mainPanel = document.getElementById('mainPanel');
    
    if (this.isSettingsOpen) {
      settingsPanel.style.display = 'block';
      mainPanel.style.display = 'none';
      this.loadSettingsIntoForm();
    } else {
      settingsPanel.style.display = 'none';
      mainPanel.style.display = 'block';
    }
  }

  async loadSettingsIntoForm() {
    try {
      const settings = await window.electronAPI.getSettings();
      const themeSelect = document.getElementById('theme');
      if (themeSelect && settings.theme) {
        themeSelect.value = settings.theme;
      }
    } catch (error) {
      console.error('Error loading settings into form:', error);
    }
  }

  async copyFileToClipboard(filePath) {
    try {
      const result = await window.electronAPI.copyFile(filePath);
      if (result.success) {
        this.updateStatus('File copied to clipboard - ready to paste!');
        setTimeout(() => this.updateStatus('Ready'), 3000);
      } else {
        this.updateStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error copying file to clipboard:', error);
      this.updateStatus('Error copying file');
    }
  }

  async openFile(filePath) {
    try {
      await window.electronAPI.openFile(filePath);
      this.updateStatus('File opened');
      setTimeout(() => this.updateStatus('Ready'), 2000);
    } catch (error) {
      console.error('Error opening file:', error);
      this.updateStatus('Error opening file');
    }
  }

  async showInFolder(filePath) {
    try {
      await window.electronAPI.showInFolder(filePath);
      this.updateStatus('Folder opened');
      setTimeout(() => this.updateStatus('Ready'), 2000);
    } catch (error) {
      console.error('Error showing folder:', error);
      this.updateStatus('Error opening folder');
    }
  }

  async deleteFile(fileId) {
    try {
      const result = await window.electronAPI.deleteFileFromHistory(fileId);
      
      if (result.success) {
        await this.loadHistory();
        await this.updateUI();
        this.updateStatus('File deleted');
        setTimeout(() => this.updateStatus('Ready'), 2000);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      this.updateStatus('Error deleting file');
    }
  }

  async exportHistory() {
    try {
      this.updateStatus('Exporting history...');
      const result = await window.electronAPI.exportHistory();
      
      if (result.success && !result.canceled) {
        this.updateStatus(`History exported to ${result.path}`);
        setTimeout(() => this.updateStatus('Ready'), 3000);
      } else if (result.canceled) {
        this.updateStatus('Export canceled');
        setTimeout(() => this.updateStatus('Ready'), 2000);
      }
    } catch (error) {
      console.error('Error exporting history:', error);
      this.updateStatus('Error exporting history');
    }
  }

  async clearHistory() {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      try {
        this.updateStatus('Clearing history...');
        await window.electronAPI.clearHistory();
        await this.loadHistory();
        await this.updateUI();
        this.updateStatus('History cleared');
        setTimeout(() => this.updateStatus('Ready'), 2000);
      } catch (error) {
        console.error('Error clearing history:', error);
        this.updateStatus('Error clearing history');
      }
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DropDeskRenderer();
});