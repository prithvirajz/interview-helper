// Background service worker
// Manages tab capture and creates offscreen document for audio processing

let offscreenCreated = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startTabCapture') {
        startCapture(sender.tab.id).then(sendResponse);
        return true;
    }
    if (message.action === 'stopTabCapture') {
        stopCapture().then(sendResponse);
        return true;
    }
    if (message.action === 'transcriptUpdate') {
        // Forward transcript to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'transcriptUpdate',
                    transcript: message.transcript
                });
            }
        });
    }
});

async function startCapture(tabId) {
    try {
        // Get stream ID for the tab
        const streamId = await chrome.tabCapture.getMediaStreamId({
            targetTabId: tabId
        });

        // Create offscreen document if not exists
        if (!offscreenCreated) {
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['USER_MEDIA'],
                justification: 'Capture tab audio for transcription'
            });
            offscreenCreated = true;
        }

        // Send stream ID to offscreen document
        await chrome.runtime.sendMessage({
            action: 'startRecording',
            streamId: streamId
        });

        return { success: true };
    } catch (error) {
        console.error('Capture error:', error);
        return { success: false, error: error.message };
    }
}

async function stopCapture() {
    try {
        await chrome.runtime.sendMessage({ action: 'stopRecording' });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
