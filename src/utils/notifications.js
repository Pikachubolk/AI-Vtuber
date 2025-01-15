export class NotificationManager {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = document.createElement('span');
        icon.className = 'notification-icon';
        icon.innerHTML = this.getIcon(type);
        
        const text = document.createElement('span');
        text.className = 'notification-text';
        text.textContent = message;
        
        const progress = document.createElement('div');
        progress.className = 'notification-progress';
        
        notification.appendChild(icon);
        notification.appendChild(text);
        notification.appendChild(progress);
        
        this.container.appendChild(notification);
        
        // Animate progress bar
        progress.style.animation = `progress ${duration}ms linear`;
        
        // Remove notification after duration
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                this.container.removeChild(notification);
            }, 300);
        }, duration);
    }

    getIcon(type) {
        switch(type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            default: return 'ℹ';
        }
    }
} 