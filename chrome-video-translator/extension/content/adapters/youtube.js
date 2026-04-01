(() => {
  const root = globalThis;
  function createYouTubeAdapter() {
    const selector = '.ytp-caption-segment';
    let lastText = '';

    function read() {
      const nodes = Array.from(document.querySelectorAll(selector));
      const text = nodes.map((n) => n.textContent?.trim() || '').filter(Boolean).join(' ').trim();
      if (!text || text === lastText) return null;
      lastText = text;
      return { text, timestamp: Date.now(), source: 'youtube' };
    }

    return { canHandle: () => location.hostname.includes('youtube.com'), read };
  }

  root.AIVTPRO = root.AIVTPRO || {};
  root.AIVTPRO.adapters = root.AIVTPRO.adapters || {};
  root.AIVTPRO.adapters.youtube = { createYouTubeAdapter };
})();
