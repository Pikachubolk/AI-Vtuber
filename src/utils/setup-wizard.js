export class SetupWizard {
    constructor(notificationManager) {
        this.notifications = notificationManager;
        this.store = window.api.store;
        this.setupComplete = false;
        this.pythonVersions = [];
        
        // Bind methods
        this.handleEscape = this.handleEscape.bind(this);
        
        // Add escape key handler
        document.addEventListener('keydown', this.handleEscape);
    }

    getWizardHTML() {
        return `
            <div class="setup-wizard">
                <h2>AI VTuber Setup</h2>
                <div class="setup-step" id="python-check">
                    <h3>1. Python Installation</h3>
                    <div class="setup-content">
                        <p>We need Python 3.10 or higher to run.</p>
                        <div class="status-indicator" id="python-status">
                            <span class="status-icon">⏳</span>
                            <span class="status-text">Checking Python...</span>
                        </div>
                        <div class="python-versions" style="display: none;">
                            <p>Found Python versions:</p>
                            <div id="version-list" class="version-list"></div>
                        </div>
                        <div class="button-group">
                            <button class="wizard-btn" id="check-python">Check Python Installation</button>
                            <button class="wizard-btn" id="install-python">Download Python</button>
                        </div>
                    </div>
                </div>
                
                <div class="setup-step" id="python-command">
                    <h3>2. Python Command</h3>
                    <div class="setup-content">
                        <p>Select or enter the Python command to use:</p>
                        <div class="input-group">
                            <input type="text" id="python-cmd" class="setup-input" 
                                   placeholder="e.g., py -3.11, python3, python">
                            <button class="wizard-btn" id="test-python">Test</button>
                        </div>
                        <div class="status-indicator" id="command-status">
                            <span class="status-icon">⏳</span>
                            <span class="status-text">Not tested</span>
                        </div>
                        <div class="quick-commands">
                            <button class="quick-cmd-btn" data-cmd="py -3.11">py -3.11</button>
                            <button class="quick-cmd-btn" data-cmd="python3">python3</button>
                            <button class="quick-cmd-btn" data-cmd="python">python</button>
                        </div>
                    </div>
                </div>
                
                <div class="setup-step" id="dependencies">
                    <h3>3. Dependencies</h3>
                    <div class="setup-content">
                        <p>Install required Python packages:</p>
                        <div class="status-indicator" id="deps-status">
                            <span class="status-icon">⏳</span>
                            <span class="status-text">Not installed</span>
                        </div>
                        <div class="deps-progress" style="display: none;">
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <div class="progress-text">Installing...</div>
                        </div>
                        <button class="wizard-btn" id="install-deps">Install Dependencies</button>
                    </div>
                </div>

                <div class="setup-step" id="finish">
                    <h3>4. Finish Setup</h3>
                    <div class="setup-content">
                        <div class="setup-summary"></div>
                        <button class="wizard-btn primary" id="complete-setup">Complete Setup</button>
                    </div>
                </div>
            </div>
        `;
    }

    async showSetupWizard(force = false) {
        if (this.setupComplete && !force) return;
        
        // Remove existing wizard and overlay
        document.querySelector('.setup-wizard')?.remove();
        document.querySelector('.setup-overlay')?.remove();

        // Add overlay first
        const overlay = document.createElement('div');
        overlay.className = 'setup-overlay';
        document.body.appendChild(overlay);

        // Add wizard
        document.body.insertAdjacentHTML('beforeend', this.getWizardHTML());
        
        // Initialize event listeners
        await this.attachEventListeners();
        
        // Add quick command event listeners
        document.querySelectorAll('.quick-cmd-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('python-cmd').value = btn.dataset.cmd;
                document.getElementById('test-python').click();
            });
        });
        
        // Auto-check Python on start
        document.getElementById('check-python').click();
        await this.checkPythonVersions();
    }

    async checkFirstRun() {
        const isFirstRun = await this.store.get('firstRun', true);
        const pythonCommand = await this.store.get('pythonCommand', null);
        
        if (isFirstRun || !pythonCommand) {
            await this.showSetupWizard();
        }
    }

    async checkPythonVersions() {
        const versions = await window.api.checkPythonVersions();
        this.pythonVersions = versions;
        
        if (versions.length > 0) {
            const versionList = document.getElementById('version-list');
            versionList.innerHTML = versions.map(v => `
                <div class="version-item">
                    <span class="version-text">Python ${v.version}</span>
                    <button class="use-version-btn" data-cmd="${v.command}">Use This</button>
                </div>
            `).join('');
            
            document.querySelector('.python-versions').style.display = 'block';
            
            // Add event listeners for version buttons
            document.querySelectorAll('.use-version-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('python-cmd').value = btn.dataset.cmd;
                    document.getElementById('test-python').click();
                });
            });
        }
    }

    async attachEventListeners() {
        document.getElementById('check-python').addEventListener('click', async () => {
            const statusEl = document.getElementById('python-status');
            statusEl.innerHTML = '<span class="status-icon">⏳</span><span class="status-text">Checking...</span>';
            
            const version = await window.api.checkPython();
            if (version) {
                statusEl.innerHTML = `<span class="status-icon success">✓</span><span class="status-text">Python ${version} found!</span>`;
                this.notifications.show(`Python ${version} found!`, 'success');
            } else {
                statusEl.innerHTML = '<span class="status-icon error">✕</span><span class="status-text">Python not found</span>';
                this.notifications.show('Python not found. Please install Python 3.11 or higher.', 'error');
            }
        });

        document.getElementById('install-python').addEventListener('click', () => {
            window.api.openExternal('https://www.python.org/downloads/');
        });

        document.getElementById('test-python').addEventListener('click', async () => {
            const cmd = document.getElementById('python-cmd').value;
            const statusEl = document.getElementById('command-status');
            statusEl.innerHTML = '<span class="status-icon">⏳</span><span class="status-text">Testing...</span>';
            
            const works = await window.api.testPythonCommand(cmd);
            if (works) {
                statusEl.innerHTML = '<span class="status-icon success">✓</span><span class="status-text">Command works!</span>';
                this.notifications.show('Python command works!', 'success');
                await this.store.set('pythonCommand', cmd);
            } else {
                statusEl.innerHTML = '<span class="status-icon error">✕</span><span class="status-text">Command failed</span>';
                this.notifications.show('Python command failed. Please try another.', 'error');
            }
        });

        document.getElementById('install-deps').addEventListener('click', async () => {
            const statusEl = document.getElementById('deps-status');
            statusEl.innerHTML = '<span class="status-icon">⏳</span><span class="status-text">Installing...</span>';
            
            try {
                await window.api.installDependencies();
                statusEl.innerHTML = '<span class="status-icon success">✓</span><span class="status-text">Dependencies installed!</span>';
                this.notifications.show('Dependencies installed successfully!', 'success');
            } catch (error) {
                statusEl.innerHTML = '<span class="status-icon error">✕</span><span class="status-text">Installation failed</span>';
                this.notifications.show('Failed to install dependencies.', 'error');
            }
        });

        document.getElementById('complete-setup').addEventListener('click', async () => {
            await this.store.set('firstRun', false);
            this.setupComplete = true;
            document.querySelector('.setup-overlay')?.remove();
            document.querySelector('.setup-wizard')?.remove();
            this.notifications.show('Setup completed! You can re-run setup from Settings.', 'success');
        });
    }

    cleanup() {
        document.querySelector('.setup-wizard')?.remove();
        document.querySelector('.setup-overlay')?.remove();
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleEscape);
    }

    handleEscape(e) {
        if (e.key === 'Escape') {
            const wizard = document.querySelector('.setup-wizard');
            if (wizard && !this.setupComplete) {
                this.notifications.show('Please complete the setup first', 'warning');
            } else if (wizard) {
                this.cleanup();
            }
        }
    }
} 