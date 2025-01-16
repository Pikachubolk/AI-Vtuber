export class Logger {
    static levels = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };

    constructor(minLevel = 'INFO') {
        this.minLevel = Logger.levels[minLevel];
        this.history = [];
    }

    log(level, message, data = null) {
        if (Logger.levels[level] >= this.minLevel) {
            const logEntry = {
                timestamp: new Date(),
                level,
                message,
                data
            };
            
            this.history.push(logEntry);
            this._output(logEntry);
            
            // Keep history size manageable
            if (this.history.length > 1000) {
                this.history.shift();
            }
        }
    }

    _output(entry) {
        const { timestamp, level, message, data } = entry;
        const timeStr = timestamp.toISOString();
        
        const consoleMethod = {
            DEBUG: 'debug',
            INFO: 'info',
            WARN: 'warn',
            ERROR: 'error'
        }[level];

        console[consoleMethod](`[${timeStr}] ${level}: ${message}`, data || '');
        
        // Also update UI if console element exists
        const consoleEl = document.getElementById('console');
        if (consoleEl) {
            const line = document.createElement('div');
            line.className = `console-line ${level.toLowerCase()}`;
            line.innerHTML = `<span class="console-timestamp">${timeStr}</span> [${level}] ${message}`;
            consoleEl.appendChild(line);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    }

    debug(message, data) { this.log('DEBUG', message, data); }
    info(message, data) { this.log('INFO', message, data); }
    warn(message, data) { this.log('WARN', message, data); }
    error(message, data) { this.log('ERROR', message, data); }
}

export const logger = new Logger(); 