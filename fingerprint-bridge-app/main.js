/**
 * 🚀 ZKTeco Scanner Bridge - Electron Main Process
 * 
 * AUTO-START FINGERPRINT SCANNER FOR WEB SYSTEM
 * 
 * What this does:
 * 1. Starts automatically when Windows starts
 * 2. Runs in system tray (background)
 * 3. Auto-detects ZKTeco scanner when plugged in
 * 4. Provides HTTP API on localhost:3003
 * 5. Works with deployed Vercel web app
 * 
 * User Experience:
 * - Install once
 * - Runs automatically every time PC starts
 * - Just plug in scanner - it works!
 * - Open web app - fingerprint features just work!
 */

const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const notifier = require('node-notifier');

// Import the Express server
const { startServer, stopServer, getServerStatus } = require('./server');

let tray = null;
let mainWindow = null;

// ============================================================================
// AUTO-START WITH WINDOWS
// ============================================================================

const setupAutoStart = () => {
  // Set app to launch at system startup
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
    path: app.getPath('exe')
  });
  
  console.log('✅ Auto-start enabled - will launch at Windows startup');
};

// ============================================================================
// SYSTEM TRAY ICON
// ============================================================================

const createTray = () => {
  // Create tray icon (small icon in taskbar notification area)
  const iconPath = path.join(__dirname, 'icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  
  tray = new Tray(icon);
  tray.setToolTip('ZKTeco Scanner Bridge');
  
  updateTrayMenu();
  
  // Double-click to show window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
};

const updateTrayMenu = () => {
  const status = getServerStatus();
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🔐 ZKTeco Scanner Bridge',
      enabled: false
    },
    { type: 'separator' },
    {
      label: status.running ? '🟢 Server: Running' : '🔴 Server: Stopped',
      enabled: false
    },
    {
      label: status.running ? `📡 Port: ${status.port}` : '📡 Port: Not started',
      enabled: false
    },
    {
      label: status.scanner ? '✅ Scanner: Connected' : '⚠️ Scanner: Not detected',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '📊 Show Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '🔄 Restart Server',
      click: async () => {
        await stopServer();
        await startServer();
        updateTrayMenu();
        showNotification('Server restarted successfully');
      }
    },
    { type: 'separator' },
    {
      label: '🚪 Exit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================

const showNotification = (message, title = 'ZKTeco Bridge') => {
  notifier.notify({
    title: title,
    message: message,
    icon: path.join(__dirname, 'icon.png'),
    sound: false,
    wait: false
  });
};

// ============================================================================
// MAIN WINDOW (Dashboard)
// ============================================================================

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 400,
    show: false, // Start hidden (run in background)
    title: 'ZKTeco Scanner Bridge',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('renderer.html');

  // Hide instead of close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Update tray menu when window is hidden/shown
  mainWindow.on('hide', () => {
    showNotification('Running in background. Right-click system tray icon to access.');
  });
};

// ============================================================================
// SCANNER DETECTION
// ============================================================================

let scannerCheckInterval = null;

const startScannerDetection = () => {
  // Check for scanner every 10 seconds
  scannerCheckInterval = setInterval(async () => {
    const status = getServerStatus();
    const wasConnected = status.scanner;
    
    // Run Python script to check if scanner is connected
    const { spawn } = require('child_process');
    const checkScript = path.join(__dirname, '../employee/Biometric_connect/test_device.py');
    
    const python = spawn('python', [checkScript]);
    
    python.on('close', (code) => {
      const isConnected = code === 0;
      
      if (isConnected && !wasConnected) {
        showNotification('✅ ZKTeco scanner detected and ready!');
        updateTrayMenu();
      } else if (!isConnected && wasConnected) {
        showNotification('⚠️ ZKTeco scanner disconnected');
        updateTrayMenu();
      }
    });
  }, 10000); // Check every 10 seconds
};

// ============================================================================
// APP LIFECYCLE
// ============================================================================

app.whenReady().then(async () => {
  console.log('🚀 Starting ZKTeco Scanner Bridge...');
  
  // Set up auto-start
  setupAutoStart();
  
  // Create system tray icon
  createTray();
  
  // Create hidden window (dashboard)
  createWindow();
  
  // Start Express server
  try {
    await startServer();
    console.log('✅ HTTP server started');
    showNotification('Bridge server started successfully', 'ZKTeco Bridge');
    updateTrayMenu();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    showNotification('Failed to start server: ' + error.message, 'Error');
  }
  
  // Start scanner detection
  startScannerDetection();
  
  // Update tray menu every 30 seconds
  setInterval(updateTrayMenu, 30000);
  
  console.log('✅ ZKTeco Scanner Bridge is ready!');
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit! We want to keep running in background
    // app.quit();
  }
});

// macOS: re-create window when dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Clean up before quit
app.on('before-quit', async () => {
  app.isQuitting = true;
  
  // Stop scanner detection
  if (scannerCheckInterval) {
    clearInterval(scannerCheckInterval);
  }
  
  // Stop server
  await stopServer();
  
  console.log('👋 ZKTeco Scanner Bridge stopped');
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  showNotification('Error: ' + error.message, 'ZKTeco Bridge Error');
});
