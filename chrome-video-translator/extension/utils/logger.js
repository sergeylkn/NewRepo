(() => {
  const root = globalThis;
  const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
  const state = { level: 'info' };

  function setLevel(level) {
    if (LEVELS[level]) state.level = level;
  }

  function shouldLog(level) {
    return LEVELS[level] >= LEVELS[state.level];
  }

  function log(level, ...args) {
    if (!shouldLog(level)) return;
    const prefix = `[AI Video Translator PRO][${level.toUpperCase()}]`;
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](prefix, ...args);
  }

  root.AIVTPRO = root.AIVTPRO || {};
  root.AIVTPRO.logger = {
    setLevel,
    debug: (...args) => log('debug', ...args),
    info: (...args) => log('info', ...args),
    warn: (...args) => log('warn', ...args),
    error: (...args) => log('error', ...args)
  };
})();
