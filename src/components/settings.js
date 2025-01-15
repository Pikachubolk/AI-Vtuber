import { NotificationManager } from '../utils/notifications.js';
import { SetupWizard } from '../utils/setup-wizard.js';

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
            const pythonCommand = await window.api.store.get('pythonCommand', 'py -3.11');
            
            // Update Python command display
            document.getElementById('python-command').value = pythonCommand;
            
            // API Keys
            document.getElementById('el-key').value = settings.keys[0].EL_key || '';
            document.getElementById('fish-key').value = settings.keys[0].FISH_key || '';
            document.getElementById('openai-key').value = settings.keys[0].OPENAI_key || '';
            document.getElementById('gemini-key').value = settings.keys[0].GEMINI_key || '';
            
            // Voice Settings
            document.getElementById('el-voice').value = settings.EL_data[0].voice || '';
            document.getElementById('fish-voice').value = settings.FISH_data[0].voice_id || '';
            
            // Fish Settings
            if (settings.FISH_data[0].settings) {
                document.getElementById('fish-format').value = settings.FISH_data[0].settings.format || 'mp3';
                document.getElementById('fish-mp3-bitrate').value = settings.FISH_data[0].settings.mp3_bitrate || '128';
                document.getElementById('fish-latency').value = settings.FISH_data[0].settings.latency || 'normal';
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
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
        alert('Settings saved successfully!');
    } catch (error) {
        alert('Failed to save settings: ' + error.message);
    }
} 