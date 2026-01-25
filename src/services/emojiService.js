// src/services/emojiService.js
import { DEFAULT_DOMAIN_SETTINGS } from '../utils/defaultDomainSettings';

const STORAGE_KEY = 'custom_domain_settings';

export const emojiService = {
    /**
     * Get all domain settings (custom + defaults merged)
     * @returns {Promise<Object>} Map of domain -> { emoji, name }
     */
    getDomainSettings: async () => {
        try {
            const result = await chrome.storage.local.get([STORAGE_KEY]);
            const customSettings = result[STORAGE_KEY] || {};

            // Merge defaults with custom settings (custom overrides defaults)
            const mergedSettings = { ...DEFAULT_DOMAIN_SETTINGS };

            // Apply custom settings on top of defaults
            for (const [domain, customSetting] of Object.entries(customSettings)) {
                if (customSetting && Object.keys(customSetting).length > 0) {
                    mergedSettings[domain] = { ...mergedSettings[domain], ...customSetting };
                } else {
                    // If custom setting is empty, remove it (fall back to default or nothing)
                    delete mergedSettings[domain];
                }
            }

            return mergedSettings;
        } catch (error) {
            console.error('EmojiService: Failed to get settings', error);
            // Return defaults if storage fails
            return { ...DEFAULT_DOMAIN_SETTINGS };
        }
    },

    /**
     * Get only custom domain settings (for internal use)
     * @returns {Promise<Object>} Map of domain -> { emoji, name }
     */
    getCustomDomainSettings: async () => {
        try {
            const result = await chrome.storage.local.get([STORAGE_KEY]);
            return result[STORAGE_KEY] || {};
        } catch (error) {
            console.error('EmojiService: Failed to get custom settings', error);
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
    },

    /**
     * Get effective settings for a specific domain (merged defaults + custom)
     * @param {string} domain - The domain to get settings for
     * @returns {Promise<Object>} Settings object with emoji and name
     */
    getDomainSettingsForDomain: async (domain) => {
        const allSettings = await emojiService.getDomainSettings();
        return allSettings[domain] || {};
    }
};
