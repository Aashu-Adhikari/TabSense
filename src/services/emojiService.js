// src/services/emojiService.js

const STORAGE_KEY = 'custom_domain_settings';

export const emojiService = {
    /**
     * Get all custom domain settings
     * @returns {Promise<Object>} Map of domain -> { emoji, name }
     */
    getDomainSettings: async () => {
        try {
            const result = await chrome.storage.local.get([STORAGE_KEY]);
            return result[STORAGE_KEY] || {};
        } catch (error) {
            console.error('EmojiService: Failed to get settings', error);
            return {};
        }
    },

    /**
     * Set a custom setting for a domain
     * @param {string} domain - The domain (e.g., 'github.com')
     * @param {Object} settings - { emoji, name }
     */
    setDomainSetting: async (domain, settings) => {
        try {
            const current = await emojiService.getDomainSettings();
            const existing = current[domain] || {};

            // Merge with existing settings
            const updatedSettings = { ...existing, ...settings };

            // Remove keys with empty values
            if (!updatedSettings.emoji) delete updatedSettings.emoji;
            if (!updatedSettings.name) delete updatedSettings.name;

            const updated = { ...current };

            if (Object.keys(updatedSettings).length > 0) {
                updated[domain] = updatedSettings;
            } else {
                delete updated[domain];
            }

            await chrome.storage.local.set({ [STORAGE_KEY]: updated });
            return updated;
        } catch (error) {
            console.error('EmojiService: Failed to set setting', error);
            throw error;
        }
    },

    // Backward compatibility / Helper aliases
    getCustomEmojis: async () => {
        const settings = await emojiService.getDomainSettings();
        const emojis = {};
        for (const [domain, data] of Object.entries(settings)) {
            if (data.emoji) emojis[domain] = data.emoji;
        }
        return emojis;
    },

    setCustomEmoji: async (domain, emoji) => {
        return emojiService.setDomainSetting(domain, { emoji });
    },

    removeCustomEmoji: async (domain) => {
        return emojiService.setDomainSetting(domain, { emoji: null });
    }
};
