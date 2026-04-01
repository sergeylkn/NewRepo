const DEFAULT_SETTINGS = {
  enabled: true,
  uiLanguage: "auto",
  targetLanguage: "ru",
  translationProvider: "free",
  geminiApiKey: "",
  geminiModel: "gemini-2.0-flash",
  voiceEnabled: true,
  voiceUri: "",
  fontSize: 28,
  speechRate: 0.92,
  speechPitch: 0.96,
  duckVideoVolume: true,
  duckLevel: 0.2,
  showSourceBadge: true
};

const I18N = {
  en: {
    pageTitle: "Video Translator",
    eyebrow: "Free AI + Voice",
    title: "Video Translator",
    subtitle: "Translate subtitles, speak them with a smoother browser voice, and keep the controls easy to tune.",
    statusChip: "Optimized mode uses cached subtitle roots, slower page discovery, and automatic local-AI fallback when Chrome supports it.",
    uiLanguageLabel: "Interface language",
    enableTranslation: "Enable translation",
    targetLanguageLabel: "Target language",
    translationProviderLabel: "Translation engine",
    geminiApiKeyLabel: "Gemini API key (optional)",
    testGemini: "Check Gemini key",
    providerFree: "Free web translate",
    providerGemini: "Gemini (my subscription)",
    speakTranslation: "Speak translation",
    voiceSection: "Voice",
    voiceOutputLabel: "Voice output",
    previewVoice: "Preview voice",
    resetTuning: "Reset tuning",
    speechRateLabel: "Speech rate",
    speechPitchLabel: "Speech pitch",
    overlaySection: "Overlay",
    subtitleSizeLabel: "Subtitle size",
    duckVideoVolumeLabel: "Duck original video audio",
    duckLevelLabel: "Video volume while speaking",
    showSourceBadgeLabel: "Show source badge",
    note: "Tip: if Chrome becomes busy on a heavy page, reload the tab once after enabling subtitles so the extension can lock onto the active player and keep DOM scanning lighter.",
    optionAuto: "Auto",
    optionRussian: "Russian",
    optionUkrainian: "Ukrainian",
    optionEnglish: "English",
    autoVoice: "Auto pick best voice"
  },
  ru: {
    pageTitle: "Video Translator",
    eyebrow: "Free AI + Voice",
    title: "Переводчик Видео",
    subtitle: "Переводит субтитры, озвучивает их более мягким голосом браузера и оставляет настройки простыми и понятными.",
    statusChip: "Облегченный режим использует кэш caption-элементов, более редкий поиск по странице и автоматический переход на локальный AI, если Chrome его поддерживает.",
    uiLanguageLabel: "Язык интерфейса",
    enableTranslation: "Включить перевод",
    targetLanguageLabel: "Язык перевода",
    translationProviderLabel: "Движок перевода",
    geminiApiKeyLabel: "Gemini API key (необязательно)",
    testGemini: "Проверить Gemini ключ",
    providerFree: "Бесплатный web-перевод",
    providerGemini: "Gemini (моя подписка)",
    speakTranslation: "Озвучивать перевод",
    voiceSection: "Голос",
    voiceOutputLabel: "Голос озвучки",
    previewVoice: "Проба голоса",
    resetTuning: "Сбросить настройки",
    speechRateLabel: "Скорость речи",
    speechPitchLabel: "Высота голоса",
    overlaySection: "Поверх видео",
    subtitleSizeLabel: "Размер субтитров",
    duckVideoVolumeLabel: "Приглушать звук видео",
    duckLevelLabel: "Громкость видео во время озвучки",
    showSourceBadgeLabel: "Показывать бейдж источника",
    note: "Подсказка: если вкладка тяжёлая и Chrome нагружается, после включения субтитров один раз обновите страницу — расширение быстрее зафиксирует активный плеер и будет меньше сканировать DOM.",
    optionAuto: "Авто",
    optionRussian: "Русский",
    optionUkrainian: "Украинский",
    optionEnglish: "Английский",
    autoVoice: "Автоматически выбрать лучший голос"
  },
  uk: {
    pageTitle: "Video Translator",
    eyebrow: "Free AI + Voice",
    title: "Перекладач Вiдео",
    subtitle: "Перекладає субтитри, озвучує їх м'якшим голосом браузера й залишає налаштування простими та зручними.",
    statusChip: "Полегшений режим використовує кеш caption-елементів, рідший пошук по сторінці й автоматичний перехід на локальний AI, якщо Chrome його підтримує.",
    uiLanguageLabel: "Мова iнтерфейсу",
    enableTranslation: "Увiмкнути переклад",
    targetLanguageLabel: "Мова перекладу",
    translationProviderLabel: "Рушій перекладу",
    geminiApiKeyLabel: "Gemini API key (необов’язково)",
    testGemini: "Перевірити Gemini ключ",
    providerFree: "Безкоштовний web-переклад",
    providerGemini: "Gemini (моя підписка)",
    speakTranslation: "Озвучувати переклад",
    voiceSection: "Голос",
    voiceOutputLabel: "Голос озвучення",
    previewVoice: "Прослухати голос",
    resetTuning: "Скинути налаштування",
    speechRateLabel: "Швидкiсть мовлення",
    speechPitchLabel: "Висота голосу",
    overlaySection: "Поверх вiдео",
    subtitleSizeLabel: "Розмiр субтитрiв",
    duckVideoVolumeLabel: "Приглушувати звук вiдео",
    duckLevelLabel: "Гучнiсть вiдео пiд час озвучення",
    showSourceBadgeLabel: "Показувати бейдж джерела",
    note: "Пiдказка: якщо сторiнка важка i Chrome навантажується, пiсля увiмкнення субтитрiв один раз перезавантажте вкладку — розширення швидше зафiксує активний плеєр i менше скануватиме DOM.",
    optionAuto: "Авто",
    optionRussian: "Росiйська",
    optionUkrainian: "Українська",
    optionEnglish: "Англiйська",
    autoVoice: "Автоматично вибрати кращий голос"
  }
};

const enabledInput = document.getElementById("enabled");
const uiLanguageInput = document.getElementById("uiLanguage");
const targetLanguageInput = document.getElementById("targetLanguage");
const translationProviderInput = document.getElementById("translationProvider");
const geminiApiKeyInput = document.getElementById("geminiApiKey");
const testGeminiButton = document.getElementById("testGemini");
const geminiStatus = document.getElementById("geminiStatus");
const voiceEnabledInput = document.getElementById("voiceEnabled");
const voiceUriInput = document.getElementById("voiceUri");
const previewVoiceButton = document.getElementById("previewVoice");
const resetTuningButton = document.getElementById("resetTuning");
const fontSizeInput = document.getElementById("fontSize");
const fontSizeValue = document.getElementById("fontSizeValue");
const speechRateInput = document.getElementById("speechRate");
const speechRateValue = document.getElementById("speechRateValue");
const speechPitchInput = document.getElementById("speechPitch");
const speechPitchValue = document.getElementById("speechPitchValue");
const duckVideoVolumeInput = document.getElementById("duckVideoVolume");
const duckLevelInput = document.getElementById("duckLevel");
const duckLevelValue = document.getElementById("duckLevelValue");
const showSourceBadgeInput = document.getElementById("showSourceBadge");

let availableVoices = [];

initialize().catch(() => undefined);

async function initialize() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  bindStaticValues(settings);
  renderUi(settings);
  await populateVoiceOptions(settings.targetLanguage, settings.voiceUri, settings);
  bindEvents();
}

function bindStaticValues(settings) {
  enabledInput.checked = settings.enabled;
  uiLanguageInput.value = settings.uiLanguage;
  targetLanguageInput.value = settings.targetLanguage;
  voiceEnabledInput.checked = settings.voiceEnabled;
  translationProviderInput.value = settings.translationProvider === "gemini" ? "gemini" : "free";
  geminiApiKeyInput.value = settings.geminiApiKey || "";
  fontSizeInput.value = settings.fontSize;
  speechRateInput.value = settings.speechRate;
  speechPitchInput.value = settings.speechPitch;
  duckVideoVolumeInput.checked = settings.duckVideoVolume;
  duckLevelInput.value = settings.duckLevel;
  showSourceBadgeInput.checked = settings.showSourceBadge;
  renderValues(settings);
}

function bindEvents() {
  enabledInput.addEventListener("change", () => void persistSettings());
  uiLanguageInput.addEventListener("change", () => void persistSettings({ rerenderUi: true }));
  targetLanguageInput.addEventListener("change", async () => {
    const nextSettings = collectSettingsFromForm();
    renderUi(nextSettings);
    await populateVoiceOptions(nextSettings.targetLanguage, voiceUriInput.value, nextSettings);
    await persistSettings();
  });
  translationProviderInput.addEventListener("change", () => void persistSettings({ rerenderUi: true }));
  geminiApiKeyInput.addEventListener("change", () => void persistSettings());
  geminiApiKeyInput.addEventListener("blur", () => void persistSettings());
  testGeminiButton.addEventListener("click", () => void runGeminiCheck());
  voiceEnabledInput.addEventListener("change", () => void persistSettings());
  voiceUriInput.addEventListener("change", () => void persistSettings());
  fontSizeInput.addEventListener("input", () => void persistSettings());
  speechRateInput.addEventListener("input", () => void persistSettings());
  speechPitchInput.addEventListener("input", () => void persistSettings());
  duckVideoVolumeInput.addEventListener("change", () => void persistSettings());
  duckLevelInput.addEventListener("input", () => void persistSettings());
  showSourceBadgeInput.addEventListener("change", () => void persistSettings());
  previewVoiceButton.addEventListener("click", previewVoice);
  resetTuningButton.addEventListener("click", () => void resetTuning());

  if (typeof speechSynthesis !== "undefined") {
    if (typeof speechSynthesis.addEventListener === "function") {
      speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    } else {
      speechSynthesis.onvoiceschanged = handleVoicesChanged;
    }
  }
}

async function handleVoicesChanged() {
  const settings = collectSettingsFromForm();
  await populateVoiceOptions(settings.targetLanguage, voiceUriInput.value, settings);
}

function collectSettingsFromForm() {
  return {
    enabled: enabledInput.checked,
    uiLanguage: uiLanguageInput.value,
    targetLanguage: targetLanguageInput.value,
    translationProvider: translationProviderInput.value === "gemini" ? "gemini" : "free",
    geminiApiKey: normalizeApiKey(geminiApiKeyInput.value),
    geminiModel: "gemini-2.0-flash",
    voiceEnabled: voiceEnabledInput.checked,
    voiceUri: voiceUriInput.value,
    fontSize: Number(fontSizeInput.value),
    speechRate: Number(speechRateInput.value),
    speechPitch: Number(speechPitchInput.value),
    duckVideoVolume: duckVideoVolumeInput.checked,
    duckLevel: Number(duckLevelInput.value),
    showSourceBadge: showSourceBadgeInput.checked
  };
}

async function persistSettings(options = {}) {
  const nextSettings = collectSettingsFromForm();
  renderValues(nextSettings);
  if (options.rerenderUi) {
    renderUi(nextSettings);
    await populateVoiceOptions(nextSettings.targetLanguage, voiceUriInput.value, nextSettings);
  }
  await chrome.storage.sync.set(nextSettings);
}

function renderUi(settings) {
  const uiLanguage = getResolvedUiLanguage(settings.uiLanguage);
  const text = I18N[uiLanguage] || I18N.en;

  document.documentElement.lang = uiLanguage;
  document.title = text.pageTitle;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (key && text[key]) {
      element.textContent = text[key];
    }
  });

  setSelectOptionText(uiLanguageInput, "auto", text.optionAuto);
  setSelectOptionText(uiLanguageInput, "ru", text.optionRussian);
  setSelectOptionText(uiLanguageInput, "uk", text.optionUkrainian);
  setSelectOptionText(uiLanguageInput, "en", text.optionEnglish);

  setSelectOptionText(targetLanguageInput, "ru", text.optionRussian);
  setSelectOptionText(targetLanguageInput, "uk", text.optionUkrainian);
  setSelectOptionText(translationProviderInput, "free", text.providerFree);
  setSelectOptionText(translationProviderInput, "gemini", text.providerGemini);
  updateProviderVisibility();
}

function setSelectOptionText(select, value, label) {
  const option = Array.from(select.options).find((item) => item.value === value);
  if (option) {
    option.textContent = label;
  }
}

function getResolvedUiLanguage(setting) {
  if (setting && setting !== "auto" && I18N[setting]) {
    return setting;
  }

  const browserLanguage = `${navigator.language || "en"}`.toLowerCase();
  if (browserLanguage.startsWith("uk")) {
    return "uk";
  }
  if (browserLanguage.startsWith("ru")) {
    return "ru";
  }
  return "en";
}

function updateProviderVisibility() {
  const showGeminiKey = translationProviderInput.value === "gemini";
  const field = geminiApiKeyInput.closest(".field");
  const buttonRow = testGeminiButton.closest(".button-row");
  if (!field) {
    return;
  }
  field.style.display = showGeminiKey ? "flex" : "none";
  if (buttonRow) {
    buttonRow.style.display = showGeminiKey ? "flex" : "none";
  }
  geminiStatus.style.display = showGeminiKey ? "block" : "none";
  if (!showGeminiKey) {
    geminiStatus.textContent = "";
  }
}

function normalizeApiKey(value) {
  return `${value || ""}`.replace(/\s+/g, "").trim();
}

async function runGeminiCheck() {
  const apiKey = normalizeApiKey(geminiApiKeyInput.value);
  if (!apiKey) {
    geminiStatus.textContent = getStatusText("missingKey");
    return;
  }

  geminiStatus.textContent = getStatusText("checking");
  const response = await chrome.runtime.sendMessage({
    type: "validate-gemini",
    apiKey,
    targetLanguage: targetLanguageInput.value
  });

  if (response?.ok) {
    const usedModel = response.model || "unknown model";
    geminiStatus.textContent = getStatusText("ok", usedModel);
    return;
  }

  geminiStatus.textContent = getStatusText("error", response?.error || "unknown error");
}

function getStatusText(state, details = "") {
  const uiLanguage = getResolvedUiLanguage(uiLanguageInput.value);
  if (uiLanguage === "ru") {
    if (state === "missingKey") return "Введите Gemini API key.";
    if (state === "checking") return "Проверяю ключ Gemini...";
    if (state === "ok") return `Gemini OK (${details}).`;
    return `Ошибка Gemini: ${details}`;
  }
  if (uiLanguage === "uk") {
    if (state === "missingKey") return "Введіть Gemini API key.";
    if (state === "checking") return "Перевіряю ключ Gemini...";
    if (state === "ok") return `Gemini OK (${details}).`;
    return `Помилка Gemini: ${details}`;
  }

  if (state === "missingKey") return "Enter Gemini API key.";
  if (state === "checking") return "Checking Gemini key...";
  if (state === "ok") return `Gemini OK (${details}).`;
  return `Gemini error: ${details}`;
}

async function populateVoiceOptions(targetLanguage, selectedVoiceUri, settings) {
  availableVoices = await getVoices();
  const uiLanguage = getResolvedUiLanguage(settings?.uiLanguage || uiLanguageInput.value || "auto");
  const text = I18N[uiLanguage] || I18N.en;
  const preferredPrefix = targetLanguage === "uk" ? "uk" : "ru";
  const matchingVoices = availableVoices.filter((voice) => `${voice.lang || ""}`.toLowerCase().startsWith(preferredPrefix));
  const voiceList = matchingVoices.length ? matchingVoices : availableVoices;

  voiceUriInput.innerHTML = "";
  voiceUriInput.appendChild(createOption("", text.autoVoice));

  voiceList.forEach((voice) => {
    const label = `${voice.name} (${voice.lang || "unknown"})`;
    voiceUriInput.appendChild(createOption(voice.voiceURI, label));
  });

  voiceUriInput.value = voiceList.some((voice) => voice.voiceURI === selectedVoiceUri) ? selectedVoiceUri : "";
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

async function getVoices() {
  const voices = speechSynthesis.getVoices();
  if (voices.length) {
    return voices;
  }

  return new Promise((resolve) => {
    const previousHandler = speechSynthesis.onvoiceschanged;
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve(speechSynthesis.getVoices());
    }, 500);

    const handle = () => {
      cleanup();
      resolve(speechSynthesis.getVoices());
    };

    function cleanup() {
      window.clearTimeout(timeout);
      if (typeof speechSynthesis.removeEventListener === "function") {
        speechSynthesis.removeEventListener("voiceschanged", handle);
      } else {
        speechSynthesis.onvoiceschanged = previousHandler || null;
      }
    }

    if (typeof speechSynthesis.addEventListener === "function") {
      speechSynthesis.addEventListener("voiceschanged", handle, { once: true });
    } else {
      speechSynthesis.onvoiceschanged = (...args) => {
        if (typeof previousHandler === "function") {
          previousHandler(...args);
        }
        handle();
      };
    }
  });
}

function previewVoice() {
  if (typeof speechSynthesis === "undefined") {
    return;
  }

  speechSynthesis.cancel();
  const targetLanguage = targetLanguageInput.value;
  const utterance = new SpeechSynthesisUtterance(getPreviewText(targetLanguage));
  utterance.lang = targetLanguage === "uk" ? "uk-UA" : "ru-RU";
  utterance.rate = Number(speechRateInput.value);
  utterance.pitch = Number(speechPitchInput.value);

  const selectedVoice = availableVoices.find((voice) => voice.voiceURI === voiceUriInput.value);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  speechSynthesis.speak(utterance);
}

async function resetTuning() {
  const tunedDefaults = {
    ...DEFAULT_SETTINGS,
    uiLanguage: uiLanguageInput.value,
    targetLanguage: targetLanguageInput.value,
    voiceUri: ""
  };

  bindStaticValues(tunedDefaults);
  renderUi(tunedDefaults);
  await populateVoiceOptions(tunedDefaults.targetLanguage, tunedDefaults.voiceUri, tunedDefaults);
  await chrome.storage.sync.set(tunedDefaults);
}

function getPreviewText(targetLanguage) {
  if (targetLanguage === "uk") {
    return "Це пробне озвучення. Голос має звучати м’яко, спокійно і без ривків.";
  }

  return "Это пробная озвучка. Голос должен звучать мягко, спокойно и без обрывов.";
}

function renderValues(settings) {
  fontSizeValue.textContent = `${settings.fontSize} px`;
  speechRateValue.textContent = `${Number(settings.speechRate).toFixed(2)}x`;
  speechPitchValue.textContent = `${Number(settings.speechPitch).toFixed(2)}`;
  duckLevelValue.textContent = `${Math.round(Number(settings.duckLevel) * 100)}%`;
}
