let isProcessRunning = false;

export function initializeLiveControl() {
    const panel = document.getElementById('live-control');
    panel.innerHTML = `
        <div class="panel-content">
            <div class="form-group">
                <label>YouTube Handle</label>
                <input type="text" id="youtube-handle" placeholder="@username">
            </div>
            
            <div class="form-group">
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
                <button id="fetch-stream">Fetch Livestream</button>
                <button id="start-process">Start</button>
                <button id="stop-process">Stop</button>
            </div>
            
            <div class="console-output">
                <div id="console" class="console"></div>
            </div>
        </div>
    `;

    // Add console toolbar
    const consoleElement = document.getElementById('console');
    const toolbar = createConsoleToolbar(consoleElement);
    consoleElement.parentElement.insertBefore(toolbar, consoleElement);

    // Add event listeners
    document.getElementById('fetch-stream').addEventListener('click', fetchLivestream);
    document.getElementById('start-process').addEventListener('click', startProcess);
    document.getElementById('stop-process').addEventListener('click', stopProcess);

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

    // Also log to browser console
    if (isError) {
        window.console.error(`[AI VTuber] ${text}`);
    } else {
        window.console.log(`[AI VTuber] ${text}`);
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
    const handle = document.getElementById('youtube-handle').value;
    // Implementation will depend on your YouTube API setup
}

async function startProcess() {
    try {
        if (isProcessRunning) {
            appendToConsole('Process is already running', true);
            return;
        }

        const videoId = document.getElementById('video-id').value;
        if (!videoId) {
            appendToConsole('Please enter a Video ID', true);
            return;
        }

        const ttsType = document.getElementById('tts-provider').value;
        const aiProvider = document.getElementById('ai-provider').value;
        
        // Load settings if using Fish TTS
        if (ttsType === 'Fish') {
            const settings = await window.api.loadSettings();
            if (!settings.FISH_data[0].voice_id || !settings.keys[0].FISH_key) {
                appendToConsole('Please configure Fish TTS settings first', true);
                return;
            }
        }

        // Update UI
        document.getElementById('start-process').disabled = true;
        document.getElementById('stop-process').disabled = false;
        isProcessRunning = true;
        appendToConsole('Starting process...');

        await window.api.startProcess({
            videoId,
            ttsType,
            aiProvider
        });
    } catch (error) {
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