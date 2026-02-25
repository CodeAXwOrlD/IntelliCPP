const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const net = require('net');

let mainWindow;

// Disable hardware acceleration to avoid GL/VSync warnings on headless or
// GPU-less environments.
app.disableHardwareAcceleration();

async function createWindow() {
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
    // Check if the dev server is accepting connections before calling
    // loadURL to avoid Electron's "Failed to load URL" warning.
    const devUrl = 'http://localhost:3000';
    const isUp = await new Promise((resolve) => {
      const socket = new net.Socket();
      const onError = () => {
        socket.destroy();
        resolve(false);
      };
      socket.setTimeout(300);
      socket.once('error', onError);
      socket.once('timeout', onError);
      socket.connect(3000, '127.0.0.1', () => {
        socket.end();
        resolve(true);
      });
    });

    if (isUp) {
      mainWindow.loadURL(devUrl).catch((err) => {
        console.warn('Unexpected loadURL error, falling back to built UI:', err.message || err);
        mainWindow.loadFile(path.join(__dirname, 'frontend/build/index.html'));
      });
    } else {
      console.log('Dev server not available, loading built UI');
      mainWindow.loadFile(path.join(__dirname, 'frontend/build/index.html'));
    }
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
  // Try common build output locations for the native module
  const fs = require('fs');
  const candidates = [
    path.join(__dirname, 'dist', 'codeflow_native.node'),
    path.join(__dirname, 'backend', 'dist', 'codeflow_native.node'),
    path.join(__dirname, 'backend', 'build', 'Release', 'codeflow_native.node'),
    path.join(__dirname, 'backend', 'build', 'codeflow_native.node'),
    path.join(__dirname, 'backend', 'codeflow_native.node'),
  ];

  let nativePath = null;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      nativePath = p;
      break;
    }
  }

  if (!nativePath) throw new Error('Native module not found in expected locations');

  const native = require(nativePath);
  suggestionEngine = new native.SuggestionEngine();

  // Load C++ keywords and STL database if present
  const keywordsPath = path.join(__dirname, 'data', 'cpp_keywords.txt');
  const stlPath = path.join(__dirname, 'data', 'stl_functions.json');
  if (fs.existsSync(keywordsPath)) suggestionEngine.loadKeywords(keywordsPath);
  if (fs.existsSync(stlPath)) suggestionEngine.loadSTLData(stlPath);

  console.log('[Backend] Native module loaded from', nativePath);
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

