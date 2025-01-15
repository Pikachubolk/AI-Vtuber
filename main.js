const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');
const fs = require('fs').promises;

const store = new Store();
let mainWindow;
let pythonProcess = null;

const isDev = process.argv.includes('--dev');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1000,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        frame: false,
        backgroundColor: '#1a1a1a'
    });

    mainWindow.loadFile('src/index.html');

    if (isDev) {
        mainWindow.webContents.openDevTools();
        // Enable live reload in dev mode
        mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.send('dev-mode', true);
        });
    }
}

app.whenReady().then(async () => {
    // Create necessary directories
    try {
        await fs.mkdir('instructions', { recursive: true });
        
        // Create prompt.txt if it doesn't exist
        const promptPath = path.join('instructions', 'prompt.txt');
        try {
            await fs.access(promptPath);
        } catch {
            await fs.writeFile(promptPath, 'Default prompt text here...');
        }
        
        // Create config.json if it doesn't exist
        try {
            await fs.access('config.json');
        } catch {
            const defaultConfig = {
                keys: [{
                    EL_key: '',
                    FISH_key: '',
                    OPENAI_key: '',
                    GEMINI_key: '',
                    youtube_api_key: ''
                }],
                EL_data: [{ voice: '' }],
                FISH_data: [{
                    voice_id: '',
                    settings: {
                        format: 'mp3',
                        mp3_bitrate: 128,
                        latency: 'normal'
                    }
                }],
                model_settings: {
                    OPENAI: {
                        model: 'gpt-4-turbo-preview',
                        temperature: 0.7,
                        max_tokens: 150,
                        top_p: 1.0,
                        frequency_penalty: 0.0,
                        presence_penalty: 0.0
                    },
                    GEMINI: {
                        model: 'gemini-1.5-pro',
                        temperature: 0.75,
                        top_p: 0.95,
                        top_k: 64,
                        max_output_tokens: 128
                    }
                },
                app_settings: {
                    theme: 'dark',
                    auto_save: true,
                    auto_fetch_streams: true,
                    check_updates: true,
                    console_max_lines: 1000,
                    default_ai: 'GEMINI',
                    default_tts: 'ElevenLabs'
                }
            };
            await fs.writeFile('config.json', JSON.stringify(defaultConfig, null, 4));
        }
    } catch (error) {
        console.error('Failed to create necessary files:', error);
    }

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Add file watching in dev mode
if (isDev) {
    const watchFiles = () => {
        const watcher = require('fs').watch(path.join(__dirname, 'src'), { recursive: true }, 
            (eventType, filename) => {
                if (mainWindow) {
                    mainWindow.webContents.reloadIgnoringCache();
                }
            });

        app.on('before-quit', () => watcher.close());
    };
    watchFiles();
}

// Window control handlers
ipcMain.handle('minimize-window', () => {
    mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.handle('close-window', () => {
    app.quit();
});

// File operations
ipcMain.handle('load-prompt', async () => {
    try {
        const fs = require('fs').promises;
        const promptText = await fs.readFile('instructions/prompt.txt', 'utf8');
        return promptText;
    } catch (error) {
        console.error('Failed to load prompt:', error);
        return 'Error loading prompt. Please check if the file exists.';
    }
});

ipcMain.handle('save-prompt', async (event, promptText) => {
    try {
        const fs = require('fs').promises;
        await fs.writeFile('instructions/prompt.txt', promptText);
        return true;
    } catch (error) {
        console.error('Failed to save prompt:', error);
        throw error;
    }
});

// Settings operations
ipcMain.handle('load-settings', async () => {
    try {
        const fs = require('fs').promises;
        const settings = await fs.readFile('config.json', 'utf8');
        return JSON.parse(settings);
    } catch (error) {
        console.error('Failed to load settings:', error);
        return {
            keys: [{
                EL_key: '',
                FISH_key: '',
                OPENAI_key: '',
                GEMINI_key: '',
                youtube_api_key: ''
            }],
            EL_data: [{ voice: '' }],
            FISH_data: [{
                voice_id: '',
                settings: {
                    format: 'mp3',
                    mp3_bitrate: 128,
                    latency: 'normal'
                }
            }]
        };
    }
});

ipcMain.handle('save-settings', async (event, settings) => {
    try {
        const fs = require('fs').promises;
        await fs.writeFile('config.json', JSON.stringify(settings, null, 4));
        return true;
    } catch (error) {
        console.error('Failed to save settings:', error);
        throw error;
    }
});

// Python process management
ipcMain.handle('start-process', async (event, args) => {
    if (pythonProcess) {
        throw new Error('Process already running');
    }

    const store = new Store();
    const pythonCmd = store.get('pythonCommand', 'py -3.11');
    const [cmd, ...cmdArgs] = pythonCmd.split(' ');

    try {
        // Install dependencies first
        await new Promise((resolve, reject) => {
            const installProcess = spawn(cmd, [
                ...cmdArgs,
                '-m', 'pip', 'install', '-r', 'requirements.txt'
            ], {
                cwd: __dirname,
                shell: true
            });

            // Forward installation logs
            installProcess.stdout.on('data', (data) => {
                mainWindow.webContents.send('process-output', `[pip] ${data.toString()}`);
            });

            installProcess.stderr.on('data', (data) => {
                mainWindow.webContents.send('process-error', `[pip] ${data.toString()}`);
            });

            installProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Dependencies installation failed with code ${code}`));
                }
            });
        });

        // Start the actual process
        pythonProcess = spawn(cmd, [
            ...cmdArgs,
            'run.py',
            '--video_id', args.videoId,
            '--tts_type', args.ttsType,
            '--ai_provider', args.aiProvider
        ], {
            cwd: __dirname,
            shell: true
        });

        // Forward process output
        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('[Python]', output);
            mainWindow.webContents.send('process-output', output);
        });

        pythonProcess.stderr.on('data', (data) => {
            const error = data.toString();
            console.error('[Python Error]', error);
            mainWindow.webContents.send('process-error', error);
        });

        pythonProcess.on('error', (error) => {
            console.error('[Process Error]', error.message);
            mainWindow.webContents.send('process-error', `Failed to start process: ${error.message}`);
        });

        pythonProcess.on('exit', (code, signal) => {
            if (code !== 0) {
                const message = `Process exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`;
                console.error('[Process Exit]', message);
                mainWindow.webContents.send('process-error', message);
            }
            pythonProcess = null;
        });

        return true;
    } catch (error) {
        console.error('[Process Start Error]', error.message);
        mainWindow.webContents.send('process-error', error.message);
        throw error;
    }
});

ipcMain.handle('stop-process', async () => {
    if (pythonProcess) {
        // On Windows, we need to kill the process group
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']);
        } else {
            pythonProcess.kill('SIGTERM');
        }
        pythonProcess = null;
        return true;
    }
    return false;
});

ipcMain.handle('check-python', async () => {
    try {
        const { execSync } = require('child_process');
        const output = execSync('python --version').toString();
        const version = output.match(/Python (\d+\.\d+\.\d+)/);
        return version ? version[1] : null;
    } catch (error) {
        return null;
    }
});

ipcMain.handle('test-python-command', async (event, cmd) => {
    try {
        const { execSync } = require('child_process');
        execSync(`${cmd} --version`);
        return true;
    } catch (error) {
        return false;
    }
});

ipcMain.handle('open-external', (event, url) => {
    require('electron').shell.openExternal(url);
});

// Add this with your other IPC handlers
ipcMain.handle('installDependencies', async () => {
    try {
        const store = new Store();
        const pythonCmd = store.get('pythonCommand', 'py -3.11');
        const [cmd, ...cmdArgs] = pythonCmd.split(' ');
        
        const result = await new Promise((resolve, reject) => {
            const childProcess = spawn(cmd, [
                ...cmdArgs,
                '-m', 'pip', 'install', '-r', 'requirements.txt'
            ], {
                cwd: __dirname,
                shell: true
            });

            let output = '';
            childProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            childProcess.stderr.on('data', (data) => {
                output += data.toString();
            });

            childProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Process exited with code ${code}\n${output}`));
                }
            });
        });
        
        return true;
    } catch (error) {
        console.error('Failed to install dependencies:', error);
        throw error;
    }
});

// Add this new IPC handler
ipcMain.handle('checkPythonVersions', async () => {
    const versions = [];
    const { execSync } = require('child_process');
    
    // Check py launcher versions
    try {
        const output = execSync('py -0').toString();
        const matches = output.matchAll(/^-V:([0-9.]+)\s/gm);
        for (const match of matches) {
            const version = match[1];
            if (version.startsWith('3.') && parseFloat(version.substr(2)) >= 10) {
                versions.push({
                    version,
                    command: `py -${version}`
                });
            }
        }
    } catch (error) {
        console.log('Python launcher not available');
    }
    
    // Check python3 command
    try {
        const output = execSync('python3 --version').toString();
        const match = output.match(/Python ([0-9.]+)/);
        if (match && parseFloat(match[1].substr(2)) >= 10) {
            versions.push({
                version: match[1],
                command: 'python3'
            });
        }
    } catch (error) {
        console.log('python3 command not available');
    }
    
    // Check python command
    try {
        const output = execSync('python --version').toString();
        const match = output.match(/Python ([0-9.]+)/);
        if (match && parseFloat(match[1].substr(2)) >= 10) {
            versions.push({
                version: match[1],
                command: 'python'
            });
        }
    } catch (error) {
        console.log('python command not available');
    }
    
    return versions;
}); 