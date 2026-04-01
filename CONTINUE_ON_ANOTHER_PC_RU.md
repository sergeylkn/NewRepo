# Продолжение Работы На Другом Компьютере

## Что Использовать
Если вам нужно продолжить разработку, используйте исходники из папки `chrome-video-translator/`.

`chrome-video-translator.zip` нужен в первую очередь как готовая сборка для установки, а не как основной исходник проекта.

## Подготовка На Другом Компьютере
1. Установите Git.
2. Установите Node.js.
3. Убедитесь, что Chrome установлен.
4. Откройте терминал PowerShell.

## Как Забрать Проект Из GitHub
```powershell
git clone https://github.com/sergeylkn/NewRepo.git
cd NewRepo
git pull origin master
```

## Где Продолжать Разработку
Работайте из корня репозитория, но редактируйте именно папку:

```text
chrome-video-translator/
```

## Быстрая Проверка Перед Работой
```powershell
node --check chrome-video-translator\background.js
node --check chrome-video-translator\content.js
node --check chrome-video-translator\popup.js
powershell -Command "Get-Content chrome-video-translator\manifest.json | ConvertFrom-Json | Out-Null"
```

Если эти команды проходят, состояние проекта не повреждено и можно продолжать.

## Как Проверить Расширение В Chrome
1. Откройте `chrome://extensions`.
2. Включите `Режим разработчика`.
3. Нажмите `Загрузить распакованное расширение`.
4. Выберите папку `chrome-video-translator`.
5. Откройте страницу с видео и проверьте перевод и озвучку.

## Как Продолжить Работу Через Другой Терминал
На любом новом терминале в будущем используйте такой старт:

```powershell
cd <папка_с_репозиторием>\NewRepo
git pull origin master
node --check chrome-video-translator\background.js
node --check chrome-video-translator\content.js
node --check chrome-video-translator\popup.js
```

После этого можно спокойно продолжать изменения.

## Как Собрать ZIP После Изменений
```powershell
powershell -Command "if (Test-Path chrome-video-translator.zip) { Remove-Item -LiteralPath chrome-video-translator.zip -Force }; Compress-Archive -Path chrome-video-translator\* -DestinationPath chrome-video-translator.zip -Force"
```

## Как Отправить Изменения Обратно В GitHub
```powershell
git status
git add .
git commit -m "Describe your change"
git push origin master
```

## Что Сказать Новому Codex
Перед началом работы дайте новому Codex такой порядок:
1. Прочитать `AGENTS.md`.
2. Прочитать `PROJECT_STATE.md`.
3. Прочитать этот файл.
4. Считать `chrome-video-translator/` источником истины.
5. Не переписывать архитектуру без явной причины.
6. После правок всегда проверять `manifest.json`, `background.js`, `content.js`, `popup.js` и пересобирать ZIP.
