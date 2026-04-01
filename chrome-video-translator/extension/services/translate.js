(() => {
  const root = globalThis;
  async function translateWithLibre(text, targetLanguage) {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'auto', target: targetLanguage, format: 'text' })
    });
    if (!response.ok) throw new Error(`LibreTranslate: ${response.status}`);
    const payload = await response.json();
    return payload?.translatedText?.trim() || '';
  }

  async function translateWithGoogle(text, targetLanguage) {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', 'auto');
    url.searchParams.set('tl', targetLanguage);
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', text);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Google fallback: ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload?.[0]) ? payload[0].map((i) => i?.[0] || '').join('').trim() : '';
  }

  async function translateByPriority({ text, targetLanguage, provider, openAiApiKey }) {
    if (provider === 'libre') {
      try {
        return await translateWithLibre(text, targetLanguage);
      } catch (_err) {
        return translateWithGoogle(text, targetLanguage);
      }
    }

    if (provider === 'openai' && openAiApiKey) {
      try {
        return await translateWithOpenAI(text, targetLanguage, openAiApiKey);
      } catch (_err) {
        return translateWithGoogle(text, targetLanguage);
      }
    }

    return translateWithGoogle(text, targetLanguage);
  }

  async function translateWithOpenAI(text, targetLanguage, apiKey) {
    const languageLabel = targetLanguage === 'uk' ? 'Ukrainian' : targetLanguage === 'en' ? 'English' : 'Russian';
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        input: `Translate to ${languageLabel}. Return translation only: ${text}`
      })
    });
    if (!response.ok) throw new Error(`OpenAI: ${response.status}`);
    const payload = await response.json();
    return payload?.output_text?.trim() || '';
  }

  root.AIVTPRO = root.AIVTPRO || {};
  root.AIVTPRO.translate = { translateByPriority };
})();
