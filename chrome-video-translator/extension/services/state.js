(() => {
  const root = globalThis;
  const DEFAULT_STATE = {
    enabled: true,
    targetLanguage: 'ru',
    voiceEnabled: true,
    voiceUri: '',
    speechRate: 0.95,
    speechPitch: 1,
    uiLanguage: 'auto',
    translationProvider: 'google',
    showOverlay: true
  };

  async function loadState() {
    return chrome.storage.sync.get(DEFAULT_STATE);
  }

  async function saveState(patch) {
    await chrome.storage.sync.set(patch);
  }

  function subscribe(callback) {
    const listener = (changes, area) => {
      if (area !== 'sync') return;
      callback(changes);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  root.AIVTPRO = root.AIVTPRO || {};
  root.AIVTPRO.state = { DEFAULT_STATE, loadState, saveState, subscribe };
})();
