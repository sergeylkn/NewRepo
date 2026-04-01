(() => {
  const { logger, dom, state, tts } = window.AIVTPRO;

  let settings = null;
  let adapter = null;
  let overlay = null;
  let lastRendered = '';

  async function init() {
    settings = await state.loadState();
    adapter = resolveAdapter();
    overlay = ensureOverlay();

    observeCaptions();
    state.subscribe((changes) => {
      Object.keys(changes).forEach((k) => {
        settings[k] = changes[k].newValue;
      });
    });

    logger.info('content initialized', adapter?.name || 'adapter');
  }

  function resolveAdapter() {
    const adapters = [
      window.AIVTPRO.adapters.youtube.createYouTubeAdapter(),
      window.AIVTPRO.adapters.udemy.createUdemyAdapter(),
      window.AIVTPRO.adapters.generic.createGenericAdapter()
    ];
    return adapters.find((item) => item.canHandle()) || adapters[adapters.length - 1];
  }

  function ensureOverlay() {
    const root = document.createElement('div');
    root.id = 'aivtpro-overlay';
    Object.assign(root.style, {
      position: 'fixed',
      left: '50%',
      bottom: '8%',
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      padding: '8px 14px',
      borderRadius: '10px',
      maxWidth: '75vw',
      fontSize: '24px',
      textAlign: 'center',
      pointerEvents: 'none',
      display: 'none'
    });
    document.documentElement.appendChild(root);
    return root;
  }

  const processUpdate = dom.debounce(async () => {
    if (!settings?.enabled) return;
    const subtitle = adapter.read();
    if (!subtitle?.text) return;

    const response = await chrome.runtime.sendMessage({
      type: 'translate-subtitle',
      text: subtitle.text,
      targetLanguage: settings.targetLanguage,
      provider: settings.translationProvider
    });

    const translated = response?.translatedText?.trim() || subtitle.text;
    if (translated === lastRendered) return;

    lastRendered = translated;
    if (settings.showOverlay) {
      overlay.style.display = 'block';
      overlay.textContent = translated;
    }

    if (settings.voiceEnabled) {
      tts.speak({
        text: translated,
        targetLanguage: settings.targetLanguage,
        voiceUri: settings.voiceUri,
        rate: settings.speechRate,
        pitch: settings.speechPitch
      });
    }
  }, 140);

  function observeCaptions() {
    const observer = new MutationObserver(() => processUpdate());
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
    window.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
  }

  init().catch((error) => logger.error('content init failed', error));
})();
