const { contextBridge, ipcRenderer } = require('electron');
const Store = require('electron-store');

const store = new Store();

contextBridge.exposeInMainWorld('api', {
    // Process management
    startProcess: (args) => ipcRenderer.invoke('start-process', args),
    stopProcess: () => ipcRenderer.invoke('stop-process'),
    onProcessOutput: (callback) => ipcRenderer.on('process-output', callback),
    onProcessError: (callback) => ipcRenderer.on('process-error', callback),
    onProcessExit: (callback) => ipcRenderer.on('process-exit', callback),
    
    // Window controls
    minimize: () => ipcRenderer.invoke('minimize-window'),
    maximize: () => ipcRenderer.invoke('maximize-window'),
    close: () => ipcRenderer.invoke('close-window'),

    // File operations
    loadPrompt: () => ipcRenderer.invoke('load-prompt'),
    savePrompt: (text) => ipcRenderer.invoke('save-prompt', text),
    
    // Settings operations
    loadSettings: () => ipcRenderer.invoke('load-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

    // Setup wizard methods
    store: {
        get: (key, defaultValue) => store.get(key, defaultValue),
        set: (key, value) => store.set(key, value)
    },
    checkPython: () => ipcRenderer.invoke('check-python'),
    testPythonCommand: (cmd) => ipcRenderer.invoke('test-python-command', cmd),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    installDependencies: () => ipcRenderer.invoke('installDependencies'),
    checkPythonVersions: () => ipcRenderer.invoke('checkPythonVersions'),

    // OAuth methods
    startOAuth: (platform) => {
        console.log(`Initiating OAuth for ${platform}`);
        return ipcRenderer.invoke('startOAuth', platform);
    },
    onOAuthUpdate: (callback) => {
        console.log('Registering OAuth update handler');
        return ipcRenderer.on('oauth-update', callback);
    },
    getOAuthStatus: (platform) => ipcRenderer.invoke('getOAuthStatus', platform),
    revokeOAuth: (platform) => ipcRenderer.invoke('revokeOAuth', platform),

    // Add this new method
    getStoredCredentials: (platform) => ipcRenderer.invoke('getStoredCredentials', platform),
}); 