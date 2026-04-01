# AGENTS.md

## Read First
1. Read `PROJECT_STATE.md`.
2. Read `CONTINUE_ON_ANOTHER_PC_RU.md`.
3. Read `PROMPT_FOR_NEXT_CODEX_RU.md` if a new Codex session needs a ready-made prompt.

## Source Of Truth
- The editable source of the extension is `chrome-video-translator/`.
- `chrome-video-translator.zip` is a build artifact only.
- If the ZIP and the source differ, the source wins.
- Never continue development from the ZIP alone when the source folder exists.

## Project Goal
This repository stores a Chrome extension that:
- finds captions and subtitle text on many video sites;
- translates them to Russian or Ukrainian;
- shows translated overlay text over the video;
- speaks the translation with browser voices;
- stays free by default and does not depend on paid cloud services unless the user explicitly asks for that.

## Current User Priorities
1. Pleasant voice output.
2. Convenient multilingual interface.
3. Lower Chrome load on heavy pages.
4. Broad compatibility across video sites, not only YouTube.
5. Stable behavior without silent rewrites.

## Do Not Break
- Manifest format: `manifest_version: 3`.
- Target translation languages: `ru`, `uk`.
- Popup UI languages: `auto`, `ru`, `uk`, `en`.
- Persisted storage keys:
  - `enabled`
  - `uiLanguage`
  - `targetLanguage`
  - `voiceEnabled`
  - `voiceUri`
  - `fontSize`
  - `speechRate`
  - `speechPitch`
  - `duckVideoVolume`
  - `duckLevel`
  - `showSourceBadge`
- Free web translation fallback through `https://translate.googleapis.com`.
- Optional built-in Chrome AI translator usage when the browser supports it.
- Performance strategy in `content.js`: cached caption roots, scheduled rescans, no aggressive global full-page caption scanning on every mutation.
- Voice strategy in `content.js`: queueing, buffering, deduplication, soft pauses, no aggressive restart for every tiny caption update.

## Key Files
- `chrome-video-translator/manifest.json`: extension manifest and permissions.
- `chrome-video-translator/background.js`: free translation request layer and cache.
- `chrome-video-translator/content.js`: player detection, subtitle extraction, translation flow, overlay rendering, speech queue, performance throttling.
- `chrome-video-translator/popup.html`: settings UI markup.
- `chrome-video-translator/popup.css`: popup styling.
- `chrome-video-translator/popup.js`: multilingual popup logic, settings persistence, voice selection and preview.

## Required Checks After Edits
Run these checks after changing the source:

```powershell
node --check chrome-video-translator\background.js
node --check chrome-video-translator\content.js
node --check chrome-video-translator\popup.js
powershell -Command "Get-Content chrome-video-translator\manifest.json | ConvertFrom-Json | Out-Null"
powershell -Command "if (Test-Path chrome-video-translator.zip) { Remove-Item -LiteralPath chrome-video-translator.zip -Force }; Compress-Archive -Path chrome-video-translator\* -DestinationPath chrome-video-translator.zip -Force"
```

## Safe Workflow
- Pull the latest repository state before editing.
- Keep user-visible behavior stable unless the task explicitly requires a change.
- Prefer improving voice quality and performance incrementally instead of rewriting the architecture.
- If you change storage structure or major behavior, update the root docs in the same commit.
- If a future task adds a backend or paid AI service, keep the free default path working unless the user explicitly says otherwise.
