const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FileManager {
  constructor(dataPath) {
    this.dataPath = dataPath;
    this.historyFile = path.join(dataPath, 'history.json');
    this.settingsFile = path.join(dataPath, 'settings.json');
    this.defaultSettings = {
      theme: 'light',
      maxHistoryItems: 100
    };
  }

  async processFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      const fileExt = path.extname(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      
      const fileInfo = {
        id: crypto.randomUUID(),
        fileName,
        originalPath: filePath,
        extension: fileExt,
        sizeKB,
        sizeMB: Math.round(stats.size / (1024 * 1024) * 100) / 100,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        addedToHistory: new Date().toISOString(),
        type: this.getFileType(fileExt)
      };

      await this.addToHistory(fileInfo);
      return fileInfo;
    } catch (error) {
      console.error('Error processing file:', error);
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }

  async processFolder(folderPath) {
    try {
      const resolvedPath = path.resolve(folderPath);
      const stats = await fs.stat(resolvedPath);
      const folderName = path.basename(resolvedPath);
      
      const folderInfo = {
        id: crypto.randomUUID(),
        fileName: folderName,
        originalPath: resolvedPath,
        extension: '',
        sizeKB: 0,
        sizeMB: 0,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        addedToHistory: new Date().toISOString(),
        type: 'folder'
      };

      await this.addToHistory(folderInfo);
      return folderInfo;
    } catch (error) {
      console.error('Error processing folder:', error);
      throw new Error(`Failed to process folder: ${error.message}`);
    }
  }

  getFileType(extension) {
    const ext = extension.toLowerCase();
    const types = {
      // Media
      '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', 
      '.bmp': 'image', '.svg': 'image', '.webp': 'image',
      '.pdf': 'document', '.doc': 'document', '.docx': 'document', 
      '.txt': 'document', '.rtf': 'document',
      '.xls': 'spreadsheet', '.xlsx': 'spreadsheet', '.csv': 'spreadsheet',
      '.ppt': 'presentation', '.pptx': 'presentation',
      '.zip': 'archive', '.rar': 'archive', '.7z': 'archive', '.tar': 'archive',
      '.js': 'code', '.html': 'code', '.css': 'code', '.json': 'code', 
      '.py': 'code', '.java': 'code', '.cpp': 'code', '.c': 'code',
      '.mp4': 'video', '.avi': 'video', '.mov': 'video', '.mkv': 'video',
      '.mp3': 'audio', '.wav': 'audio', '.flac': 'audio', '.aac': 'audio'
    };
    return types[ext] || 'other';
  }

  async getHistory() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async addToHistory(fileInfo) {
    try {
      const history = await this.getHistory();
      
      const existingIndex = history.findIndex(item => item.originalPath === fileInfo.originalPath);
      
      if (existingIndex !== -1) {
        history[existingIndex] = { ...history[existingIndex], ...fileInfo };
      } else {
        history.unshift(fileInfo);
      }
      
      
      const settings = await this.getSettings();
      const maxItems = settings.maxHistoryItems || 100;
      if (history.length > maxItems) {
        history.splice(maxItems);
      }
      
      await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('Error adding to history:', error);
      throw error;
    }
  }

  async deleteFileFromHistory(fileId) {
    try {
      const history = await this.getHistory();
      const updatedHistory = history.filter(item => item.id !== fileId);
      await fs.writeFile(this.historyFile, JSON.stringify(updatedHistory, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Error deleting file from history:', error);
      throw error;
    }
  }

  async clearHistory() {
    try {
      await fs.writeFile(this.historyFile, JSON.stringify([], null, 2));
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  async exportHistory(filePath) {
    try {
      const history = await this.getHistory();
      const settings = await this.getSettings();
      
      const exportData = {
        exportDate: new Date().toISOString(),
        totalFiles: history.length,
        files: history
      };
      
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    } catch (error) {
      console.error('Error exporting history:', error);
      throw error;
    }
  }

  async getSettings() {
    try {
      const data = await fs.readFile(this.settingsFile, 'utf8');
      return { ...this.defaultSettings, ...JSON.parse(data) };
    } catch (error) {
      return this.defaultSettings;
    }
  }

  async saveSettings(settings) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      await fs.writeFile(this.settingsFile, JSON.stringify(updatedSettings, null, 2));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }
}

module.exports = { FileManager };