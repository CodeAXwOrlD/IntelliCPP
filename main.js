const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Check if we are in dev mode
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'frontend/build/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Load Native Addon
let suggestionEngine;
try {
  const native = require('./backend/build/Release/codeflow_native.node');
  suggestionEngine = new native.SuggestionEngine();
  
  // ✅ Load C++ keywords
  suggestionEngine.loadKeywords(path.join(__dirname, 'data', 'cpp_keywords.txt'));
  
  // ✅ Load STL functions database (RULE 1: Required for STL suggestions)
  suggestionEngine.loadSTLData(path.join(__dirname, 'data', 'stl_functions.json'));
  
  console.log('[Backend] Native module loaded successfully');
  console.log('[Backend] STL data loaded');
} catch (e) {
  console.error('Failed to load native module:', e);
}

// ✅ RULE 1: Get suggestions (validates header includes)
ipcMain.handle('get-suggestions', async (event, prefix, contextType, code, cursorPosition) => {
  if (!suggestionEngine) return [];
  
  return new Promise((resolve) => {
    try {
      // Update symbol table and included libraries
      suggestionEngine.updateSymbols(code);
      
      // Get suggestions (with header validation built-in)
      const suggestions = suggestionEngine.getSuggestions(
        prefix, 
        contextType, 
        code, 
        cursorPosition,
        10  // ✅ RULE 3: Maximum 10 suggestions
      );
      
      resolve(suggestions);
    } catch (err) {
      console.error('[Backend] Error getting suggestions:', err);
      resolve([]);
    }
  });
});

// Get system statistics
ipcMain.handle('get-stats', async (event, code) => {
  if (!suggestionEngine) return { 
    symbolCount: 0, 
    includedLibraries: [],
    symbolTable: {}
  };
  
  return new Promise((resolve) => {
    try {
      suggestionEngine.updateSymbols(code);
      const count = suggestionEngine.getSymbolCount();
      const libs = suggestionEngine.getIncludedLibraries();
      const symbols = suggestionEngine.getSymbolTable();
      
      resolve({ 
        symbolCount: count,
        includedLibraries: libs,
        symbolTable: symbols
      });
    } catch (err) {
      console.error('[Backend] Error getting stats:', err);
      resolve({ 
        symbolCount: 0,
        includedLibraries: [],
        symbolTable: {}
      });
    }
  });
});

