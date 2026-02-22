// Local storage manager for Interview Copilot

const STORAGE_KEYS = {
    API_KEY: 'interview_copilot_api_key',
    PROFILE: 'interview_copilot_profile',
    SETTINGS: 'interview_copilot_settings'
};

// Default API key (pre-configured)
const DEFAULT_API_KEY = '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';

export const storage = {
    // API Key management
    getApiKey() {
        return localStorage.getItem(STORAGE_KEYS.API_KEY) || DEFAULT_API_KEY;
    },

    setApiKey(key) {
        if (key) {
            localStorage.setItem(STORAGE_KEYS.API_KEY, key);
        } else {
            localStorage.removeItem(STORAGE_KEYS.API_KEY);
        }
    },

    // Candidate profile management
    getProfile() {
        const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return this.getDefaultProfile();
            }
        }
        return this.getDefaultProfile();
    },

    getDefaultProfile() {
        return {
            role: '',
            experience: '',
            resume: '',
            jobDescription: ''
        };
    },

    setProfile(profile) {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    },

    // Settings management
    getSettings() {
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return this.getDefaultSettings();
            }
        }
        return this.getDefaultSettings();
    },

    getDefaultSettings() {
        return {
            interviewType: 'general',
            model: 'google/gemini-2.0-flash-001',
            autoSubmit: true,
            autoSubmitDelay: 2
        };
    },

    setSettings(settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    },

    // Clear all data
    clearAll() {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
};
