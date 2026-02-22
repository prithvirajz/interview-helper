// OpenRouter API client with streaming support

import { SYSTEM_PROMPT, buildUserMessage } from './prompts.js';

export class OpenRouterClient {
    constructor() {
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.apiKey = '';
        this.model = 'google/gemini-2.0-flash-001';
        this.abortController = null;
    }

    setApiKey(key) {
        this.apiKey = key;
    }

    setModel(model) {
        this.model = model;
    }

    async generateResponse(transcript, profile, interviewType, onChunk, onComplete, onError) {
        if (!this.apiKey) {
            onError('API key not configured. Please add your OpenRouter API key in settings.');
            return;
        }

        if (!transcript.trim()) {
            onError('No transcript to analyze.');
            return;
        }

        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        const userMessage = buildUserMessage(transcript, profile, interviewType);

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Interview Copilot Assistant'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: userMessage }
                    ],
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 2000
                }),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `API error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || '';
                            if (content) {
                                fullResponse += content;
                                if (onChunk) onChunk(fullResponse);
                            }
                        } catch (e) {

                        }
                    }
                }
            }

            if (onComplete) onComplete(fullResponse);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request aborted');
                return;
            }
            console.error('OpenRouter API error:', error);
            if (onError) onError(error.message);
        }
    }

    abort() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}

export const AVAILABLE_MODELS = [
    { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (Recommended)' },
    { value: 'google/gemini-pro', label: 'Gemini Pro' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku (Fast)' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
    { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' }
];
