importScripts('../utils/logger.js', '../utils/dom.js', '../services/state.js', '../services/cache.js', '../services/translate.js');

const { logger, dom, cache, translate, state } = self.AIVTPRO;

let settings = null;

async function bootstrap() {
  settings = await state.loadState();
  await cache.loadPersistentCache();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    Object.entries(changes).forEach(([key, value]) => {
      settings[key] = value.newValue;
    });
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'translate-subtitle') {
      handleTranslate(message)
        .then((translatedText) => sendResponse({ ok: true, translatedText }))
        .catch((error) => {
          logger.error('translate failed', error?.message || error);
          sendResponse({ ok: false, error: error?.message || 'Translation error' });
        });
      return true;
    }

    if (message?.type === 'validate-openai') {
      validateOpenAI(message.apiKey, message.targetLanguage || 'ru')
        .then((sample) => sendResponse({ ok: true, sample }))
        .catch((error) => sendResponse({ ok: false, error: error?.message || 'Validation failed' }));
      return true;
    }

    return false;
  });

  logger.info('background ready');
}

async function handleTranslate({ text, targetLanguage, provider }) {
  const normalized = `${text || ''}`.trim();
  if (!normalized) return '';

  const hash = dom.hashText(normalized);
  const key = cache.buildKey(hash, targetLanguage);
  const cached = cache.get(key);
  if (cached) return cached;

  const translatedText = await translate.translateByPriority({
    text: normalized,
    targetLanguage: targetLanguage || 'ru',
    provider: provider || settings.translationProvider,
    openAiApiKey: settings.openAiApiKey || ''
  });

  const finalText = translatedText || normalized;
  await cache.set(key, finalText);
  return finalText;
}

async function validateOpenAI(apiKey, targetLanguage) {
  const sample = await translate.translateByPriority({
    text: 'Hello world',
    targetLanguage,
    provider: 'openai',
    openAiApiKey: `${apiKey || ''}`.trim()
  });
  if (!sample) throw new Error('No response');
  return sample;
}

bootstrap().catch((error) => logger.error('bootstrap failed', error));
