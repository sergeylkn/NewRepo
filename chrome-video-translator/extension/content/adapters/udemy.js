(() => {
  const root = globalThis;
  function createUdemyAdapter() {
    const selector = '[data-purpose="captions-cue-text"], .udlite-caption-cue';
    let lastText = '';

    function read() {
      const nodes = Array.from(document.querySelectorAll(selector));
      const text = nodes.map((n) => n.textContent?.trim() || '').filter(Boolean).join(' ').trim();
      if (!text || text === lastText) return null;
      lastText = text;
      return { text, timestamp: Date.now(), source: 'udemy' };
    }

    return { canHandle: () => location.hostname.includes('udemy.com'), read };
  }

  root.AIVTPRO = root.AIVTPRO || {};
  root.AIVTPRO.adapters = root.AIVTPRO.adapters || {};
  root.AIVTPRO.adapters.udemy = { createUdemyAdapter };
})();
