import { logger } from '../utils/logger.js';

let isProcessRunning = false;

async function loadSavedCredentials() {
    try {
        const settings = await window.api.loadSettings();
        const youtubeStatus = await window.api.getOAuthStatus('youtube');
        const twitchStatus = await window.api.getOAuthStatus('twitch');
        
        if (youtubeStatus?.username) {
            document.getElementById('youtube-handle').value = youtubeStatus.username;
            document.getElementById('youtube-handle').disabled = true;
        }
        
        if (twitchStatus?.username) {
            document.getElementById('twitch-channel').value = twitchStatus.username;
            document.getElementById('twitch-channel').disabled = true;
        }
    } catch (error) {
        logger.error('Failed to load saved credentials:', error);
    }
}

export function initializeLiveControl() {
    const panel = document.getElementById('live-control');
    panel.innerHTML = `
        <div class="panel-content">
            <div class="platform-selector">
                <label>Platform</label>
                <select id="platform-select">
                    <option value="youtube">YouTube</option>
                    <option value="twitch">Twitch</option>
                </select>
            </div>
            
            <div class="form-group youtube-fields">
                <label>YouTube Channel</label>
                <input type="text" id="youtube-handle" placeholder="@username" disabled>
                <button id="youtube-login" class="secondary-btn">Change Account</button>
            </div>
            
            <div class="form-group twitch-fields" style="display: none;">
                <label>Twitch Channel</label>
                <input type="text" id="twitch-channel" placeholder="channel_name" disabled>
                <button id="twitch-login" class="secondary-btn">Change Account</button>
            </div>
            
            <div class="form-group youtube-fields">
                <label>Video ID</label>
                <input type="text" id="video-id" placeholder="Video ID">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>AI Provider</label>
                    <select id="ai-provider">
                        <option value="openai">OpenAI</option>
                        <option value="gemini">Gemini</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>TTS Provider</label>
                    <select id="tts-provider">
                        <option value="pyttsx3">pyttsx3</option>
                        <option value="EL">ElevenLabs</option>
                        <option value="Fish">Fish</option>
                        <option value="Google">Google</option>
                    </select>
                </div>
            </div>
            
            <div class="button-group">
                <button id="fetch-stream">Fetch Stream</button>
                <button id="start-process">Start</button>
                <button id="stop-process">Stop</button>
            </div>
            
            <div class="console-output">
                <div id="console" class="console"></div>
            </div>
        </div>
    `;

    // Update platform switch handler
    document.getElementById('platform-select').addEventListener('change', (e) => {
        const platform = e.target.value;
        const youtubeFields = document.querySelectorAll('.youtube-fields');
        const twitchFields = document.querySelectorAll('.twitch-fields');
        
        youtubeFields.forEach(el => el.style.display = platform === 'youtube' ? 'block' : 'none');
        twitchFields.forEach(el => el.style.display = platform === 'twitch' ? 'block' : 'none');
    });

    // Add console toolbar
    const consoleElement = document.getElementById('console');
    const toolbar = createConsoleToolbar(consoleElement);
    consoleElement.parentElement.insertBefore(toolbar, consoleElement);

    // Add event listeners
    document.getElementById('fetch-stream').addEventListener('click', () => {
        logger.info('Fetch stream button clicked');
        fetchLivestream();
    });

    document.getElementById('start-process').addEventListener('click', () => {
        logger.info('Start process button clicked');
        startProcess();
    });

    document.getElementById('stop-process').addEventListener('click', () => {
        logger.info('Stop process button clicked');
        stopProcess();
    });

    // Initialize console output handlers
    window.api.onProcessOutput((event, data) => {
        appendToConsole(data);
    });

    window.api.onProcessError((event, data) => {
        appendToConsole(data, true);
    });

    // Initialize button states
    document.getElementById('stop-process').disabled = true;

    // Add process termination handler
    window.api.onProcessExit((event, code) => {
        isProcessRunning = false;
        document.getElementById('start-process').disabled = false;
        document.getElementById('stop-process').disabled = true;
        appendToConsole(`Process exited${code !== 0 ? ` with code ${code}` : ''}`);
    });

    // Add account change handlers
    document.getElementById('youtube-login').addEventListener('click', () => {
        window.api.startOAuth('youtube');
    });
    
    document.getElementById('twitch-login').addEventListener('click', () => {
        window.api.startOAuth('twitch');
    });

    // Load saved credentials
    loadSavedCredentials();

    // Update the OAuth status listener
    window.api.onOAuthUpdate((event, data) => {
        const { platform, status, username } = data;
        if (status === 'connected') {
            if (platform === 'youtube') {
                const input = document.getElementById('youtube-handle');
                input.value = username;
                input.disabled = true;
            } else {
                const input = document.getElementById('twitch-channel');
                input.value = username;
                input.disabled = true;
            }
        }
    });
}

function appendToConsole(text, isError = false) {
    const console = document.getElementById('console');
    const line = document.createElement('div');
    line.className = `console-line ${isError ? 'error' : ''}`;
    
    // Add timestamp
    const timestamp = new Date().toLocaleTimeString();
    line.innerHTML = `<span class="console-timestamp">${timestamp}</span> ${text}`;
    
    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Log to both console and logger
    if (isError) {
        logger.error(text);
    } else {
        logger.info(text);
    }
}

// Add console toolbar
function createConsoleToolbar(consoleElement) {
    const toolbar = document.createElement('div');
    toolbar.className = 'console-toolbar';
    
    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Console';
    clearBtn.onclick = () => {
        consoleElement.innerHTML = '';
    };
    
    // Filter buttons
    const filterContainer = document.createElement('div');
    filterContainer.className = 'console-filters';
    
    const filters = {
        all: 'All',
        error: 'Errors',
        output: 'Output'
    };
    
    Object.entries(filters).forEach(([key, label]) => {
        const filter = document.createElement('label');
        filter.className = 'console-filter';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.onchange = () => updateFilters();
        
        filter.appendChild(checkbox);
        filter.appendChild(document.createTextNode(label));
        filterContainer.appendChild(filter);
    });
    
    toolbar.appendChild(filterContainer);
    toolbar.appendChild(clearBtn);
    
    return toolbar;
}

function updateFilters() {
    const filters = document.querySelectorAll('.console-filter input');
    const lines = document.querySelectorAll('.console-line');
    
    const showAll = filters[0].checked;
    const showErrors = filters[1].checked;
    const showOutput = filters[2].checked;
    
    lines.forEach(line => {
        const isError = line.classList.contains('error');
        const shouldShow = showAll || (isError && showErrors) || (!isError && showOutput);
        line.style.display = shouldShow ? 'block' : 'none';
    });
}

async function fetchLivestream() {
    try {
        const platform = document.getElementById('platform-select').value;
        
        if (platform === 'youtube') {
            await fetchYouTubeStream();
        } else {
            await fetchTwitchStream();
        }
    } catch (error) {
        appendToConsole(error.message, true);
    }
}

async function fetchYouTubeStream() {
    const handle = document.getElementById('youtube-handle').value;
    if (!handle) {
        throw new Error('Please enter a YouTube handle');
    }

    appendToConsole('Fetching YouTube livestream...');
    
    const settings = await window.api.loadSettings();
    const apiKey = settings.keys[0].youtube_api_key;
    
    if (!apiKey) {
        throw new Error('YouTube API key not configured');
    }

    const response = await fetch(
        `https://youtube.googleapis.com/v3/search?part=snippet&channelId=${handle}&eventType=live&type=video&key=${apiKey}`
    );
    
    if (!response.ok) {
        throw new Error('Failed to fetch YouTube stream');
    }

    const data = await response.json();
    if (data.items && data.items.length > 0) {
        const videoId = data.items[0].id.videoId;
        document.getElementById('stream-id').value = videoId;
        appendToConsole(`Found YouTube livestream: ${videoId}`);
    } else {
        appendToConsole('No active YouTube livestream found', true);
    }
}

async function fetchTwitchStream() {
    const channel = document.getElementById('twitch-channel').value;
    if (!channel) {
        throw new Error('Please enter a Twitch channel name');
    }

    appendToConsole('Fetching Twitch stream...');
    
    // Get credentials from stored OAuth data
    const credentials = await window.api.getStoredCredentials('twitch');
    if (!credentials) {
        throw new Error('Please connect your Twitch account first');
    }

    const response = await fetch(
        `https://api.twitch.tv/helix/streams?user_login=${channel}`,
        {
            headers: {
                'Client-ID': 'fplt5252qggml0gepl2x3z7ljnpp2r',
                'Authorization': `Bearer ${credentials.access_token}`
            }
        }
    );
    
    if (!response.ok) {
        throw new Error('Failed to fetch Twitch stream');
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
        appendToConsole(`Found active stream for channel: ${channel}`);
    } else {
        appendToConsole('No active Twitch stream found', true);
    }
}

// Add stream health monitoring
function monitorStreamHealth() {
    let healthCheckInterval;
    
    return {
        start: () => {
            healthCheckInterval = setInterval(async () => {
                try {
                    const videoId = document.getElementById('video-id').value;
                    const response = await fetch(`/api/stream-health/${videoId}`);
                    const health = await response.json();
                    
                    appState.setState('streamHealth', health);
                    updateStreamHealthIndicator(health);
                } catch (error) {
                    console.error('Stream health check failed:', error);
                }
            }, 30000);
        },
        stop: () => {
            clearInterval(healthCheckInterval);
        }
    };
}

async function startProcess() {
    try {
        if (isProcessRunning) {
            logger.warn('Process is already running');
            appendToConsole('Process is already running', true);
            return;
        }

        const platform = document.getElementById('platform-select').value;
        logger.info(`Starting process for platform: ${platform}`);
        
        let streamId;
        if (platform === 'youtube') {
            streamId = document.getElementById('video-id').value;
            if (!streamId) {
                logger.error('No YouTube Video ID provided');
                appendToConsole('Please enter a Video ID', true);
                return;
            }
        } else {
            const channel = document.getElementById('twitch-channel').value;
            if (!channel) {
                logger.error('No Twitch channel provided');
                appendToConsole('Please enter a Twitch channel name', true);
                return;
            }
            streamId = channel;
        }

        const ttsType = document.getElementById('tts-provider').value;
        const aiProvider = document.getElementById('ai-provider').value;
        
        logger.info(`Configuration - TTS: ${ttsType}, AI: ${aiProvider}, Stream ID: ${streamId}`);
        
        // Update UI
        document.getElementById('start-process').disabled = true;
        document.getElementById('stop-process').disabled = false;
        isProcessRunning = true;
        appendToConsole('Starting process...');

        const result = await window.api.startProcess({
            platform,
            streamId,
            ttsType,
            aiProvider
        });

        logger.info('Process started successfully', result);
    } catch (error) {
        logger.error('Failed to start process:', error);
        appendToConsole(error.message, true);
        isProcessRunning = false;
        document.getElementById('start-process').disabled = false;
        document.getElementById('stop-process').disabled = true;
    }
}

async function stopProcess() {
    try {
        if (!isProcessRunning) {
            appendToConsole('No process is running', true);
            return;
        }

        appendToConsole('Stopping process...');
        await window.api.stopProcess();
        isProcessRunning = false;
        document.getElementById('start-process').disabled = false;
        document.getElementById('stop-process').disabled = true;
        appendToConsole('Process stopped');
    } catch (error) {
        appendToConsole(error.message, true);
    }
} 