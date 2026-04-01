const translateCache = new Map();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "translate-text") {
    return false;
  }

  translateText(message.text, message.targetLanguage || "ru")
    .then((translatedText) => sendResponse({ ok: true, translatedText }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function translateText(text, targetLanguage) {
  const normalized = `${text || ""}`.trim();
  const target = ["ru", "uk"].includes(targetLanguage) ? targetLanguage : "ru";
  if (!normalized) {
    return "";
  }

  const cacheKey = `${target}::${normalized}`;
  if (translateCache.has(cacheKey)) {
    return translateCache.get(cacheKey);
  }

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", target);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", normalized);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Translation request failed with ${response.status}`);
  }

  const payload = await response.json();
  const translatedText = Array.isArray(payload?.[0])
    ? payload[0].map((item) => item?.[0] || "").join("").trim()
    : normalized;

  translateCache.set(cacheKey, translatedText);
  return translatedText || normalized;
}
