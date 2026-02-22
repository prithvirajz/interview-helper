// Web Speech API wrapper for continuous speech recognition

export class SpeechRecognitionManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.transcript = '';
        this.interimTranscript = '';

        // Callbacks
        this.onTranscriptUpdate = null;
        this.onFinalTranscript = null;
        this.onStatusChange = null;
        this.onError = null;

        this.init();
    }

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('Speech Recognition not supported');
            if (this.onError) {
                this.onError('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
            }
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            if (this.onStatusChange) this.onStatusChange('listening');
        };

        this.recognition.onend = () => {
            // Auto-restart if still supposed to be listening
            if (this.isListening) {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.log('Recognition restart failed:', e);
                }
            } else {
                if (this.onStatusChange) this.onStatusChange('stopped');
            }
        };

        this.recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    final += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            if (final) {
                this.transcript += final + ' ';
                if (this.onFinalTranscript) {
                    this.onFinalTranscript(this.transcript.trim());
                }
            }

            this.interimTranscript = interim;

            if (this.onTranscriptUpdate) {
                this.onTranscriptUpdate(this.transcript + interim);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);

            if (event.error === 'not-allowed') {
                this.isListening = false;
                if (this.onError) {
                    this.onError('Microphone access denied. Please allow microphone access and try again.');
                }
            } else if (event.error === 'no-speech') {
                // Ignore no-speech errors, just continue listening
            } else if (this.onError) {
                this.onError('Speech recognition error: ' + event.error);
            }
        };
    }

    start() {
        if (!this.recognition) {
            if (this.onError) {
                this.onError('Speech Recognition not available');
            }
            return;
        }

        try {
            this.isListening = true;
            this.recognition.start();
        } catch (e) {
            console.error('Failed to start recognition:', e);
        }
    }

    stop() {
        this.isListening = false;
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    clearTranscript() {
        this.transcript = '';
        this.interimTranscript = '';
        if (this.onTranscriptUpdate) {
            this.onTranscriptUpdate('');
        }
    }

    getTranscript() {
        return this.transcript.trim();
    }

    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }
}
