// Response display and formatting module

export class ResponseFormatter {
    constructor(container) {
        this.container = container;
        this.responseHistory = [];
        this.initContainer();
    }

    initContainer() {
        this.container.innerHTML = `
            <div class="responses-list" id="responsesList"></div>
        `;
        this.listContainer = document.getElementById('responsesList');
    }

    renderResponse(content, isStreaming = false) {
        if (!content && this.responseHistory.length === 0) {
            this.listContainer.innerHTML = this.getPlaceholder();
            return;
        }

        if (!content) return;

        // If streaming, update the current streaming response
        if (isStreaming) {
            let streamingEl = this.listContainer.querySelector('.response-item.streaming');
            if (!streamingEl) {
                streamingEl = document.createElement('div');
                streamingEl.className = 'response-item streaming';
                this.listContainer.insertBefore(streamingEl, this.listContainer.firstChild);
            }
            streamingEl.innerHTML = `
                <div class="response-content">
                    ${this.formatContent(content)}
                </div>
            `;
            this.scrollToTop();
        }
    }

    finalizeResponse(content, question) {
        // Remove streaming class and add final response
        const streamingEl = this.listContainer.querySelector('.response-item.streaming');
        if (streamingEl) {
            streamingEl.classList.remove('streaming');
            streamingEl.innerHTML = `
                <div class="response-header">
                    <span class="response-question">${this.truncate(question, 60)}</span>
                    <span class="response-time">${this.formatTime(new Date())}</span>
                </div>
                <div class="response-content">
                    ${this.formatContent(content)}
                </div>
                <button class="copy-button" title="Copy response">Copy</button>
            `;
            this.attachCopyHandler(streamingEl, content);
        }

        // Add to history
        this.addToHistory(question, content);
        this.scrollToTop();
    }

    truncate(str, len) {
        if (str.length <= len) return str;
        return str.substring(0, len) + '...';
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    formatContent(content) {
        let html = content;

        // Escape HTML first
        html = html.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Bold text **text**
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Bullet points
        html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        // Numbered lists
        html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');

        // Line breaks
        html = html.replace(/\n\n/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');

        // Wrap in paragraph if not already wrapped
        if (!html.startsWith('<')) {
            html = '<p>' + html + '</p>';
        }

        return html;
    }

    attachCopyHandler(element, content) {
        const button = element.querySelector('.copy-button');
        if (button) {
            button.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(content);
                    button.textContent = 'Copied!';
                    setTimeout(() => {
                        button.textContent = 'Copy';
                    }, 2000);
                } catch (e) {
                    console.error('Failed to copy:', e);
                }
            });
        }
    }

    scrollToTop() {
        this.container.scrollTop = 0;
    }

    getPlaceholder() {
        return `
            <div class="response-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>Response suggestions will appear here</p>
                <span>Listening for questions...</span>
            </div>
        `;
    }

    showLoading() {
        // Remove placeholder if exists
        const placeholder = this.listContainer.querySelector('.response-placeholder');
        if (placeholder) placeholder.remove();

        // Add loading item at top
        let loadingEl = this.listContainer.querySelector('.response-item.loading');
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.className = 'response-item loading';
            this.listContainer.insertBefore(loadingEl, this.listContainer.firstChild);
        }
        loadingEl.innerHTML = `
            <div class="response-loading">
                <div class="loading-spinner"></div>
                <p>Generating response...</p>
            </div>
        `;
    }

    hideLoading() {
        const loadingEl = this.listContainer.querySelector('.response-item.loading');
        if (loadingEl) loadingEl.remove();
    }

    showError(message) {
        this.hideLoading();
        const errorEl = document.createElement('div');
        errorEl.className = 'response-item error';
        errorEl.innerHTML = `
            <div class="response-error">
                <p>${message}</p>
            </div>
        `;
        this.listContainer.insertBefore(errorEl, this.listContainer.firstChild);
    }

    addToHistory(question, response) {
        this.responseHistory.unshift({
            question: question.substring(0, 100),
            response,
            timestamp: new Date()
        });

        // Keep only last 20 responses
        if (this.responseHistory.length > 20) {
            this.responseHistory.pop();
            // Remove last item from DOM
            const items = this.listContainer.querySelectorAll('.response-item');
            if (items.length > 20) {
                items[items.length - 1].remove();
            }
        }
    }

    clearHistory() {
        this.responseHistory = [];
        this.listContainer.innerHTML = this.getPlaceholder();
    }
}
