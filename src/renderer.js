import { NotificationManager } from './utils/notifications.js';
import { SetupWizard } from './utils/setup-wizard.js';
import { initializeLiveControl } from './components/live-control.js';
import { initializePrompt } from './components/prompt.js';
import { initializeSettings } from './components/settings.js';
import { initializeMessages } from './components/messages.js';
import { logger } from './utils/logger.js';
import { appState } from './utils/state-manager.js';
import { configManager } from './utils/config-manager.js';

// Initialize window controls
function initializeWindowControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    minimizeBtn?.addEventListener('click', () => {
        window.windowControls.minimize();
    });

    maximizeBtn?.addEventListener('click', async () => {
        await window.windowControls.maximize();
        const isMaximized = await window.windowControls.isMaximized();
        maximizeBtn.innerHTML = isMaximized ? '❐' : '□';
    });

    closeBtn?.addEventListener('click', () => {
        window.windowControls.close();
    });
}

// Enhanced initialization
async function initialize() {
    try {
        logger.info('Initializing application...');

        // Load configuration first
        await configManager.load();
        
        // Initialize notifications
        const notifications = new NotificationManager();
        
        // Initialize setup wizard
        const setupWizard = new SetupWizard(notifications);
        
        // Initialize all components
        initializeWindowControls();
        initializeLiveControl();
        initializePrompt();
        initializeSettings();
        initializeMessages();
        
        // Check for first run
        await setupWizard.checkFirstRun();
        
        // Add navigation handling
        initializeNavigation();
        
        // Set initial app state
        appState.setState('initialized', true);
        
        logger.info('Application initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize application', error);
        // Show error in UI
        const notifications = new NotificationManager();
        notifications.show('Failed to initialize application. Please restart.', 'error');
    }
}

function initializeNavigation() {
    const panels = document.querySelectorAll('.panel');
    const navButtons = document.querySelectorAll('.nav-button');
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPanel = button.getAttribute('data-panel');
            
            // Update active states
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show selected panel with animation
            panels.forEach(panel => {
                if (panel.id === targetPanel) {
                    panel.style.opacity = '0';
                    panel.classList.add('active');
                    setTimeout(() => {
                        panel.style.opacity = '1';
                    }, 50);
                } else {
                    panel.classList.remove('active');
                }
            });
            
            // Update state
            appState.setState('currentPanel', targetPanel);
        });
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);

// Add cleanup on window unload
window.addEventListener('beforeunload', () => {
    logger.info('Application shutting down...');
    // Perform any necessary cleanup
}); 