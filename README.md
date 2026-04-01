# Chrome Video Translator

Chrome extension for translating video captions and speaking the translation aloud.

This repository is prepared so you can continue the project from another computer, another terminal, or a new Codex session without losing context.

## Start Here
- Source code: `chrome-video-translator/`
- Build artifact (local only): `chrome-video-translator.zip`
- Install guide: `INSTALL_RU.md`
- Project state: `PROJECT_STATE.md`
- Rules for the next Codex: `AGENTS.md`
- Continue from another PC: `CONTINUE_ON_ANOTHER_PC_RU.md`
- Ready prompt for a new Codex: `PROMPT_FOR_NEXT_CODEX_RU.md`

## Source Of Truth
`chrome-video-translator/` is the source of truth.

`chrome-video-translator.zip` is only the packaged build for installation and is not stored in GitHub by default. If the ZIP and the source folder differ, continue from the source folder.

## What The Extension Does
- detects caption and subtitle text on many video sites;
- translates subtitles to Russian or Ukrainian;
- shows translated text over the video;
- speaks the translation with browser voices;
- can lower the original video volume while translated speech is playing;
- keeps a free default path without paid APIs.

## Current State
- Manifest V3
- Extension version: `1.4.0`
- Target translation languages: `ru`, `uk`
- Popup UI languages: `auto`, `ru`, `uk`, `en`
- Free translation fallback: `translate.googleapis.com`
- Optional Chrome built-in AI translation when supported

## Quick Install In Chrome
1. Download or clone the repository.
2. Open `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the folder `chrome-video-translator`.

If you need ZIP installation, build it locally from `chrome-video-translator/`.

## Continue On Another Computer
```powershell
git clone https://github.com/sergeylkn/NewRepo.git
cd NewRepo
git pull origin master
```

Then validate the project state:

```powershell
node --check chrome-video-translator\background.js
node --check chrome-video-translator\content.js
node --check chrome-video-translator\popup.js
powershell -Command "Get-Content chrome-video-translator\manifest.json | ConvertFrom-Json | Out-Null"
```

## If You Open This Repo With A New Codex
Tell it to read these files first:
1. `AGENTS.md`
2. `PROJECT_STATE.md`
3. `CONTINUE_ON_ANOTHER_PC_RU.md`

Then tell it:
- treat `chrome-video-translator/` as the only source of truth;
- do not rewrite the architecture without a real reason;
- preserve the free fallback path and current performance optimizations.

## Repo Structure
- `chrome-video-translator/manifest.json` — extension manifest
- `chrome-video-translator/background.js` — translation request layer and cache
- `chrome-video-translator/content.js` — subtitle detection, translation flow, overlay, speech queue, performance logic
- `chrome-video-translator/popup.html` — popup markup
- `chrome-video-translator/popup.css` — popup styles
- `chrome-video-translator/popup.js` — multilingual popup logic and settings
- `chrome-video-translator.zip` — packaged extension (generated locally, ignored in Git)

## Recommended Workflow
1. Pull the latest state from GitHub.
2. Edit files only inside `chrome-video-translator/`.
3. Re-run syntax and manifest checks.
4. Rebuild `chrome-video-translator.zip` locally when needed.
5. Commit and push changes back to GitHub.

ZIP rebuild command:

```powershell
powershell -Command "if (Test-Path chrome-video-translator.zip) { Remove-Item -LiteralPath chrome-video-translator.zip -Force }; Compress-Archive -Path chrome-video-translator\* -DestinationPath chrome-video-translator.zip -Force"
```

## Important Limitation
This is not full speech-to-speech dubbing for arbitrary video audio.

The extension works best when the site already exposes captions through `textTracks` or visible subtitle DOM elements.
