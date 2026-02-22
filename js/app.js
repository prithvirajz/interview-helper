// Main application controller for Interview Copilot

import { SpeechRecognitionManager } from './speechRecognition.js';
import { OpenRouterClient, AVAILABLE_MODELS } from './openRouterClient.js';
import { ResponseFormatter } from './responseFormatter.js';
import { storage } from './storage.js';
import { INTERVIEW_TYPES } from './prompts.js';

class InterviewCopilotApp {
    constructor() {
        this.speechManager = new SpeechRecognitionManager();
        this.openRouter = new OpenRouterClient();
        this.responseFormatter = null;

        this.isProcessing = false;
        this.autoSubmitTimer = null;

        this.init();
    }

    init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Initialize response formatter
        const responseContainer = document.getElementById('responseContainer');
        this.responseFormatter = new ResponseFormatter(responseContainer);

        // Load saved settings
        this.loadSettings();

        // Setup speech recognition callbacks
        this.setupSpeechCallbacks();

        // Setup UI event listeners
        this.setupEventListeners();

        // Populate dropdowns
        this.populateDropdowns();

        // Check browser support
        this.checkBrowserSupport();

        // Show initial placeholder
        this.responseFormatter.renderResponse(null);

        // Auto-start listening
        this.startListening();
    }

    loadSettings() {
        const apiKey = storage.getApiKey();
        const profile = storage.getProfile();
        const settings = storage.getSettings();

        // Set API key
        this.openRouter.setApiKey(apiKey);
        document.getElementById('apiKeyInput').value = apiKey;

        // Set profile
        document.getElementById('roleInput').value = profile.role || '';
        document.getElementById('experienceInput').value = profile.experience || '';
        document.getElementById('resumeInput').value = profile.resume || '';
        document.getElementById('jobDescInput').value = profile.jobDescription || '';

        // Set settings
        document.getElementById('modelSelect').value = settings.model;
        document.getElementById('interviewTypeSelect').value = settings.interviewType;
        document.getElementById('autoSubmitCheckbox').checked = settings.autoSubmit;
        document.getElementById('autoSubmitDelay').value = settings.autoSubmitDelay;

        this.openRouter.setModel(settings.model);
    }

    setupSpeechCallbacks() {
        this.speechManager.onTranscriptUpdate = (transcript) => {
            document.getElementById('transcriptText').textContent = transcript || 'Listening...';
            this.scrollTranscriptToBottom();
        };

        this.speechManager.onFinalTranscript = (transcript) => {
            const settings = storage.getSettings();
            if (settings.autoSubmit && transcript.trim()) {
                this.scheduleAutoSubmit(settings.autoSubmitDelay);
            }
        };

        this.speechManager.onStatusChange = (status) => {
            this.updateListeningStatus(status);
        };

        this.speechManager.onError = (error) => {
            this.showNotification(error, 'error');
        };
    }

    setupEventListeners() {
        // Listening controls
        document.getElementById('startListeningBtn').addEventListener('click', () => {
            this.startListening();
        });

        document.getElementById('stopListeningBtn').addEventListener('click', () => {
            this.stopListening();
        });

        document.getElementById('clearTranscriptBtn').addEventListener('click', () => {
            this.clearTranscript();
        });

        document.getElementById('getResponseBtn').addEventListener('click', () => {
            this.generateResponse();
        });

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Close modal on backdrop click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettings();
            }
        });

        // Quick interview type selector
        document.getElementById('quickInterviewType').addEventListener('change', (e) => {
            const settings = storage.getSettings();
            settings.interviewType = e.target.value;
            storage.setSettings(settings);
        });

        // Toggle API key visibility
        document.getElementById('toggleApiKeyBtn').addEventListener('click', () => {
            const input = document.getElementById('apiKeyInput');
            const btn = document.getElementById('toggleApiKeyBtn');
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'Hide';
            } else {
                input.type = 'password';
                btn.textContent = 'Show';
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to get response
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.generateResponse();
            }
            // Escape to close modal
            if (e.key === 'Escape') {
                this.closeSettings();
            }
        });
    }

    populateDropdowns() {
        // Populate model select
        const modelSelect = document.getElementById('modelSelect');
        modelSelect.innerHTML = AVAILABLE_MODELS.map(m =>
            `<option value="${m.value}">${m.label}</option>`
        ).join('');

        // Populate interview type selects
        const typeOptions = INTERVIEW_TYPES.map(t =>
            `<option value="${t.value}">${t.label}</option>`
        ).join('');

        document.getElementById('interviewTypeSelect').innerHTML = typeOptions;
        document.getElementById('quickInterviewType').innerHTML = typeOptions;

        // Set initial values from storage
        const settings = storage.getSettings();
        modelSelect.value = settings.model;
        document.getElementById('interviewTypeSelect').value = settings.interviewType;
        document.getElementById('quickInterviewType').value = settings.interviewType;
    }

    checkBrowserSupport() {
        if (!this.speechManager.isSupported()) {
            document.getElementById('startListeningBtn').disabled = true;
            this.showNotification('Speech recognition not supported. Please use Chrome or Edge.', 'error');
        }
    }

    startListening() {
        this.speechManager.start();
        document.getElementById('startListeningBtn').classList.add('hidden');
        document.getElementById('stopListeningBtn').classList.remove('hidden');
    }

    stopListening() {
        this.speechManager.stop();
        document.getElementById('startListeningBtn').classList.remove('hidden');
        document.getElementById('stopListeningBtn').classList.add('hidden');

        if (this.autoSubmitTimer) {
            clearTimeout(this.autoSubmitTimer);
            this.autoSubmitTimer = null;
        }
    }

    clearTranscript() {
        this.speechManager.clearTranscript();
        document.getElementById('transcriptText').textContent = 'Listening...';
        this.responseFormatter.clearHistory();

        if (this.autoSubmitTimer) {
            clearTimeout(this.autoSubmitTimer);
            this.autoSubmitTimer = null;
        }
    }

    updateListeningStatus(status) {
        const indicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');

        if (status === 'listening') {
            indicator.classList.add('active');
            statusText.textContent = 'Listening...';
        } else {
            indicator.classList.remove('active');
            statusText.textContent = 'Not listening';
        }
    }

    scrollTranscriptToBottom() {
        const transcriptBox = document.querySelector('.transcript-box');
        transcriptBox.scrollTop = transcriptBox.scrollHeight;
    }

    scheduleAutoSubmit(delaySeconds) {
        if (this.autoSubmitTimer) {
            clearTimeout(this.autoSubmitTimer);
        }

        this.autoSubmitTimer = setTimeout(() => {
            this.generateResponse();
        }, delaySeconds * 1000);
    }

    async generateResponse() {
        if (this.isProcessing) return;

        const transcript = this.speechManager.getTranscript();
        if (!transcript.trim()) {
            this.showNotification('No transcript to analyze. Start speaking first.', 'warning');
            return;
        }

        this.isProcessing = true;
        document.getElementById('getResponseBtn').disabled = true;
        this.responseFormatter.showLoading();

        const profile = storage.getProfile();
        const settings = storage.getSettings();

        await this.openRouter.generateResponse(
            transcript,
            profile,
            settings.interviewType,
            // On chunk (streaming)
            (partialResponse) => {
                this.responseFormatter.hideLoading();
                this.responseFormatter.renderResponse(partialResponse, true);
            },
            // On complete
            (fullResponse) => {
                this.responseFormatter.finalizeResponse(fullResponse, transcript);
                this.speechManager.clearTranscript();
                document.getElementById('transcriptText').textContent = 'Listening...';
                this.isProcessing = false;
                document.getElementById('getResponseBtn').disabled = false;
            },
            // On error
            (error) => {
                this.responseFormatter.showError(error);
                this.isProcessing = false;
                document.getElementById('getResponseBtn').disabled = false;
            }
        );
    }

    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    saveSettings() {
        // Save API key
        const apiKey = document.getElementById('apiKeyInput').value.trim();
        storage.setApiKey(apiKey);
        this.openRouter.setApiKey(apiKey);

        // Save profile
        const profile = {
            role: document.getElementById('roleInput').value.trim(),
            experience: document.getElementById('experienceInput').value.trim(),
            resume: document.getElementById('resumeInput').value.trim(),
            jobDescription: document.getElementById('jobDescInput').value.trim()
        };
        storage.setProfile(profile);

        // Save settings
        const settings = {
            model: document.getElementById('modelSelect').value,
            interviewType: document.getElementById('interviewTypeSelect').value,
            autoSubmit: document.getElementById('autoSubmitCheckbox').checked,
            autoSubmitDelay: parseInt(document.getElementById('autoSubmitDelay').value) || 3
        };
        storage.setSettings(settings);
        this.openRouter.setModel(settings.model);

        // Update quick selector
        document.getElementById('quickInterviewType').value = settings.interviewType;

        this.closeSettings();
        this.showNotification('Settings saved successfully!', 'success');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto remove
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Initialize app
new InterviewCopilotApp();
