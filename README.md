# Interview Copilot Assistant

An AI-powered interview assistant designed to provide real-time suggestions and guidance during interviews. It operates via a standalone web dashboard or as a Chrome Extension that injects directly into meeting platforms like Google Meet, Zoom, and Microsoft Teams.

## Features

- **Real-Time Audio Transcription**: Uses the browser's Web Speech API (Dashboard) and Groq's high-speed Whisper endpoint (Extension) for continuous, accurate transcription.
- **AI-Powered Suggested Answers**: Leverages top-tier LLMs via OpenRouter (Gemini, Claude, GPT) to instantly generate concise, ready-to-speak answers tailored to your context.
- **Context-Aware Responses**: Personalizes AI suggestions using your pasted Resume, Job Description, and Work Experience.
- **Dual Interfaces**: 
  - **Standalone Dashboard**: A clean web interface to manually control transcription and view response history.
  - **Chrome Extension Overlay**: A native-feeling widget that injects into meeting platforms, capturing tab audio securely via an offscreen document.

## How It Works

### Architecture
1. **Audio Capture**: 
   - Dashboard: Uses native Web Speech API.
   - Extension: Uses `chrome.tabCapture` combined with an offscreen document to bypass manifest restrictions, recording tab audio as WebM chunks.
2. **Transcription**: The extension sends audio chunks to Groq's APIs (`whisper-large-v3`) for near-instant transcription.
3. **Response Generation**: The transcribed text, along with your configured resume and job description, is sent to OpenRouter via streaming.
4. **Display**: The response is formatted with syntax highlighting and markdown support, displayed in the UI for quick reading.

## Setup & Installation

### API Keys Required
You will need API keys to use the full capabilities of the assistant:
1. **[OpenRouter API Key](https://openrouter.ai/)**: For generating the answers using AI models.
2. **[Groq API Key](https://console.groq.com/)**: (Only required for the Chrome extension) For fast audio transcription.

### Running the Web Dashboard (Local)
1. Clone the repository.
2. Start a local server. For example: `python -m http.server 8080`
3. Open `http://localhost:8080/index.html` in your browser.
4. Click the "Settings" gear, add your OpenRouter API key and resume details.
5. Click "Start Listening".

### Installing the Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `extension` folder from this repository.
4. Click the Interview Copilot icon in your extensions list to open the popup.
5. Enter your **OpenRouter** and **Groq** API keys, along with your resume and job description.
6. Join a supported meeting (Google Meet, Zoom, etc.) and click the "🎤" icon injected into the page to start capturing audio.

## Supported Meeting Platforms (Extension)
- Google Meet (`https://meet.google.com/*`)
- Zoom Web (`https://app.zoom.us/*`, `https://*.zoom.us/*`)
- Microsoft Teams (`https://teams.microsoft.com/*`)

## Project Structure
- `/index.html`, `/styles.css`, `/js/`: Web dashboard files.
- `/extension/`: Chrome extension manifest, scripts, and popup UI.
  - `background.js` & `offscreen.js`: Handles tab audio capture.
  - `content.js`: Injects the overlay UI into meeting platforms.
  - `popup.js`: Settings configuration modal.
