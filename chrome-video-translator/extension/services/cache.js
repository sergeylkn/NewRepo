(() => {
  const root = globalThis;
  const memoryCache = new Map();
  const STORAGE_KEY = 'translationCacheV1';
  const TTL_MS = 1000 * 60 * 60 * 24;

  async function loadPersistentCache() {
    const payload = await chrome.storage.local.get(STORAGE_KEY);
    const data = payload?.[STORAGE_KEY] || {};
    Object.entries(data).forEach(([key, entry]) => {
      if (entry?.expiresAt > Date.now()) {
        memoryCache.set(key, entry);
      }
    });
  }

  function buildKey(hash, targetLanguage) {
    return `${hash}::${targetLanguage}`;
  }

  function get(key) {
    const entry = memoryCache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value;
  }

  async function set(key, value) {
    memoryCache.set(key, { value, expiresAt: Date.now() + TTL_MS });
    await flush();
  }

  async function flush() {
    const compact = {};
    memoryCache.forEach((entry, key) => {
      if (entry.expiresAt > Date.now()) compact[key] = entry;
    });
    await chrome.storage.local.set({ [STORAGE_KEY]: compact });
  }

  root.AIVTPRO = root.AIVTPRO || {};
  root.AIVTPRO.cache = { loadPersistentCache, buildKey, get, set };
})();
