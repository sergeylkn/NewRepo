(() => {
  const { state } = window.AIVTPRO;

  const els = {
    enabled: document.getElementById('enabled'),
    targetLanguage: document.getElementById('targetLanguage'),
    translationProvider: document.getElementById('translationProvider'),
    openAiApiKey: document.getElementById('openAiApiKey'),
    openAiWrap: document.getElementById('openAiWrap'),
    testKey: document.getElementById('testKey'),
    status: document.getElementById('status'),
    voiceEnabled: document.getElementById('voiceEnabled'),
    voiceUri: document.getElementById('voiceUri'),
    speechRate: document.getElementById('speechRate'),
    speechPitch: document.getElementById('speechPitch')
  };

  init().catch(() => undefined);

  async function init() {
    const s = await state.loadState();
    bindValues(s);
    await fillVoices(s.targetLanguage, s.voiceUri);
    bindEvents();
    refreshProviderUI();
  }

  function bindValues(s) {
    els.enabled.checked = s.enabled;
    els.targetLanguage.value = s.targetLanguage;
    els.translationProvider.value = s.translationProvider || 'google';
    els.openAiApiKey.value = s.openAiApiKey || '';
    els.voiceEnabled.checked = s.voiceEnabled;
    els.speechRate.value = s.speechRate;
    els.speechPitch.value = s.speechPitch;
  }

  function bindEvents() {
    Object.values(els).forEach((el) => {
      if (!el || !(el instanceof HTMLElement)) return;
      if (el === els.testKey || el === els.status || el === els.openAiWrap) return;
      el.addEventListener('change', persist);
    });

    els.targetLanguage.addEventListener('change', async () => {
      await fillVoices(els.targetLanguage.value, els.voiceUri.value);
      await persist();
    });

    els.translationProvider.addEventListener('change', refreshProviderUI);
    els.testKey.addEventListener('click', testOpenAiKey);
  }

  async function persist() {
    await state.saveState({
      enabled: els.enabled.checked,
      targetLanguage: els.targetLanguage.value,
      translationProvider: els.translationProvider.value,
      openAiApiKey: `${els.openAiApiKey.value || ''}`.trim(),
      voiceEnabled: els.voiceEnabled.checked,
      voiceUri: els.voiceUri.value,
      speechRate: Number(els.speechRate.value),
      speechPitch: Number(els.speechPitch.value)
    });
  }

  function refreshProviderUI() {
    const openAiVisible = els.translationProvider.value === 'openai';
    els.openAiWrap.style.display = openAiVisible ? 'grid' : 'none';
    els.testKey.style.display = openAiVisible ? 'inline-block' : 'none';
    if (!openAiVisible) els.status.textContent = '';
  }

  async function fillVoices(targetLanguage, selectedVoice) {
    const voices = await getVoices();
    const prefix = targetLanguage === 'uk' ? 'uk' : targetLanguage === 'en' ? 'en' : 'ru';
    const list = voices.filter((v) => `${v.lang || ''}`.toLowerCase().startsWith(prefix));
    const finalList = list.length ? list : voices;

    els.voiceUri.innerHTML = '<option value="">Auto</option>';
    finalList.forEach((v) => {
      const option = document.createElement('option');
      option.value = v.voiceURI;
      option.textContent = `${v.name} (${v.lang || 'unknown'})`;
      els.voiceUri.appendChild(option);
    });
    els.voiceUri.value = finalList.some((v) => v.voiceURI === selectedVoice) ? selectedVoice : '';
  }

  async function getVoices() {
    const voices = speechSynthesis.getVoices();
    if (voices.length) return voices;
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(speechSynthesis.getVoices()), 400);
      speechSynthesis.addEventListener('voiceschanged', () => {
        clearTimeout(t);
        resolve(speechSynthesis.getVoices());
      }, { once: true });
    });
  }

  async function testOpenAiKey() {
    const key = `${els.openAiApiKey.value || ''}`.trim();
    if (!key) {
      els.status.textContent = 'Enter key first';
      return;
    }
    els.status.textContent = 'Checking...';
    const response = await chrome.runtime.sendMessage({
      type: 'validate-openai',
      apiKey: key,
      targetLanguage: els.targetLanguage.value
    });

    els.status.textContent = response?.ok ? `OK: ${response.sample}` : `Error: ${response?.error || 'unknown'}`;
  }
})();
