// Offscreen document script - handles audio capture and speech recognition

let mediaStream = null;
let recognition = null;
let isRecording = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startRecording') {
        startRecording(message.streamId);
        sendResponse({ success: true });
    }
    if (message.action === 'stopRecording') {
        stopRecording();
        sendResponse({ success: true });
    }
    return true;
});

async function startRecording(streamId) {
    try {
        // Get the tab audio stream
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            },
            video: false
        });

        // Create audio context to keep the stream alive
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);

        // Connect to a dummy destination to keep audio playing
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);

        // Start speech recognition on the tab audio
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let transcript = '';
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }

                // Send transcript to background
                chrome.runtime.sendMessage({
                    action: 'transcriptUpdate',
                    transcript: transcript
                });
            };

            recognition.onend = () => {
                if (isRecording) {
                    recognition.start();
                }
            };

            recognition.onerror = (e) => {
                console.log('Recognition error:', e.error);
                if (e.error !== 'no-speech' && isRecording) {
                    setTimeout(() => recognition.start(), 1000);
                }
            };

            recognition.start();
            isRecording = true;
        }

    } catch (error) {
        console.error('Start recording error:', error);
    }
}

function stopRecording() {
    isRecording = false;

    if (recognition) {
        recognition.stop();
        recognition = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
}
