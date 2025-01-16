const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');
const fs = require('fs').promises;
const { OAuth2Client } = require('google-auth-library');
const { AuthorizationCode } = require('simple-oauth2');
const express = require('express');
const http = require('http');

// Configure electron-store
Store.initRenderer();

const store = new Store({
    name: 'config',
    fileExtension: 'json',
    clearInvalidConfig: true,
    defaults: {
        // Your default config here
    }
});

let mainWindow;
let pythonProcess = null;
let oauthWindow = null;

const isDev = process.argv.includes('--dev');

// OAuth configurations
const OAUTH_CONFIG = {
    youtube: {
        clientId: 'YOUR_YOUTUBE_CLIENT_ID',
        redirectUri: 'http://localhost:3000/oauth/youtube/callback',
        scope: [
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube.force-ssl'
        ].join(' ')
    },
    twitch: {
        clientId: 'fplt5252qggml0gepl2x3z7ljnpp2r',
        redirectUri: 'http://localhost:3000/oauth/twitch/callback',
        scope: 'channel:read:stream_key chat:read chat:edit'
    }
};

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
        backgroundColor: '#1a1a1a',
        show: false
    });

    mainWindow.loadFile('src/index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
        mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.send('dev-mode', true);
        });
    }

    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-state-change', 'maximized');
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-state-change', 'normal');
    });
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
        console.error('Process already running');
        throw new Error('Process already running');
    }

    const store = new Store();
    const pythonCmd = store.get('pythonCommand', 'py -3.11');
    const [cmd, ...cmdArgs] = pythonCmd.split(' ');

    console.log('Starting process with command:', pythonCmd);
    console.log('Arguments:', args);

    try {
        // Start the Python process directly (no dependency installation)
        pythonProcess = spawn(cmd, [
            ...cmdArgs,
            'run.py',
            '--platform', args.platform,
            '--stream_id', args.streamId,
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
            const message = `Process exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`;
            console.log('[Process Exit]', message);
            if (code !== 0) {
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
    const store = new Store();
    const pythonCmd = store.get('pythonCommand', 'py -3.11');
    const [cmd, ...cmdArgs] = pythonCmd.split(' ');

    console.log('Installing dependencies...');
    
    return new Promise((resolve, reject) => {
        const installProcess = spawn(cmd, [
            ...cmdArgs,
            '-m', 'pip', 'install', '-r', 'requirements.txt'
        ], {
            cwd: __dirname,
            shell: true
        });

        installProcess.stdout.on('data', (data) => {
            console.log('[pip]', data.toString());
        });

        installProcess.stderr.on('data', (data) => {
            console.error('[pip error]', data.toString());
        });

        installProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Dependencies installed successfully');
                resolve();
            } else {
                const error = `Dependencies installation failed with code ${code}`;
                console.error(error);
                reject(new Error(error));
            }
        });
    });
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

ipcMain.handle('is-maximized', () => {
    return mainWindow.isMaximized();
});

// OAuth server setup
function setupOAuthServer() {
    const port = 3000;
    
    app.get('/oauth/:platform/callback', async (req, res) => {
        const { platform } = req.params;
        const { code } = req.query;
        
        try {
            let tokens;
            if (platform === 'youtube') {
                tokens = await handleYouTubeCallback(code);
            } else {
                tokens = await handleTwitchCallback(code);
            }
            
            // Store tokens securely
            await store.set(`${platform}_tokens`, tokens);
            
            // Update UI
            mainWindow.webContents.send('oauth-update', {
                platform,
                status: 'connected',
                username: await getUserInfo(platform, tokens)
            });
            
            // Close OAuth window
            if (oauthWindow) {
                oauthWindow.close();
                oauthWindow = null;
            }
            
            res.send('<script>window.close();</script>');
        } catch (error) {
            console.error('OAuth error:', error);
            res.status(500).send('Authentication failed');
        }
    });
    
    server.listen(port, () => {
        console.log(`OAuth server listening on port ${port}`);
    });
}

// Add OAuth handlers
ipcMain.handle('startOAuth', async (event, platform) => {
    console.log(`OAuth request received for ${platform}`);
    const config = OAUTH_CONFIG[platform];
    let authUrl;
    
    try {
        if (platform === 'youtube') {
            authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${config.clientId}&` +
                `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
                `response_type=token&` +
                `scope=${encodeURIComponent(config.scope)}`;
        } else {
            authUrl = `https://id.twitch.tv/oauth2/authorize?` +
                `client_id=${config.clientId}&` +
                `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
                `response_type=token&` +
                `scope=${encodeURIComponent(config.scope)}`;
        }
        
        console.log(`Opening OAuth URL for ${platform}:`, authUrl);
        
        // Create OAuth window
        oauthWindow = new BrowserWindow({
            width: 800,
            height: 600,
            parent: mainWindow,
            modal: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        
        // Handle the redirect and extract token from URL
        oauthWindow.webContents.on('will-navigate', handleOAuthRedirect);
        oauthWindow.webContents.on('will-redirect', handleOAuthRedirect);
        
        await oauthWindow.loadURL(authUrl);
        console.log(`OAuth window opened for ${platform}`);
        return true;
    } catch (error) {
        console.error(`OAuth error for ${platform}:`, error);
        if (oauthWindow) {
            oauthWindow.close();
            oauthWindow = null;
        }
        throw error;
    }
});

// Handle OAuth redirects
async function handleOAuthRedirect(event, url) {
    try {
        const urlObj = new URL(url);
        
        if (url.startsWith('http://localhost:3000/oauth')) {
            const platform = url.includes('youtube') ? 'youtube' : 'twitch';
            const params = new URLSearchParams(urlObj.hash.slice(1) || urlObj.search);
            const accessToken = params.get('access_token');
            
            if (accessToken) {
                // Store the credentials in electron-store
                await store.set(`${platform}_credentials`, {
                    access_token: accessToken,
                    timestamp: Date.now()
                });
                
                // Also save to a local file that Python can easily access
                const credentials = {
                    access_token: accessToken,
                    timestamp: Date.now()
                };
                
                await fs.writeFile('electron-store.json', JSON.stringify({
                    twitch_credentials: credentials
                }, null, 2));
                
                const userInfo = await getUserInfo(platform, { access_token: accessToken });
                await store.set(`${platform}_username`, userInfo.username);
                
                mainWindow.webContents.send('oauth-update', {
                    platform,
                    status: 'connected',
                    username: userInfo.username
                });
                
                if (oauthWindow) {
                    oauthWindow.close();
                    oauthWindow = null;
                }
            }
        }
    } catch (error) {
        console.error('OAuth redirect error:', error);
        mainWindow.webContents.send('oauth-update', {
            platform: 'unknown',
            status: 'error',
            error: error.message
        });
    }
}

// Update user info fetching
async function getUserInfo(platform, tokens) {
    try {
        if (platform === 'youtube') {
            const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`
                }
            });
            const data = await response.json();
            
            // Store the credentials
            const settings = await store.get('settings', {});
            settings.keys = settings.keys || [{}];
            settings.keys[0] = {
                ...settings.keys[0],
                youtube_api_key: tokens.access_token
            };
            await store.set('settings', settings);
            
            return {
                username: data.items[0].snippet.title,
                channelId: data.items[0].id
            };
        } else {
            const response = await fetch('https://api.twitch.tv/helix/users', {
                headers: {
                    'Client-ID': OAUTH_CONFIG.twitch.clientId,
                    'Authorization': `Bearer ${tokens.access_token}`
                }
            });
            const data = await response.json();
            
            // Only store username, token is already stored in electron-store
            return {
                username: data.data[0].display_name,
                userId: data.data[0].id
            };
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
        throw error;
    }
}

// Add a method to check OAuth status
ipcMain.handle('getOAuthStatus', async (event, platform) => {
    try {
        const credentials = await store.get(`${platform}_credentials`);
        const username = await store.get(`${platform}_username`);
        
        if (credentials && username) {
            return {
                status: 'connected',
                username,
                access_token: credentials.access_token
            };
        }
        return null;
    } catch (error) {
        console.error(`Failed to get ${platform} OAuth status:`, error);
        return null;
    }
});

// Add a new handler to get stored credentials
ipcMain.handle('getStoredCredentials', async (event, platform) => {
    try {
        return await store.get(`${platform}_credentials`);
    } catch (error) {
        console.error(`Failed to get ${platform} credentials:`, error);
        return null;
    }
}); 