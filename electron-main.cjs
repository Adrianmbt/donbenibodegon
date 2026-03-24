const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const isDev = !app.isPackaged;

// En builds empaquetados con target "dir", los archivos van a resources/app/
const resourcesDir = isDev
    ? __dirname
    : path.join(path.dirname(process.execPath), 'resources', 'app');

const baseDir = isDev
    ? __dirname
    : (fs.existsSync(path.join(resourcesDir, 'main.py')) ? resourcesDir : __dirname);

const logPath = path.join(app.getPath('userData'), 'backend.log');

let mainWindow;
let backendProcess;

function startBackend() {
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    logStream.write(`\n--- Sesión Iniciada: ${new Date().toLocaleString()} ---\n`);
    logStream.write(`[INFO] baseDir: ${baseDir}\n`);
    logStream.write(`[INFO] __dirname: ${__dirname}\n`);
    logStream.write(`[INFO] execPath: ${process.execPath}\n`);

    const pythonExe = process.platform === 'win32'
        ? path.join(baseDir, 'venv', 'Scripts', 'python.exe')
        : path.join(baseDir, 'venv', 'bin', 'python');

    logStream.write(`[INFO] pythonExe: ${pythonExe}\n`);
    logStream.write(`[INFO] pythonExe exists: ${fs.existsSync(pythonExe)}\n`);

    backendProcess = spawn(pythonExe, ['main.py'], {
        cwd: baseDir,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    backendProcess.stdout.on('data', (data) => logStream.write(`[STDOUT] ${data}`));
    backendProcess.stderr.on('data', (data) => logStream.write(`[STDERR] ${data}`));
    backendProcess.on('error', (err) => logStream.write(`[ERROR] ${err.message}\n`));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1366,
        height: 768,
        title: "Don Beni - Sistema de Gestión",
        backgroundColor: '#0f172a',
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(baseDir, 'logo.jpg')
    });

    if (!isDev) mainWindow.setMenu(null);

    const url = isDev ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:8000';

    const waitForBackend = (retries = 40) => {
        const http = require('http');
        const req = http.get('http://127.0.0.1:8000/', (res) => {
            mainWindow.loadURL(url).catch(() => {});
        });
        req.on('error', () => {
            if (retries > 0) {
                setTimeout(() => waitForBackend(retries - 1), 500);
            } else {
                mainWindow.loadURL(url).catch(() => {});
            }
        });
        req.end();
    };

    waitForBackend();

    mainWindow.once('ready-to-show', () => mainWindow.show());
    if (isDev) mainWindow.webContents.openDevTools();
    mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('ready', () => {
    startBackend();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
    if (backendProcess) backendProcess.kill();
});
