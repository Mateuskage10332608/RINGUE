const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs   = require('fs');

const SAVES_DIR = path.join(app.getPath('userData'), 'saves');

function ensureSavesDir() {
  if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR, { recursive: true });
}

// ── IPC: save/load via arquivo ────────────────────────────
ipcMain.on('save', (event, slot, jsonStr) => {
  try {
    ensureSavesDir();
    fs.writeFileSync(path.join(SAVES_DIR, `save_${slot}.json`), jsonStr, 'utf8');
    event.returnValue = { ok: true };
  } catch (e) {
    console.error('[main] erro ao salvar:', e);
    event.returnValue = { ok: false, error: e.message };
  }
});

ipcMain.on('load', (event, slot) => {
  try {
    const file = path.join(SAVES_DIR, `save_${slot}.json`);
    if (!fs.existsSync(file)) { event.returnValue = null; return; }
    event.returnValue = fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.error('[main] erro ao carregar:', e);
    event.returnValue = null;
  }
});

ipcMain.on('list-saves', (event) => {
  try {
    ensureSavesDir();
    const files = fs.readdirSync(SAVES_DIR)
      .filter(f => f.startsWith('save_') && f.endsWith('.json'));
    event.returnValue = files;
  } catch (e) {
    event.returnValue = [];
  }
});

ipcMain.on('delete-save', (event, slot) => {
  try {
    const file = path.join(SAVES_DIR, `save_${slot}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    event.returnValue = { ok: true };
  } catch (e) {
    event.returnValue = { ok: false, error: e.message };
  }
});

// ── Janela ────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'RINGUE — Simulador de Boxe',
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
