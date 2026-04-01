(() => {
  const root = globalThis;
  function createGenericAdapter() {
    const selectors = [
      '.vjs-text-track-cue',
      '.jw-text-track-cue',
      '.shaka-text-container span',
      '[class*="caption"]',
      '[class*="subtitle"]'
    ];
    let lastText = '';

    function read() {
      for (const selector of selectors) {
        const nodes = Array.from(document.querySelectorAll(selector));
        const text = nodes.map((n) => n.textContent?.trim() || '').filter(Boolean).join(' ').trim();
        if (text && text !== lastText) {
          lastText = text;
          return { text, timestamp: Date.now(), source: 'generic' };
        }
      }
      return null;
    }

    return { canHandle: () => true, read };
  }

  root.AIVTPRO = root.AIVTPRO || {};
  root.AIVTPRO.adapters = root.AIVTPRO.adapters || {};
  root.AIVTPRO.adapters.generic = { createGenericAdapter };
})();
