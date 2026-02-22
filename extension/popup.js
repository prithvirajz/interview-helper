// Popup script

document.addEventListener('DOMContentLoaded', async () => {
    const settings = await chrome.storage.local.get(['apiKey', 'groqKey', 'model', 'resume', 'jobDescription']);

    if (settings.apiKey) document.getElementById('apiKey').value = settings.apiKey;
    if (settings.groqKey) document.getElementById('groqKey').value = settings.groqKey;
    if (settings.model) document.getElementById('model').value = settings.model;
    if (settings.resume) document.getElementById('resume').value = settings.resume;
    if (settings.jobDescription) document.getElementById('jobDesc').value = settings.jobDescription;

    document.getElementById('saveBtn').addEventListener('click', async () => {
        await chrome.storage.local.set({
            apiKey: document.getElementById('apiKey').value.trim(),
            groqKey: document.getElementById('groqKey').value.trim(),
            model: document.getElementById('model').value,
            resume: document.getElementById('resume').value.trim(),
            jobDescription: document.getElementById('jobDesc').value.trim()
        });

        document.getElementById('status').textContent = '✓ Settings saved!';
        document.getElementById('status').style.color = '#4ade80';
    });
});
