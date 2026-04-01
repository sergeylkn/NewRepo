const translateCache = new Map();
const geminiModelsCache = new Map();
const TRANSLATOR_SETTINGS_DEFAULTS = {
  translationProvider: "free",
  geminiApiKey: "",
  geminiModel: "gemini-2.0-flash"
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "translate-text") {
    translateText(message.text, message.targetLanguage || "ru")
      .then((translatedText) => sendResponse({ ok: true, translatedText }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));

    return true;
  }

  if (message?.type === "validate-gemini") {
    validateGemini(message.apiKey, message.targetLanguage || "ru")
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
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
  const geminiApiKey = normalizeApiKey(translatorSettings.geminiApiKey);
  if (provider === "gemini" && geminiApiKey) {
    try {
      translatedText = await translateWithGemini(
        normalized,
        target,
        geminiApiKey,
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

function normalizeApiKey(value) {
  return `${value || ""}`.replace(/\s+/g, "").trim();
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
  const result = await queryGemini({
    text,
    targetLanguage,
    apiKey,
    geminiModel
  });
  return result.translatedText || "";
}

async function validateGemini(apiKey, targetLanguage) {
  const normalizedKey = normalizeApiKey(apiKey);
  if (!normalizedKey) {
    throw new Error("Missing Gemini API key");
  }

  const result = await queryGemini({
    text: targetLanguage === "uk" ? "Hello, world!" : "Привет, мир!",
    targetLanguage,
    apiKey: normalizedKey,
    geminiModel: "gemini-2.0-flash"
  });
  return {
    model: result.model,
    version: result.version
  };
}

async function queryGemini({ text, targetLanguage, apiKey, geminiModel }) {
  const requestedModel = `${geminiModel || "gemini-2.0-flash"}`.trim() || "gemini-2.0-flash";
  const models = await getGeminiModelCandidates(apiKey, requestedModel);
  const models = Array.from(new Set([requestedModel, "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"]));
  const apiVersions = ["v1beta", "v1"];
  const prompt = buildGeminiPrompt(text, targetLanguage);
  let lastError = "";

  for (const model of models) {
    for (const version of apiVersions) {
      try {
        const translated = await requestGeminiTranslation({ prompt, model, version, apiKey });
        if (translated) {
          return { translatedText: translated, model, version };
        }
      } catch (error) {
        lastError = error?.message || "Gemini request failed";
      }
    }
  }

  throw new Error(lastError || "Gemini request failed");
}

async function getGeminiModelCandidates(apiKey, preferredModel) {
  const cacheKey = normalizeApiKey(apiKey);
  const now = Date.now();
  const cached = geminiModelsCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < 10 * 60 * 1000) {
    return rankGeminiModels(cached.models, preferredModel);
  }

  const discoveredModels = await discoverGeminiModels(cacheKey);
  if (discoveredModels.length) {
    geminiModelsCache.set(cacheKey, { models: discoveredModels, fetchedAt: now });
    return rankGeminiModels(discoveredModels, preferredModel);
  }

  return rankGeminiModels(["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"], preferredModel);
}

function rankGeminiModels(models, preferredModel) {
  const normalizedPreferred = `${preferredModel || ""}`.trim();
  const ranked = Array.from(new Set(models.filter(Boolean)));
  if (!normalizedPreferred) {
    return ranked;
  }
  if (ranked.includes(normalizedPreferred)) {
    return [normalizedPreferred, ...ranked.filter((item) => item !== normalizedPreferred)];
  }
  return [normalizedPreferred, ...ranked];
}

async function discoverGeminiModels(apiKey) {
  const discovered = [];
  for (const version of ["v1", "v1beta"]) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models?key=${encodeURIComponent(apiKey)}`);
      if (!response.ok) {
        continue;
      }

      const payload = await safeReadJson(response);
      const models = Array.isArray(payload?.models) ? payload.models : [];
      models.forEach((modelInfo) => {
        const supportsGenerate = Array.isArray(modelInfo?.supportedGenerationMethods)
          && modelInfo.supportedGenerationMethods.includes("generateContent");
        if (!supportsGenerate) {
          return;
        }
        const fullName = `${modelInfo?.name || ""}`;
        const shortName = fullName.replace(/^models\//, "").trim();
        if (shortName) {
          discovered.push(shortName);
        }
      });
    } catch (_error) {
      continue;
    }
  }

  return Array.from(new Set(discovered));
}

async function requestGeminiTranslation({ prompt, model, version, apiKey }) {
  const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${encodeURIComponent(model)}:generateContent`;
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
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  if (!response.ok) {
    const payload = await safeReadJson(response);
    const details = payload?.error?.message || payload?.error?.status || "unknown error";
    throw new Error(`Gemini ${version}/${model} failed with ${response.status}: ${details}`);
  }

  const payload = await response.json();
  const translatedText = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => `${part?.text || ""}`.trim())
    .join(" ")
    .trim();
  return translatedText || "";
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

function buildGeminiPrompt(text, targetLanguage) {
  const target = targetLanguage === "uk" ? "Ukrainian" : "Russian";
  return [
    `Translate the text to ${target}.`,
    "Output only the final translation without explanations, quotes, markdown, or extra labels.",
    `Text: ${text}`
  ].join("\n");
}
