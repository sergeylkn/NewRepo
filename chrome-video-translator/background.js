const translateCache = new Map();
const TRANSLATOR_SETTINGS_DEFAULTS = {
  translationProvider: "free",
  geminiApiKey: "",
  geminiModel: "gemini-2.0-flash"
};

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

  const translatorSettings = await chrome.storage.sync.get(TRANSLATOR_SETTINGS_DEFAULTS);
  const provider = normalizeProvider(translatorSettings.translationProvider);
  const cacheKey = `${provider}::${target}::${normalized}`;
  if (translateCache.has(cacheKey)) {
    return translateCache.get(cacheKey);
  }

  let translatedText = "";
  if (provider === "gemini" && translatorSettings.geminiApiKey.trim()) {
    try {
      translatedText = await translateWithGemini(
        normalized,
        target,
        translatorSettings.geminiApiKey.trim(),
        translatorSettings.geminiModel
      );
    } catch (_error) {
      translatedText = "";
    }
  }

  if (!translatedText) {
    translatedText = await translateWithGoogle(normalized, target);
  }

  translateCache.set(cacheKey, translatedText);
  return translatedText || normalized;
}

function normalizeProvider(provider) {
  return provider === "gemini" ? "gemini" : "free";
}

async function translateWithGoogle(text, targetLanguage) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", targetLanguage);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Translation request failed with ${response.status}`);
  }

  const payload = await response.json();
  const translatedText = Array.isArray(payload?.[0])
    ? payload[0].map((item) => item?.[0] || "").join("").trim()
    : text;
  return translatedText || text;
}

async function translateWithGemini(text, targetLanguage, apiKey, geminiModel) {
  const model = `${geminiModel || "gemini-2.0-flash"}`.trim() || "gemini-2.0-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 300
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildGeminiPrompt(text, targetLanguage)
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const payload = await response.json();
  const translatedText = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => `${part?.text || ""}`.trim())
    .join(" ")
    .trim();
  return translatedText || "";
}

function buildGeminiPrompt(text, targetLanguage) {
  const target = targetLanguage === "uk" ? "Ukrainian" : "Russian";
  return [
    `Translate the text to ${target}.`,
    "Output only the final translation without explanations, quotes, markdown, or extra labels.",
    `Text: ${text}`
  ].join("\n");
}
