import { NotificationManager } from '../utils/notifications.js';
import { SetupWizard } from '../utils/setup-wizard.js';
import { logger } from '../utils/logger.js';

// Create a notification manager instance at the module level
const notifications = new NotificationManager();

export function initializeSettings() {
    const panel = document.getElementById('settings');
    panel.innerHTML = `
        <div class="panel-content">
            <div class="settings-tabs">
                <button class="tab-button active" data-tab="api-keys">API Keys</button>
                <button class="tab-button" data-tab="voice">Voice Settings</button>
                <button class="tab-button" data-tab="system">System</button>
            </div>
            
            <div class="tab-content active" id="api-keys">
                <div class="form-group">
                    <label>OpenAI API Key</label>
                    <div class="input-group">
                        <input type="password" id="openai-key" class="api-key">
                        <button class="toggle-visibility">👁</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Gemini API Key</label>
                    <div class="input-group">
                        <input type="password" id="gemini-key" class="api-key">
                        <button class="toggle-visibility">👁</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>ElevenLabs API Key</label>
                    <div class="input-group">
                        <input type="password" id="el-key" class="api-key">
                        <button class="toggle-visibility">👁</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Fish API Key</label>
                    <div class="input-group">
                        <input type="password" id="fish-key" class="api-key">
                        <button class="toggle-visibility">👁</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Platform Authentication</label>
                    <div class="oauth-section">
                        <button id="youtube-auth" class="oauth-button" data-platform="youtube">
                            <span class="icon">🎥</span>
                            Connect YouTube
                        </button>
                        <span id="youtube-status" class="oauth-status">Not Connected</span>
                    </div>
                    <div class="oauth-section">
                        <button id="twitch-auth" class="oauth-button" data-platform="twitch">
                            <span class="icon">📺</span>
                            Connect Twitch
                        </button>
                        <span id="twitch-status" class="oauth-status">Not Connected</span>
                    </div>
                    <p class="oauth-help">Connect your accounts to automatically configure API access</p>
                </div>
            </div>
            
            <div class="tab-content" id="voice">
                <div class="form-group">
                    <label>ElevenLabs Voice ID</label>
                    <input type="text" id="el-voice">
                </div>
                <div class="form-group">
                    <label>Fish Voice ID</label>
                    <input type="text" id="fish-voice">
                </div>
                <div class="form-group">
                    <label>Fish Voice Settings</label>
                    <div class="sub-group">
                        <label>Format</label>
                        <select id="fish-format">
                            <option value="wav">WAV</option>
                            <option value="mp3" selected>MP3</option>
                            <option value="opus">Opus</option>
                        </select>
                    </div>
                    <div class="sub-group">
                        <label>MP3 Bitrate</label>
                        <select id="fish-mp3-bitrate">
                            <option value="64">64 kbps</option>
                            <option value="128" selected>128 kbps</option>
                            <option value="192">192 kbps</option>
                        </select>
                    </div>
                    <div class="sub-group">
                        <label>Latency Mode</label>
                        <select id="fish-latency">
                            <option value="normal" selected>Normal</option>
                            <option value="balanced">Balanced</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="tab-content" id="system">
                <div class="settings-card">
                    <h3>System Settings</h3>
                    <div class="form-group">
                        <label>Python Command</label>
                        <div class="input-group">
                            <input type="text" id="python-command" readonly>
                            <button id="change-python" class="secondary-btn">Change</button>
                        </div>
                        <small class="help-text">Current Python command used to run scripts</small>
                    </div>
                    <div class="button-group">
                        <button id="rerun-setup" class="secondary-btn">Re-run Setup Wizard</button>
                        <button id="check-python" class="secondary-btn">Check Python Installation</button>
                    </div>
                </div>
            </div>
            
            <div class="button-group">
                <button id="save-settings">Save Settings</button>
            </div>
        </div>
    `;

    // Add event listeners
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    document.querySelectorAll('.toggle-visibility').forEach(button => {
        button.addEventListener('click', (e) => toggleVisibility(e));
    });

    document.getElementById('save-settings').addEventListener('click', saveSettings);

    // Initialize OAuth handlers
    initializeOAuth();

    // Load initial settings
    loadSettings();

    // Add event listeners for new buttons
    document.getElementById('rerun-setup').addEventListener('click', () => {
        const setupWizard = new SetupWizard(notifications);
        setupWizard.showSetupWizard(true);
    });
    
    document.getElementById('check-python').addEventListener('click', async () => {
        const version = await window.api.checkPython();
        if (version) {
            notifications.show(`Python ${version} found!`, 'success');
        } else {
            notifications.show('Python not found or version check failed.', 'error');
        }
    });

    // Add event listener for change-python button
    document.getElementById('change-python').addEventListener('click', () => {
        const setupWizard = new SetupWizard(notifications);
        setupWizard.showSetupWizard(true);
    });

    // Update loadSettings to show current Python command
    async function loadSettings() {
        try {
            const settings = await window.api.loadSettings();
            
            // Ensure settings object has the required structure
            const defaultSettings = {
                keys: [{
                    EL_key: '',
                    FISH_key: '',
                    OPENAI_key: '',
                    GEMINI_key: ''
                }],
                EL_data: [{
                    voice: ''
                }],
                FISH_data: [{
                    voice_id: '',
                    settings: {
                        format: 'mp3',
                        mp3_bitrate: 128,
                        latency: 'normal'
                    }
                }]
            };

            // Merge default settings with loaded settings
            const mergedSettings = {
                ...defaultSettings,
                ...settings,
                keys: [{ ...defaultSettings.keys[0], ...(settings?.keys?.[0] || {}) }],
                EL_data: [{ ...defaultSettings.EL_data[0], ...(settings?.EL_data?.[0] || {}) }],
                FISH_data: [{
                    ...defaultSettings.FISH_data[0],
                    ...(settings?.FISH_data?.[0] || {}),
                    settings: {
                        ...defaultSettings.FISH_data[0].settings,
                        ...(settings?.FISH_data?.[0]?.settings || {})
                    }
                }]
            };

            // Update Python command display
            const pythonCommand = await window.api.store.get('pythonCommand', 'py -3.11');
            document.getElementById('python-command').value = pythonCommand;
            
            // API Keys
            document.getElementById('el-key').value = mergedSettings.keys[0].EL_key || '';
            document.getElementById('fish-key').value = mergedSettings.keys[0].FISH_key || '';
            document.getElementById('openai-key').value = mergedSettings.keys[0].OPENAI_key || '';
            document.getElementById('gemini-key').value = mergedSettings.keys[0].GEMINI_key || '';
            
            // Voice Settings
            document.getElementById('el-voice').value = mergedSettings.EL_data[0].voice || '';
            document.getElementById('fish-voice').value = mergedSettings.FISH_data[0].voice_id || '';
            
            // Fish Settings
            if (mergedSettings.FISH_data[0].settings) {
                document.getElementById('fish-format').value = mergedSettings.FISH_data[0].settings.format || 'mp3';
                document.getElementById('fish-mp3-bitrate').value = mergedSettings.FISH_data[0].settings.mp3_bitrate || '128';
                document.getElementById('fish-latency').value = mergedSettings.FISH_data[0].settings.latency || 'normal';
            }
            
            logger.info('Settings loaded successfully');
        } catch (error) {
            logger.error('Failed to load settings:', error);
            notifications.show('Failed to load settings', 'error');
        }
    }

    loadSettings();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
}

function toggleVisibility(event) {
    const input = event.target.previousElementSibling;
    input.type = input.type === 'password' ? 'text' : 'password';
}

async function saveSettings() {
    try {
        const currentSettings = await window.api.loadSettings();
        
        const settings = {
            ...currentSettings,
            keys: [{
                ...currentSettings.keys[0],
                EL_key: document.getElementById('el-key').value,
                FISH_key: document.getElementById('fish-key').value,
                OPENAI_key: document.getElementById('openai-key').value,
                GEMINI_key: document.getElementById('gemini-key').value
            }],
            EL_data: [{
                voice: document.getElementById('el-voice').value
            }],
            FISH_data: [{
                voice_id: document.getElementById('fish-voice').value,
                settings: {
                    format: document.getElementById('fish-format').value,
                    mp3_bitrate: parseInt(document.getElementById('fish-mp3-bitrate').value),
                    latency: document.getElementById('fish-latency').value
                }
            }]
        };
        
        await window.api.saveSettings(settings);
        notifications.show('Settings saved successfully!', 'success');
    } catch (error) {
        notifications.show('Failed to save settings: ' + error.message, 'error');
    }
}

// Update the OAuth initialization
function initializeOAuth() {
    const authButtons = document.querySelectorAll('.oauth-button');
    
    authButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const platform = button.dataset.platform;
            try {
                logger.info(`Attempting to connect to ${platform}`);
                button.classList.add('loading');
                button.disabled = true;
                
                const result = await window.api.startOAuth(platform);
                logger.info(`OAuth result for ${platform}:`, result);
            } catch (error) {
                logger.error(`Failed to connect to ${platform}:`, error);
                notifications.show(`Failed to connect ${platform}: ${error.message}`, 'error');
            } finally {
                button.classList.remove('loading');
                button.disabled = false;
            }
        });
    });

    // Listen for OAuth status updates
    window.api.onOAuthUpdate((event, data) => {
        logger.info('OAuth status update:', data);
        const { platform, status, username } = data;
        const statusEl = document.getElementById(`${platform}-status`);
        const button = document.querySelector(`.oauth-button[data-platform="${platform}"]`);
        
        if (status === 'connected') {
            statusEl.textContent = `Connected as ${username}`;
            statusEl.classList.add('connected');
            button.textContent = 'Reconnect';
            notifications.show(`Successfully connected to ${platform}!`, 'success');
        } else {
            statusEl.textContent = 'Not Connected';
            statusEl.classList.remove('connected');
            button.textContent = `Connect ${platform}`;
        }
    });
} 