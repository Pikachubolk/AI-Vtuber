export function createStatusBar(container) {
    const statusBar = document.createElement('div');
    statusBar.className = 'status-bar';
    
    const leftSection = document.createElement('div');
    leftSection.className = 'status-left';
    
    const aiStatus = document.createElement('span');
    aiStatus.id = 'ai-status';
    aiStatus.className = 'status-item';
    aiStatus.innerHTML = '🤖 AI: Ready';
    
    const ttsStatus = document.createElement('span');
    ttsStatus.id = 'tts-status';
    ttsStatus.className = 'status-item';
    ttsStatus.innerHTML = '🔊 TTS: Ready';
    
    const rightSection = document.createElement('div');
    rightSection.className = 'status-right';
    
    const memoryUsage = document.createElement('span');
    memoryUsage.id = 'memory-usage';
    memoryUsage.className = 'status-item';
    
    leftSection.appendChild(aiStatus);
    leftSection.appendChild(ttsStatus);
    rightSection.appendChild(memoryUsage);
    
    statusBar.appendChild(leftSection);
    statusBar.appendChild(rightSection);
    
    container.appendChild(statusBar);
    
    return {
        updateAIStatus: (status, isError = false) => {
            aiStatus.innerHTML = `🤖 AI: ${status}`;
            aiStatus.className = `status-item ${isError ? 'error' : ''}`;
        },
        updateTTSStatus: (status, isError = false) => {
            ttsStatus.innerHTML = `🔊 TTS: ${status}`;
            ttsStatus.className = `status-item ${isError ? 'error' : ''}`;
        },
        updateMemoryUsage: (usage) => {
            memoryUsage.innerHTML = `📊 Memory: ${usage}`;
        }
    };
} 