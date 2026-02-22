// Content script - Interview Copilot
// With code formatting, copy functionality, larger response area, collapsible history

let panelVisible = false;
let panel = null;
let toggleButton = null;
let isListening = false;
let currentTranscript = '';
let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];
let conversationHistory = [];
let lastTranscriptTime = 0;
let silenceCounter = 0;
let historyExpanded = false;

function createToggleButton() {
    if (toggleButton) return;
    toggleButton = document.createElement('div');
    toggleButton.id = 'interview-copilot-toggle';
    toggleButton.innerHTML = '🎤';
    toggleButton.title = 'Open Interview Copilot';
    toggleButton.addEventListener('click', togglePanel);
    document.body.appendChild(toggleButton);
}

function createPanel() {
    if (panel) return;

    panel = document.createElement('div');
    panel.id = 'interview-copilot-panel';
    panel.innerHTML = `
        <div class="icp-header">
            <span class="icp-title">🎤 Interview Copilot</span>
            <div class="icp-controls">
                <button id="icp-listen-btn" class="icp-btn icp-btn-primary">▶ Capture</button>
                <button id="icp-minimize-btn" class="icp-btn-icon">−</button>
            </div>
        </div>
        <div class="icp-status">
            <span class="icp-status-dot"></span>
            <span class="icp-status-text">Ready</span>
        </div>
        <div class="icp-transcript">
            <div class="icp-section-title">Question</div>
            <div id="icp-transcript-text" class="icp-transcript-content">Waiting for interviewer...</div>
        </div>
        <div class="icp-actions">
            <button id="icp-clear-btn" class="icp-small-btn">Clear</button>
            <button id="icp-generate-btn" class="icp-small-btn icp-btn-accent">Generate Response</button>
        </div>
        <div class="icp-responses">
            <div class="icp-response-header">
                <span class="icp-section-title">Response</span>
                <button id="icp-copy-btn" class="icp-copy-btn" title="Copy to clipboard">📋 Copy</button>
            </div>
            <div id="icp-response-content" class="icp-response-content">
                <div class="icp-placeholder">Click Generate after question</div>
            </div>
        </div>
        <div class="icp-history-section">
            <div class="icp-history-header" id="icp-history-toggle">
                <span>📜 History (${conversationHistory.length})</span>
                <span class="icp-expand-icon">▶</span>
            </div>
            <div id="icp-history-content" class="icp-history-content"></div>
        </div>
    `;

    document.body.appendChild(panel);
    document.getElementById('icp-listen-btn').addEventListener('click', toggleListening);
    document.getElementById('icp-minimize-btn').addEventListener('click', hidePanel);
    document.getElementById('icp-clear-btn').addEventListener('click', clearCurrentTranscript);
    document.getElementById('icp-generate-btn').addEventListener('click', () => {
        if (currentTranscript.trim().length >= 10) generateResponse();
    });
    document.getElementById('icp-copy-btn').addEventListener('click', copyResponse);
    document.getElementById('icp-history-toggle').addEventListener('click', toggleHistory);

    renderHistory();
}

function copyResponse() {
    const content = document.getElementById('icp-response-content');
    const text = content.innerText || content.textContent;

    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('icp-copy-btn');
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = '📋 Copy', 2000);
    });
}

function toggleHistory() {
    historyExpanded = !historyExpanded;
    const content = document.getElementById('icp-history-content');
    const icon = document.querySelector('.icp-expand-icon');

    if (historyExpanded) {
        content.classList.add('expanded');
        icon.textContent = '▼';
    } else {
        content.classList.remove('expanded');
        icon.textContent = '▶';
    }
}

function clearCurrentTranscript() {
    currentTranscript = '';
    document.getElementById('icp-transcript-text').textContent = 'Waiting for interviewer...';
}

async function toggleListening() {
    isListening ? stopListening() : await startListening();
}

async function startListening() {
    updateStatus('Starting capture...', 'pending');

    try {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 16000 }
        });

        mediaStream.getVideoTracks().forEach(t => t.stop());

        const audioTracks = mediaStream.getAudioTracks();
        if (audioTracks.length === 0) {
            updateStatus('No audio! Check "Share tab audio"', 'error');
            return;
        }

        const audioStream = new MediaStream(audioTracks);
        mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.onstop = async () => { if (audioChunks.length > 0 && isListening) await processAudioChunks(); };

        isListening = true;
        silenceCounter = 0;
        updateStatus('Listening...', 'active');
        document.getElementById('icp-listen-btn').textContent = '⏹ Stop';
        document.getElementById('icp-listen-btn').classList.add('icp-btn-danger');

        startRecordingLoop();

    } catch (err) {
        console.error('Error:', err);
        updateStatus('Error: ' + err.message, 'error');
    }
}

function startRecordingLoop() {
    if (!isListening || !mediaRecorder) return;

    audioChunks = [];
    try { mediaRecorder.start(); } catch (e) { return; }

    setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setTimeout(() => { if (isListening) startRecordingLoop(); }, 200);
        }
    }, 7000);
}

async function processAudioChunks() {
    if (audioChunks.length === 0) return;

    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = [];

    if (audioBlob.size < 3000) {
        silenceCounter++;
        if (silenceCounter > 2) updateStatus('Listening (silence)', 'active');
        return;
    }

    silenceCounter = 0;

    const settings = await chrome.storage.local.get(['groqKey']);
    if (!settings.groqKey) { updateStatus('Set Groq API key', 'error'); return; }

    try {
        updateStatus('Transcribing...', 'pending');

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'en');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.groqKey}` },
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            const text = result.text?.trim() || '';

            if (text.length >= 5 && !isNoise(text)) {
                currentTranscript += (currentTranscript ? ' ' : '') + text;
                document.getElementById('icp-transcript-text').textContent = currentTranscript;
                lastTranscriptTime = Date.now();
                updateStatus('Listening...', 'active');
            } else {
                updateStatus('Listening...', 'active');
            }
        } else {
            updateStatus('Transcription error', 'error');
        }
    } catch (err) {
        updateStatus('Transcription failed', 'error');
    }
}

function isNoise(text) {
    const noisePatterns = [/^\.+$/, /^[\s\.,!?]+$/, /thank you for watching/i, /please subscribe/i, /^music$/i, /^\[.*\]$/, /^you$/i];
    const trimmed = text.trim();
    if (trimmed.length < 3) return true;
    return noisePatterns.some(p => p.test(trimmed));
}

function stopListening() {
    isListening = false;
    if (mediaRecorder && mediaRecorder.state === 'recording') try { mediaRecorder.stop(); } catch (e) { }
    mediaRecorder = null;
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
    updateStatus('Stopped', 'idle');
    document.getElementById('icp-listen-btn').textContent = '▶ Capture';
    document.getElementById('icp-listen-btn').classList.remove('icp-btn-danger');
}

// Format response with code syntax highlighting
function formatResponse(text) {
    // Escape HTML first
    let formatted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Format code blocks with syntax highlighting
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'code';
        const highlighted = highlightCode(code.trim(), language);
        return `<div class="icp-code-block"><div class="icp-code-header"><span>${language}</span><button class="icp-code-copy" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent);this.textContent='✓';setTimeout(()=>this.textContent='Copy',1500)">Copy</button></div><pre class="icp-code"><code>${highlighted}</code></pre></div>`;
    });

    // Format inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="icp-inline-code">$1</code>');

    // Format bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Format line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

function highlightCode(code, lang) {
    // Basic syntax highlighting for common languages
    const keywords = {
        python: ['def', 'class', 'import', 'from', 'if', 'else', 'elif', 'for', 'while', 'return', 'try', 'except', 'with', 'as', 'in', 'not', 'and', 'or', 'True', 'False', 'None', 'self', 'lambda', 'async', 'await'],
        javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'try', 'catch', 'class', 'new', 'this', 'async', 'await', 'import', 'export', 'from', 'true', 'false', 'null', 'undefined'],
        java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'if', 'else', 'for', 'while', 'return', 'try', 'catch', 'new', 'static', 'void', 'int', 'String', 'boolean', 'true', 'false', 'null'],
        sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'ON', 'AND', 'OR', 'ORDER', 'BY', 'GROUP', 'HAVING', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'NULL', 'NOT']
    };

    let highlighted = code;
    const langKeywords = keywords[lang.toLowerCase()] || keywords.javascript;

    // Highlight strings
    highlighted = highlighted.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '<span class="icp-hl-string">$&</span>');

    // Highlight comments
    highlighted = highlighted.replace(/(\/\/.*$|#.*$)/gm, '<span class="icp-hl-comment">$1</span>');

    // Highlight keywords
    langKeywords.forEach(kw => {
        const regex = new RegExp(`\\b(${kw})\\b`, 'g');
        highlighted = highlighted.replace(regex, '<span class="icp-hl-keyword">$1</span>');
    });

    // Highlight numbers
    highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="icp-hl-number">$1</span>');

    return highlighted;
}

async function generateResponse() {
    if (!currentTranscript.trim() || currentTranscript.trim().length < 10) {
        updateStatus('Need more speech', 'error');
        return;
    }

    const question = currentTranscript.trim();
    const el = document.getElementById('icp-response-content');
    el.innerHTML = '<div class="icp-loading">Generating response...</div>';

    const s = await chrome.storage.local.get(['apiKey', 'model', 'resume', 'jobDescription']);
    if (!s.apiKey) { el.innerHTML = '<div class="icp-error">Set API key in popup</div>'; return; }

    const model = s.model || 'google/gemini-2.0-flash-001';

    try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: `You are an Interview Copilot. Give a direct, ready-to-speak answer. Use code blocks with language tags when providing code examples. First-person, confident, concise.${s.resume ? '\n\nResume:\n' + s.resume : ''}${s.jobDescription ? '\n\nJob:\n' + s.jobDescription : ''}` },
                    { role: 'user', content: `Question: "${question}"\n\nAnswer:` }
                ],
                max_tokens: 1200,
                temperature: 0.7
            })
        });

        const d = await r.json();
        const answer = d.choices?.[0]?.message?.content || 'No response';
        el.innerHTML = `<div class="icp-answer">${formatResponse(answer)}</div>`;

        conversationHistory.push({ question, answer, time: new Date().toLocaleTimeString() });
        updateHistoryCount();
        renderHistory();

        currentTranscript = '';
        document.getElementById('icp-transcript-text').textContent = 'Waiting for next question...';
        updateStatus('Ready', 'idle');

    } catch (e) {
        el.innerHTML = `<div class="icp-error">${e.message}</div>`;
    }
}

function updateHistoryCount() {
    const toggle = document.getElementById('icp-history-toggle');
    if (toggle) toggle.querySelector('span').textContent = `📜 History (${conversationHistory.length})`;
}

function renderHistory() {
    const el = document.getElementById('icp-history-content');
    if (!el) return;

    el.innerHTML = '';

    if (conversationHistory.length === 0) {
        el.innerHTML = '<div class="icp-placeholder-small">No history yet</div>';
        return;
    }

    [...conversationHistory].reverse().forEach((item, idx) => {
        const d = document.createElement('div');
        d.className = 'icp-history-item';
        d.innerHTML = `
            <div class="icp-history-num">Q${conversationHistory.length - idx} <span class="icp-history-time">${item.time}</span></div>
            <div class="icp-history-q">"${item.question.slice(0, 50)}..."</div>
        `;
        d.addEventListener('click', () => {
            document.getElementById('icp-response-content').innerHTML = `<div class="icp-answer">${formatResponse(item.answer)}</div>`;
            document.getElementById('icp-transcript-text').textContent = item.question;
        });
        el.appendChild(d);
    });
}

function updateStatus(t, s) {
    if (!panel) return;
    const dot = panel.querySelector('.icp-status-dot');
    const txt = panel.querySelector('.icp-status-text');
    if (txt) txt.textContent = t;
    if (dot) dot.className = 'icp-status-dot ' + s;
}

function showPanel() { if (!panel) createPanel(); panel.classList.add('visible'); toggleButton?.classList.add('hidden'); panelVisible = true; }
function hidePanel() { panel?.classList.remove('visible'); toggleButton?.classList.remove('hidden'); panelVisible = false; }
function togglePanel() { panelVisible ? hidePanel() : showPanel(); }

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'togglePanel') togglePanel();
    if (msg.action === 'showPanel') showPanel();
    sendResponse({});
});

setTimeout(createToggleButton, 1500);
