import { initializeLiveControl } from '../components/live-control.js';
import { initializeMessages } from '../components/messages.js';
import { initializePrompt } from '../components/prompt.js';
import { initializeSettings } from '../components/settings.js';

// Initialize components
document.addEventListener('DOMContentLoaded', () => {
    initializeLiveControl();
    initializeMessages();
    initializePrompt();
    initializeSettings();
    
    // Navigation
    const navButtons = document.querySelectorAll('.nav-button');
    const panels = document.querySelectorAll('.panel');
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPanel = button.dataset.panel;
            
            navButtons.forEach(btn => btn.classList.remove('active'));
            panels.forEach(panel => panel.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(targetPanel).classList.add('active');
        });
    });
    
    // Window controls
    document.getElementById('minimize-btn').addEventListener('click', () => {
        window.api.minimize();
    });
    
    document.getElementById('maximize-btn').addEventListener('click', () => {
        window.api.maximize();
    });
    
    document.getElementById('close-btn').addEventListener('click', () => {
        window.api.close();
    });
}); 