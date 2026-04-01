# Project State

Last documented: 2026-04-01
Repository: `sergeylkn/NewRepo`
Primary branch: `master`
Current extension version: `1.4.0`

## What This Project Is
A Chrome extension that tries to translate video captions and subtitles in-place and speak the translated text aloud with browser TTS.

The extension is meant to work beyond YouTube. It currently targets common HTML5 video pages and popular player ecosystems where captions are exposed either through `textTracks` or through DOM caption containers.

## Current Capabilities
- Manifest V3 extension.
- Free translation fallback through `translate.googleapis.com`.
- Optional Gemini translation (user API key/subscription) with automatic fallback to free web translate on failure.
- Optional attempt to use Chrome built-in Translator API when available.
- Overlay subtitles rendered directly over the active video.
- Voice playback through `speechSynthesis`.
- Russian and Ukrainian as target translation languages.
- Multilingual popup interface: Auto, Russian, Ukrainian, English.
- Voice tuning in popup: voice selection, preview, speech rate, speech pitch.
- Original video audio ducking while translated speech is playing.
- Source badge over the video showing language, source and AI mode.

## Player And Subtitle Detection Coverage
The current `content.js` looks for captions in:
- HTML5 `textTracks`
- YouTube caption DOM
- JW Player caption DOM
- Video.js caption DOM
- Shaka Player caption DOM
- Plyr caption DOM
- Generic DOM markers containing caption or subtitle patterns

This is still heuristic. It works best when the site already exposes subtitles or caption text somewhere in the page or player API.

## Important Limitation
This is not full speech-to-speech dubbing for arbitrary audio streams.

If a page provides no captions, no subtitle track, and no visible DOM subtitle text, the current extension cannot produce accurate translation from raw audio alone. That would require a separate local or server speech-recognition pipeline.

## Architecture Summary
### `chrome-video-translator/manifest.json`
- Declares MV3.
- Uses `storage` permission.
- Uses `<all_urls>` host permission.
- Allows requests to `https://translate.googleapis.com/*`.
- Loads `background.js` as service worker.
- Loads `content.js` on all pages at `document_idle`.

### `chrome-video-translator/background.js`
- Receives `translate-text` messages from the content script.
- Sends requests to Google Translate web endpoint.
- Caches translations by `targetLanguage::text`.
- Valid target languages are currently `ru` and `uk`.

### `chrome-video-translator/content.js`
Main responsibilities:
- find the best active video element;
- detect caption sources via `textTracks` and DOM roots;
- build and maintain the overlay;
- debounce and merge incoming caption fragments;
- translate text with built-in AI when possible, otherwise use background fallback;
- queue and speak translated chunks with `speechSynthesis`;
- duck original video audio during translated speech;
- preserve performance on heavy pages.

Important performance decisions already implemented:
- cached caption elements;
- scheduled media refresh instead of constant rescans;
- scheduled caption refresh;
- `requestAnimationFrame` for overlay position refresh;
- limited keep-alive interval;
- no broad document-wide `characterData` observer;
- no naive full-page `querySelectorAll("*")` approach.

Important speech-quality decisions already implemented:
- buffered caption merging;
- debounce before translation;
- deduplication of speech chunks;
- speech queue instead of constant cancel/restart;
- sentence-like splitting for smoother TTS;
- softer defaults for `speechRate` and `speechPitch`.

### `chrome-video-translator/popup.html`
- Popup layout with sections for interface language, target language, voice settings and overlay settings.

### `chrome-video-translator/popup.css`
- Popup visual design and layout.
- Current UI is cleaner and lighter than early versions.

### `chrome-video-translator/popup.js`
- Stores and restores settings via `chrome.storage.sync`.
- Supports multilingual UI strings.
- Populates voice list.
- Provides voice preview.
- Keeps popup controls synced with current settings.

## Current Default Settings
- `enabled: true`
- `uiLanguage: auto`
- `targetLanguage: ru`
- `voiceEnabled: true`
- `translationProvider: free`
- `geminiApiKey: ""`
- `geminiModel: "gemini-2.0-flash"`
- `voiceUri: ""`
- `fontSize: 28`
- `speechRate: 0.92`
- `speechPitch: 0.96`
- `duckVideoVolume: true`
- `duckLevel: 0.2`
- `showSourceBadge: true`

## What The User Cares About Most Right Now
- The sound should be more pleasant and less robotic.
- The interface should remain multilingual.
- Chrome should not be overloaded.
- The project should remain usable for many video sites.
- The default path should stay free.

## Safe Next Steps
Good next improvements:
- better per-language voice presets;
- optional eco mode for very heavy pages;
- smarter caption-source prioritization per player;
- optional local/offline TTS or STT integration, but only as an addition, not as a forced replacement.

Avoid these mistakes:
- rewriting everything around a paid backend by default;
- removing the current free fallback;
- reintroducing aggressive DOM observation that makes Chrome heavy;
- treating the ZIP as the editable project source.

## Validation Commands
```powershell
node --check chrome-video-translator\background.js
node --check chrome-video-translator\content.js
node --check chrome-video-translator\popup.js
powershell -Command "Get-Content chrome-video-translator\manifest.json | ConvertFrom-Json | Out-Null"
powershell -Command "if (Test-Path chrome-video-translator.zip) { Remove-Item -LiteralPath chrome-video-translator.zip -Force }; Compress-Archive -Path chrome-video-translator\* -DestinationPath chrome-video-translator.zip -Force"
```
