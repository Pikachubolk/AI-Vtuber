export class ConfigManager {
    constructor() {
        this.config = null;
        this.loaded = false;
    }

    async load() {
        if (!this.loaded) {
            try {
                this.config = await window.api.loadSettings();
                this.loaded = true;
            } catch (error) {
                console.error('Failed to load config:', error);
                throw error;
            }
        }
        return this.config;
    }

    async save(updates) {
        try {
            const newConfig = { ...this.config, ...updates };
            await window.api.saveSettings(newConfig);
            this.config = newConfig;
            return true;
        } catch (error) {
            console.error('Failed to save config:', error);
            throw error;
        }
    }

    get(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.config);
    }
}

export const configManager = new ConfigManager(); 