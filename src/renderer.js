import { NotificationManager } from './utils/notifications.js';
import { SetupWizard } from './utils/setup-wizard.js';
import { initializeLiveControl } from './components/live-control.js';
import { initializePrompt } from './components/prompt.js';
import { initializeSettings } from './components/settings.js';
import { initializeMessages } from './components/messages.js';

document.addEventListener('DOMContentLoaded', async () => {
    const notifications = new NotificationManager();
    const setupWizard = new SetupWizard(notifications);
    
    // Initialize all components
    initializeLiveControl();
    initializePrompt();
    initializeSettings();
    initializeMessages();
    
    // Check for first run
    await setupWizard.checkFirstRun();
    
    // Add cleanup on window unload
    window.addEventListener('beforeunload', () => {
        setupWizard.cleanup();
    });
    
    // Add navigation handling
    const panels = document.querySelectorAll('.panel');
    const navButtons = document.querySelectorAll('.nav-button');
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPanel = button.getAttribute('data-panel');
            
            // Update active states
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show selected panel
            panels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === targetPanel) {
                    panel.classList.add('active');
                }
            });
        });
    });
}); 