# Prompt For Next Codex

Use this prompt when you open the repository in a new Codex session:

```text
Прочитай `AGENTS.md`, `PROJECT_STATE.md` и `CONTINUE_ON_ANOTHER_PC_RU.md` перед любой работой.

Считай `chrome-video-translator/` единственным источником истины для исходников расширения. `chrome-video-translator.zip` — это только build artifact.

Не ломай текущую архитектуру без необходимости. Сохрани:
- Manifest V3.
- Бесплатный fallback-перевод.
- Поддержку `ru` и `uk` как языков перевода.
- Многоязычный popup (`auto`, `ru`, `uk`, `en`).
- Текущие storage keys.
- Оптимизации производительности в `content.js`.
- Очередь и сглаживание озвучки в `content.js`.

Сначала проверь текущее состояние командами:
- `node --check chrome-video-translator\\background.js`
- `node --check chrome-video-translator\\content.js`
- `node --check chrome-video-translator\\popup.js`
- `powershell -Command "Get-Content chrome-video-translator\\manifest.json | ConvertFrom-Json | Out-Null"`

Только после этого продолжай работу над задачей. Если меняешь исходники, пересобери `chrome-video-translator.zip` и обнови документацию, если поведение или структура проекта изменились.
```
