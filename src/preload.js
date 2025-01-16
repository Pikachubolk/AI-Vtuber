// Update the window control handlers
contextBridge.exposeInMainWorld('windowControls', {
    minimize: () => ipcRenderer.invoke('minimize-window'),
    maximize: () => ipcRenderer.invoke('maximize-window'),
    close: () => ipcRenderer.invoke('close-window'),
    isMaximized: () => ipcRenderer.invoke('is-maximized')
});

// Add to existing exposed APIs
contextBridge.exposeInMainWorld('api', {
    // ... existing APIs ...
    
    // OAuth methods
    startOAuth: (platform) => ipcRenderer.invoke('startOAuth', platform),
    onOAuthUpdate: (callback) => ipcRenderer.on('oauth-update', callback),
    getOAuthStatus: (platform) => ipcRenderer.invoke('getOAuthStatus', platform),
    revokeOAuth: (platform) => ipcRenderer.invoke('revokeOAuth', platform)
}); 