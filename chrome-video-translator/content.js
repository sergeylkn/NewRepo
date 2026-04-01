const DEFAULT_SETTINGS = {
  enabled: true,
  targetLanguage: "ru",
  voiceEnabled: true,
  voiceUri: "",
  fontSize: 28,
  speechRate: 0.92,
  speechPitch: 0.96,
  duckVideoVolume: true,
  duckLevel: 0.2,
  showSourceBadge: true
};

const CAPTION_SELECTORS = [
  ".ytp-caption-segment",
  ".ytp-caption-window-container",
  ".jw-text-track-display",
  ".jw-text-track-cue",
  ".jw-captions",
  ".vjs-text-track-display",
  ".vjs-text-track-cue",
  ".shaka-text-container",
  ".shaka-text-container span",
  ".plyr__captions",
  ".plyr__caption",
  "[data-testid*='caption']",
  "[data-testid*='subtitle']",
  "[class*='caption']",
  "[class*='Caption']",
  "[class*='subtitle']",
  "[class*='Subtitle']",
  "[aria-live='assertive']",
  "[aria-live='polite']"
];

const UI_TEXT = {
  waiting: {
    ru: "\u0416\u0434\u0443 \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u044b. \u0412\u043a\u043b\u044e\u0447\u0438\u0442\u0435 captions \u043d\u0430 \u0441\u0430\u0439\u0442\u0435.",
    uk: "\u041e\u0447\u0456\u043a\u0443\u044e \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u0438. \u0423\u0432\u0456\u043c\u043a\u043d\u0456\u0442\u044c captions \u043d\u0430 \u0441\u0430\u0439\u0442\u0456."
  }
};

let settings = { ...DEFAULT_SETTINGS };
let activeVideo = null;
let overlayRoot = null;
let overlayText = null;
let overlayBadge = null;
let lastOriginalText = "";
let lastTranslatedText = "";
let lastCommittedOriginalText = "";
let currentSourceName = "";
let translateRequestId = 0;
let sourceObservers = [];
let restoreVolumeTimer = null;
let translationDebounceTimer = null;
let translationForceTimer = null;
let speechContinueTimer = null;
let mediaRefreshTimer = null;
let captionRefreshTimer = null;
let overlayRefreshFrame = 0;
let keepAliveTimer = 0;
let cachedCaptionElements = [];
let lastVideoScanAt = 0;
let lastCaptionRefreshAt = 0;
let lastIncomingTextAt = 0;
let lastCaptionSignalAt = 0;
let originalVideoVolume = 1;
let originalMutedState = false;
let pendingOriginalText = "";
let speechQueue = [];
let isSpeaking = false;
let lastSpokenText = "";
let lastQueueFingerprint = "";
let builtInAiState = {
  supportInitialized: false,
  translatorSupported: false,
  detectorSupported: false,
  detector: null,
  translators: new Map(),
  warming: false,
  status: "web-fallback",
  lastError: ""
};

bootstrap().catch(() => undefined);

async function bootstrap() {
  settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  initializeBuiltInAiSupport();
  setupBuiltInAiActivationListeners();
  ensureOverlay();
  setupPageObserver();
  chrome.storage.onChanged.addListener(handleStorageChanges);
  window.addEventListener("resize", scheduleOverlayRefresh, { passive: true });
  window.addEventListener("scroll", scheduleOverlayRefresh, { passive: true });
  document.addEventListener("fullscreenchange", () => {
    scheduleMediaRefresh("fullscreen", 80);
    scheduleOverlayRefresh();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      scheduleMediaRefresh("visible", 140);
    }
  });

  keepAliveTimer = window.setInterval(() => {
    runKeepAlive();
  }, 2600);

  scheduleMediaRefresh("bootstrap", 0);
}

function initializeBuiltInAiSupport() {
  if (builtInAiState.supportInitialized) {
    return;
  }

  builtInAiState.supportInitialized = true;
  builtInAiState.translatorSupported = typeof self.Translator !== "undefined";
  builtInAiState.detectorSupported = typeof self.LanguageDetector !== "undefined";
  builtInAiState.status = builtInAiState.translatorSupported ? "tap-to-warm" : "web-fallback";
}

function setupBuiltInAiActivationListeners() {
  const activationHandler = () => {
    void warmUpBuiltInAi("user-activation");
  };

  ["pointerdown", "keydown", "touchstart", "mousedown"].forEach((eventName) => {
    window.addEventListener(eventName, activationHandler, { passive: true });
  });
}

function handleStorageChanges(changes, areaName) {
  if (areaName !== "sync") {
    return;
  }

  Object.entries(changes).forEach(([key, value]) => {
    settings[key] = value.newValue;
  });

  applyOverlayState();
  if (overlayBadge) {
    overlayBadge.textContent = buildBadgeText();
  }

  if (!settings.enabled) {
    updateOverlayText("");
    stopSpeech(true);
    restoreVideoVolume();
    speechQueue = [];
    pendingOriginalText = "";
    return;
  }

  if (changes.targetLanguage && builtInAiState.translatorSupported) {
    builtInAiState.status = "tap-to-warm";
  }

  if (changes.voiceEnabled && !settings.voiceEnabled) {
    stopSpeech(true);
  }

  if (changes.showSourceBadge || changes.fontSize) {
    scheduleOverlayRefresh();
  }

  if (lastOriginalText) {
    scheduleTranslation(lastOriginalText, { immediate: true });
  }
}

function scheduleMediaRefresh(_reason, delay = 220) {
  clearTimeout(mediaRefreshTimer);
  mediaRefreshTimer = window.setTimeout(() => {
    attachToBestVideo();
    captureCaptionText();
    scheduleOverlayRefresh();
  }, delay);
}

function scheduleCaptionRefresh(delay = 140) {
  clearTimeout(captionRefreshTimer);
  captionRefreshTimer = window.setTimeout(() => {
    bindCaptionDomObservers(true);
    captureCaptionText();
  }, delay);
}

function scheduleOverlayRefresh() {
  if (overlayRefreshFrame) {
    return;
  }

  overlayRefreshFrame = window.requestAnimationFrame(() => {
    overlayRefreshFrame = 0;
    refreshOverlayPosition();
  });
}

function runKeepAlive() {
  const now = Date.now();

  if (!activeVideo || !activeVideo.isConnected || now - lastVideoScanAt > 5200) {
    attachToBestVideo();
  } else if (!cachedCaptionElements.length && now - lastCaptionRefreshAt > 2200) {
    bindCaptionDomObservers(true);
  }

  if (pendingOriginalText && now - lastIncomingTextAt > 1000) {
    flushPendingTranslation("linger");
  }

  if (overlayRoot?.style.display === "block") {
    scheduleOverlayRefresh();
  }
}

function setupPageObserver() {
  const pageObserver = new MutationObserver((mutations) => {
    if (!mutations.some(mutationTouchesMedia)) {
      return;
    }

    scheduleMediaRefresh("mutation", 180);
  });

  pageObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function mutationTouchesMedia(mutation) {
  return nodesTouchMedia(mutation.addedNodes) || nodesTouchMedia(mutation.removedNodes);
}

function nodesTouchMedia(nodeList) {
  for (const node of nodeList) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const element = node;
    if (isRelevantMediaElement(element)) {
      return true;
    }
  }

  return false;
}

function isRelevantMediaElement(element) {
  if (element.matches?.("video, track")) {
    return true;
  }

  if (hasCaptionMarker(element)) {
    return true;
  }

  if (typeof element.querySelector === "function") {
    if (element.querySelector("video, track")) {
      return true;
    }

    if (element.childElementCount <= 80 && element.querySelector(".ytp-caption-window-container, .jw-text-track-display, .vjs-text-track-display, .shaka-text-container, .plyr__captions, [aria-live='polite'], [aria-live='assertive']")) {
      return true;
    }
  }

  return false;
}

function hasCaptionMarker(element) {
  const marker = `${element.className || ""} ${element.id || ""} ${element.getAttribute?.("aria-live") || ""} ${element.getAttribute?.("data-testid") || ""}`.toLowerCase();
  return /caption|subtitle|ytp-|jw-|vjs-|shaka|plyr|player/.test(marker);
}

function attachToBestVideo() {
  lastVideoScanAt = Date.now();
  const videos = Array.from(document.querySelectorAll("video")).filter((video) => video.isConnected);
  if (!videos.length) {
    if (activeVideo) {
      detachCurrentSource();
      updateOverlayText("");
    }
    return;
  }

  const nextVideo = pickPrimaryVideo(videos);
  if (nextVideo === activeVideo) {
    bindTrackObservers(nextVideo);
    if (!cachedCaptionElements.length && Date.now() - lastCaptionRefreshAt > 1200) {
      bindCaptionDomObservers(true);
    }
    return;
  }

  detachCurrentSource();
  activeVideo = nextVideo;
  originalVideoVolume = typeof nextVideo.volume === "number" ? nextVideo.volume : 1;
  originalMutedState = Boolean(nextVideo.muted);

  bindTrackObservers(nextVideo);
  bindCaptionDomObservers(true);
  scheduleOverlayRefresh();
}

function pickPrimaryVideo(videos) {
  return videos
    .map((video) => {
      const rect = video.getBoundingClientRect();
      const area = Math.max(0, rect.width) * Math.max(0, rect.height);
      const visibleBoost = rect.width > 120 && rect.height > 120 ? 100000 : 0;
      return { video, score: area + visibleBoost };
    })
    .sort((left, right) => right.score - left.score)[0]?.video || videos[0];
}

function bindTrackObservers(video) {
  const tracks = Array.from(video.textTracks || []);
  tracks
    .filter((track) => ["subtitles", "captions"].includes(track.kind))
    .forEach((track) => {
      if (track.__videoTranslatorBound) {
        return;
      }

      currentSourceName = "textTracks";
      track.__videoTranslatorBound = true;
      try {
        track.mode = "hidden";
      } catch (_error) {
        track.__videoTranslatorBound = false;
        return;
      }
      const onCueChange = () => {
        const text = Array.from(track.activeCues || [])
          .map((cue) => cue.text || "")
          .join(" ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (text) {
          processIncomingText(text, "HTML5 captions");
        }
      };

      track.addEventListener("cuechange", onCueChange);
      sourceObservers.push(() => {
        track.__videoTranslatorBound = false;
        track.removeEventListener("cuechange", onCueChange);
      });
      onCueChange();
    });
}

function bindCaptionDomObservers(forceRefresh = false) {
  if (!activeVideo) {
    return;
  }

  if (!forceRefresh && cachedCaptionElements.length && Date.now() - lastCaptionRefreshAt < 900) {
    return;
  }

  lastCaptionRefreshAt = Date.now();
  const observedElements = findCaptionElements();
  if (!forceRefresh && observedElements.length === cachedCaptionElements.length && observedElements.every((element, index) => element === cachedCaptionElements[index])) {
    return;
  }

  const keptObservers = [];
  sourceObservers.forEach((dispose) => {
    if (dispose.__captionObserver) {
      try {
        dispose();
      } catch (_error) {
        return;
      }
      return;
    }

    keptObservers.push(dispose);
  });
  sourceObservers = keptObservers;
  cachedCaptionElements = observedElements;

  observedElements.forEach((element) => {
    const observer = new MutationObserver(() => {
      captureCaptionText();
    });

    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true
    });

    const dispose = () => observer.disconnect();
    dispose.__captionObserver = true;
    sourceObservers.push(dispose);
  });
}

function captureCaptionText() {
  if (!settings.enabled) {
    return;
  }

  const liveElements = cachedCaptionElements.filter((element) => element.isConnected);
  if (liveElements.length !== cachedCaptionElements.length) {
    cachedCaptionElements = liveElements;
    if (!liveElements.length && activeVideo) {
      scheduleCaptionRefresh(120);
    }
  }

  const captionCandidates = collectCaptionCandidates(liveElements);
  const bestCandidate = captionCandidates[0];
  if (bestCandidate?.text) {
    lastCaptionSignalAt = Date.now();
    processIncomingText(bestCandidate.text, bestCandidate.source);
    return;
  }

  if (activeVideo && !lastTranslatedText && Date.now() - lastCaptionSignalAt > 2200) {
    updateOverlayText(getWaitingMessage());
    currentSourceName = "waiting";
    scheduleOverlayRefresh();
  }
}

function collectCaptionCandidates(elements = cachedCaptionElements) {
  const candidates = [];
  const seenTexts = new Set();

  for (const element of elements) {
    const text = normalizeText(element.textContent || element.innerText || "");
    if (!isUsefulCaptionText(text, element) || seenTexts.has(text)) {
      continue;
    }

    seenTexts.add(text);
    candidates.push({
      text,
      source: detectSourceName(element),
      weight: scoreCaptionElement(element, text)
    });
  }

  return candidates.sort((left, right) => right.weight - left.weight);
}

function findCaptionElements() {
  const elements = [];
  const seen = new Set();
  const roots = [];
  const localRoot = activeVideo?.closest(".html5-video-player, .jwplayer, .video-js, .shaka-video-container, .plyr, [class*='player'], [id*='player'], figure, section, article, main") || activeVideo?.parentElement;

  if (localRoot) {
    roots.push(localRoot);
  }
  if (activeVideo?.parentElement && activeVideo.parentElement !== localRoot) {
    roots.push(activeVideo.parentElement);
  }
  roots.push(document);

  roots.forEach((root, index) => {
    CAPTION_SELECTORS.forEach((selector) => {
      if (index === roots.length - 1 && (/\[class\*=/.test(selector) || /\[data-testid\*=/.test(selector))) {
        return;
      }

      root.querySelectorAll(selector).forEach((element) => {
        if (!seen.has(element) && isRelevantCaptionHost(element)) {
          seen.add(element);
          elements.push(element);
        }
      });
    });
  });

  return elements.slice(0, 18);
}

function isRelevantCaptionHost(element) {
  if (!element || element === overlayRoot || overlayRoot?.contains(element)) {
    return false;
  }

  if (element === activeVideo || element.contains?.(activeVideo)) {
    return false;
  }

  return hasCaptionMarker(element);
}

function scoreCaptionElement(element, text) {
  const rect = element.getBoundingClientRect();
  const visibleScore = rect.width > 40 && rect.height > 10 ? 60 : 0;
  const positionScore = activeVideo ? scoreCaptionPosition(rect, activeVideo.getBoundingClientRect()) : 0;
  const classScore = /caption|subtitle|text-track|cue/i.test(element.className || "") ? 80 : 0;
  const lengthScore = Math.max(0, 120 - text.length);
  return visibleScore + positionScore + classScore + lengthScore;
}

function scoreCaptionPosition(rect, videoRect) {
  const verticallyNearBottom =
    rect.top >= videoRect.top &&
    rect.bottom <= videoRect.bottom + 30 &&
    rect.top >= videoRect.top + videoRect.height * 0.45;

  const horizontallyInside =
    rect.left >= videoRect.left - 40 &&
    rect.right <= videoRect.right + 40;

  return verticallyNearBottom && horizontallyInside ? 120 : 0;
}

function detectSourceName(element) {
  const className = `${element.className || ""}`;
  if (className.includes("ytp-")) {
    return "YouTube";
  }
  if (className.toLowerCase().includes("jw")) {
    return "JW Player";
    }
    if (className.toLowerCase().includes("vjs")) {
    return "Video.js";
  }
    if (className.toLowerCase().includes("shaka")) {
    return "Shaka";
  }
  if (className.toLowerCase().includes("plyr")) {
    return "Plyr";
  }
  return "Page";
}

function processIncomingText(text, sourceName) {
  if (!settings.enabled) {
    return;
  }

  const normalized = normalizeText(text);
  if (!normalized) {
    updateOverlayText("");
    return;
  }

  if (normalized === lastOriginalText) {
    return;
  }

  currentSourceName = sourceName || currentSourceName || "captions";
  lastCaptionSignalAt = Date.now();
  lastOriginalText = normalized;
  scheduleTranslation(normalized, { immediate: hasStrongEnding(normalized) });
}

function scheduleTranslation(text, options = {}) {
  lastIncomingTextAt = Date.now();
  pendingOriginalText = mergeCaptionTexts(pendingOriginalText || lastCommittedOriginalText, text);
  clearTimeout(translationDebounceTimer);
  clearTimeout(translationForceTimer);

  if (options.immediate) {
    flushPendingTranslation("immediate");
    return;
  }

  translationDebounceTimer = window.setTimeout(() => {
    flushPendingTranslation("debounce");
  }, 380);

  translationForceTimer = window.setTimeout(() => {
    flushPendingTranslation("linger");
  }, 1350);
}

function flushPendingTranslation(reason) {
  clearTimeout(translationDebounceTimer);
  clearTimeout(translationForceTimer);

  if (!pendingOriginalText) {
    return;
  }

  const textToTranslate = prepareOriginalForTranslation(pendingOriginalText, reason);
  if (!textToTranslate || textToTranslate === lastCommittedOriginalText) {
    return;
  }

  pendingOriginalText = "";
  lastCommittedOriginalText = textToTranslate;
  translateAndRender(textToTranslate);
}

async function translateAndRender(text) {
  const requestId = ++translateRequestId;

  try {
    const translatedText = await translateTextSmart(text);
    if (requestId !== translateRequestId || !translatedText) {
      return;
    }

    const finalizedText = finalizeTranslatedText(translatedText);
    lastTranslatedText = finalizedText;
    updateOverlayText(finalizedText);
    enqueueSpeech(finalizedText);
  } catch (_error) {
    if (requestId === translateRequestId) {
      const fallbackText = finalizeTranslatedText(text);
      lastTranslatedText = fallbackText;
      updateOverlayText(fallbackText);
      enqueueSpeech(fallbackText);
    }
  }
}

async function translateTextSmart(text) {
  const onDeviceResult = await tryBuiltInAiTranslation(text);
  if (onDeviceResult) {
    return onDeviceResult;
  }

  const response = await chrome.runtime.sendMessage({
    type: "translate-text",
    text,
    targetLanguage: settings.targetLanguage
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Translation failed");
  }

  if (!builtInAiState.translatorSupported) {
    builtInAiState.status = "web-fallback";
  }

  return response.translatedText || text;
}

async function tryBuiltInAiTranslation(text) {
  if (!builtInAiState.translatorSupported) {
    return null;
  }

  const sourceLanguage = await detectOrGuessSourceLanguage(text);
  const targetLanguage = normalizeLanguageCode(settings.targetLanguage);

  if (!sourceLanguage || !targetLanguage) {
    return null;
  }

  if (sourceLanguage === targetLanguage) {
    builtInAiState.status = "local-ai";
    return text;
  }

  const translator = await ensureTranslatorForPair(sourceLanguage, targetLanguage, false);
  if (!translator) {
    if (builtInAiState.status !== "warming") {
      builtInAiState.status = "web-fallback";
    }
    return null;
  }

  builtInAiState.status = "local-ai";
  return translator.translate(text);
}

async function warmUpBuiltInAi(_trigger) {
  if (!builtInAiState.translatorSupported || builtInAiState.warming) {
    return;
  }

  builtInAiState.warming = true;
  builtInAiState.status = "warming";

  try {
    await ensureLanguageDetector();

    const candidateText = pendingOriginalText || lastOriginalText || lastCommittedOriginalText || "Hello world";
    const sourceLanguage = await detectOrGuessSourceLanguage(candidateText);
    const targetLanguage = normalizeLanguageCode(settings.targetLanguage);

    if (sourceLanguage && targetLanguage && sourceLanguage !== targetLanguage) {
      await ensureTranslatorForPair(sourceLanguage, targetLanguage, true);
    }

    builtInAiState.status = builtInAiState.translators.size > 0 ? "local-ai" : "web-fallback";
  } catch (error) {
    builtInAiState.lastError = error?.message || "Built-in AI unavailable";
    builtInAiState.status = "web-fallback";
  } finally {
    builtInAiState.warming = false;
  }
}

async function ensureLanguageDetector() {
  if (!builtInAiState.detectorSupported || builtInAiState.detector) {
    return builtInAiState.detector;
  }

  const availability = await LanguageDetector.availability();
  if (availability === "unavailable") {
    return null;
  }

  builtInAiState.detector = await LanguageDetector.create({
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", () => {
        builtInAiState.status = "warming";
      });
    }
  });

  if (builtInAiState.detector?.ready && typeof builtInAiState.detector.ready.then === "function") {
    await builtInAiState.detector.ready;
  }

  return builtInAiState.detector;
}

async function ensureTranslatorForPair(sourceLanguage, targetLanguage, allowCreate) {
  const source = normalizeLanguageCode(sourceLanguage);
  const target = normalizeLanguageCode(targetLanguage);
  if (!source || !target || source === target) {
    return null;
  }

  const key = `${source}->${target}`;
  if (builtInAiState.translators.has(key)) {
    return builtInAiState.translators.get(key);
  }

  const availability = await Translator.availability({
    sourceLanguage: source,
    targetLanguage: target
  });

  if (availability === "unavailable") {
    return null;
  }

  if (!allowCreate && availability !== "readily") {
    return null;
  }

  const translator = await Translator.create({
    sourceLanguage: source,
    targetLanguage: target,
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", () => {
        builtInAiState.status = "warming";
      });
    }
  });

  if (translator?.ready && typeof translator.ready.then === "function") {
    await translator.ready;
  }

  builtInAiState.translators.set(key, translator);
  return translator;
}

async function detectOrGuessSourceLanguage(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return "en";
  }

  const detector = await ensureLanguageDetector();
  if (detector && normalized.length >= 16) {
    try {
      const results = await detector.detect(normalized);
      const bestMatch = Array.isArray(results) ? results[0] : null;
      if (bestMatch?.detectedLanguage && Number(bestMatch.confidence) >= 0.6) {
        return normalizeLanguageCode(bestMatch.detectedLanguage);
      }
    } catch (_error) {
      return guessSourceLanguage(normalized);
    }
  }

  return guessSourceLanguage(normalized);
}

function guessSourceLanguage(text) {
  const normalized = normalizeText(text).toLowerCase();
  if (/[\u0456\u0457\u0454\u0491]/.test(normalized)) {
    return "uk";
  }
  if (/[\u0451\u044b\u044d\u044a]/.test(normalized)) {
    return "ru";
  }
  if (/[\u0430-\u044f]/.test(normalized)) {
    return settings.targetLanguage === "uk" ? "ru" : "uk";
  }
  return "en";
}

function normalizeLanguageCode(languageCode) {
  return `${languageCode || ""}`.trim().toLowerCase().split("-")[0];
}

function ensureOverlay() {
  if (overlayRoot) {
    return;
  }

  overlayRoot = document.createElement("div");
  overlayRoot.id = "video-voice-translator-overlay";
  overlayRoot.style.position = "fixed";
  overlayRoot.style.zIndex = "2147483647";
  overlayRoot.style.pointerEvents = "none";
  overlayRoot.style.display = "none";

  overlayBadge = document.createElement("div");
  overlayBadge.style.display = "inline-flex";
  overlayBadge.style.alignItems = "center";
  overlayBadge.style.marginBottom = "8px";
  overlayBadge.style.padding = "4px 10px";
  overlayBadge.style.borderRadius = "999px";
  overlayBadge.style.background = "rgba(122, 209, 255, 0.18)";
  overlayBadge.style.border = "1px solid rgba(122, 209, 255, 0.25)";
  overlayBadge.style.color = "#b9ecff";
  overlayBadge.style.fontSize = "12px";
  overlayBadge.style.fontWeight = "700";
  overlayBadge.textContent = "AI web";

  overlayText = document.createElement("div");
  overlayText.style.width = "100%";
  overlayText.style.padding = "12px 18px";
  overlayText.style.borderRadius = "18px";
  overlayText.style.background = "rgba(7, 10, 18, 0.72)";
  overlayText.style.backdropFilter = "blur(10px)";
  overlayText.style.color = "#ffffff";
  overlayText.style.fontWeight = "700";
  overlayText.style.lineHeight = "1.35";
  overlayText.style.textAlign = "center";
  overlayText.style.textShadow = "0 2px 6px rgba(0, 0, 0, 0.75)";
  overlayText.style.boxShadow = "0 12px 36px rgba(0, 0, 0, 0.28)";
  overlayText.style.border = "1px solid rgba(255, 255, 255, 0.14)";

  overlayRoot.appendChild(overlayBadge);
  overlayRoot.appendChild(overlayText);
  document.documentElement.appendChild(overlayRoot);
  applyOverlayState();
}

function applyOverlayState() {
  if (!overlayRoot || !overlayText || !overlayBadge) {
    return;
  }

  overlayText.style.fontSize = `${settings.fontSize || DEFAULT_SETTINGS.fontSize}px`;
  overlayBadge.style.display = settings.showSourceBadge ? "inline-flex" : "none";
  overlayRoot.style.display = settings.enabled && overlayText.textContent ? "block" : "none";
}

function updateOverlayText(text) {
  ensureOverlay();
  overlayText.textContent = text;
  overlayBadge.textContent = buildBadgeText();
  overlayRoot.style.display = settings.enabled && text ? "block" : "none";
  scheduleOverlayRefresh();
}

function buildBadgeText() {
  const source = currentSourceName || "captions";
  const voice = settings.voiceEnabled ? "voice" : "mute";
  const languageLabel = (settings.targetLanguage || "ru").toUpperCase();
  const aiLabel = getAiStatusLabel();
  return `${languageLabel} | ${source} | ${aiLabel} | ${voice}`;
}

function getAiStatusLabel() {
  if (builtInAiState.status === "local-ai") {
    return "AI local";
  }
  if (builtInAiState.status === "warming") {
    return "AI warm";
  }
  if (builtInAiState.status === "tap-to-warm") {
    return "AI tap";
  }
  return "AI web";
}

function refreshOverlayPosition() {
  if (!activeVideo || !overlayRoot) {
    return;
  }

  const rect = activeVideo.getBoundingClientRect();
  const visible = rect.width > 120 && rect.height > 120 && rect.bottom > 0 && rect.right > 0;
  if (!visible || !settings.enabled || !overlayText?.textContent) {
    overlayRoot.style.display = "none";
    return;
  }

  const width = Math.max(260, Math.min(rect.width - 32, 920));
  overlayRoot.style.left = `${Math.max(12, rect.left + (rect.width - width) / 2)}px`;
  overlayRoot.style.top = `${Math.max(12, rect.bottom - 126)}px`;
  overlayRoot.style.width = `${width}px`;
  overlayRoot.style.display = "block";
}

function enqueueSpeech(text) {
  if (!settings.voiceEnabled) {
    return;
  }

  const prepared = prepareSpeechText(text);
  if (!prepared || isDuplicateSpeech(prepared)) {
    return;
  }

  const chunks = splitForSpeech(prepared);
  if (!chunks.length) {
    return;
  }

  chunks.forEach((chunk) => {
    speechQueue.push(chunk);
  });

  if (speechQueue.length > 6) {
    speechQueue = speechQueue.slice(-6);
  }

  lastQueueFingerprint = fingerprintText(prepared);
  processSpeechQueue();
}

function processSpeechQueue() {
  if (isSpeaking || !settings.voiceEnabled || !speechQueue.length) {
    return;
  }

  const nextText = speechQueue.shift();
  if (!nextText) {
    return;
  }

  isSpeaking = true;
  duckVideoVolume();

  const utterance = new SpeechSynthesisUtterance(nextText);
  const targetLanguage = settings.targetLanguage || "ru";
  utterance.lang = targetLanguage === "uk" ? "uk-UA" : "ru-RU";
  utterance.rate = clampNumber(settings.speechRate, 0.78, 1.08, 0.92);
  utterance.pitch = clampNumber(settings.speechPitch, 0.88, 1.06, 0.96);
  utterance.volume = 1;

  const preferredVoice = chooseVoice(targetLanguage, settings.voiceUri);
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => {
    lastSpokenText = nextText;
    isSpeaking = false;
    clearTimeout(speechContinueTimer);

    if (speechQueue.length) {
      speechContinueTimer = window.setTimeout(() => {
        processSpeechQueue();
      }, getSpeechPauseMs(nextText));
      return;
    }

    restoreVideoVolume();
  };

  utterance.onerror = () => {
    isSpeaking = false;
    clearTimeout(speechContinueTimer);
    restoreVideoVolume();
    processSpeechQueue();
  };

  window.speechSynthesis.speak(utterance);
}

function chooseVoice(targetLanguage, preferredVoiceUri) {
  const languagePrefix = targetLanguage === "uk" ? "uk" : "ru";
  const voices = window.speechSynthesis.getVoices();

  return voices.find((voice) => preferredVoiceUri && voice.voiceURI === preferredVoiceUri) ||
    voices.find((voice) => `${voice.lang || ""}`.toLowerCase().startsWith(languagePrefix) && !voice.localService) ||
    voices.find((voice) => `${voice.lang || ""}`.toLowerCase().startsWith(languagePrefix)) ||
    voices.find((voice) => `${voice.lang || ""}`.toLowerCase().startsWith("ru")) ||
    voices[0] || null;
}

function duckVideoVolume() {
  if (!activeVideo || !settings.duckVideoVolume) {
    return;
  }

  clearTimeout(restoreVolumeTimer);
  originalVideoVolume = typeof activeVideo.volume === "number" ? activeVideo.volume : 1;
  originalMutedState = Boolean(activeVideo.muted);
  activeVideo.muted = false;
  activeVideo.volume = clampNumber(settings.duckLevel, 0, 1, 0.2);
}

function restoreVideoVolume() {
  if (!activeVideo) {
    return;
  }

  clearTimeout(restoreVolumeTimer);
  restoreVolumeTimer = window.setTimeout(() => {
    if (!activeVideo || isSpeaking || speechQueue.length) {
      return;
    }

    activeVideo.volume = clampNumber(originalVideoVolume, 0, 1, 1);
    activeVideo.muted = originalMutedState;
  }, 180);
}

function stopSpeech(restoreVolume) {
  clearTimeout(speechContinueTimer);
  speechQueue = [];
  isSpeaking = false;

  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }

  if (restoreVolume) {
    restoreVideoVolume();
  }
}

function detachCurrentSource() {
  sourceObservers.forEach((dispose) => {
    try {
      dispose();
    } catch (_error) {
      return;
    }
  });

  clearTimeout(mediaRefreshTimer);
  clearTimeout(captionRefreshTimer);
  clearTimeout(translationDebounceTimer);
  clearTimeout(translationForceTimer);
  clearTimeout(speechContinueTimer);
  sourceObservers = [];
  cachedCaptionElements = [];
  builtInAiState.status = builtInAiState.translatorSupported ? "tap-to-warm" : "web-fallback";
  pendingOriginalText = "";
  speechQueue = [];
  isSpeaking = false;
  lastOriginalText = "";
  lastTranslatedText = "";
  lastCommittedOriginalText = "";
  lastSpokenText = "";
  lastQueueFingerprint = "";
  lastIncomingTextAt = 0;
  lastCaptionSignalAt = 0;
  currentSourceName = "";
}

function mergeCaptionTexts(previousText, nextText) {
  const previous = normalizeText(previousText);
  const next = normalizeText(nextText);
  if (!previous) {
    return next;
  }
  if (!next) {
    return previous;
  }
  if (next === previous || next.startsWith(previous)) {
    return next;
  }
  if (previous.startsWith(next)) {
    return previous;
  }

  const overlap = longestWordOverlap(previous, next);
  if (overlap > 0) {
    const nextWords = next.split(" ");
    return normalizeText(`${previous} ${nextWords.slice(overlap).join(" ")}`);
  }

  return next;
}

function longestWordOverlap(leftText, rightText) {
  const left = leftText.split(" ");
  const right = rightText.split(" ");
  const max = Math.min(6, left.length, right.length);

  for (let size = max; size >= 2; size -= 1) {
    const leftSlice = left.slice(-size).join(" ");
    const rightSlice = right.slice(0, size).join(" ");
    if (leftSlice === rightSlice) {
      return size;
    }
  }

  return 0;
}

function prepareOriginalForTranslation(text, reason) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return "";
  }

  if (normalized.length < 8 && reason !== "immediate") {
    return "";
  }

  if (normalized.length < 18 && !hasStrongEnding(normalized) && reason !== "linger" && reason !== "immediate") {
    return "";
  }

  if (normalized.length < 26 && !hasStrongEnding(normalized) && reason === "debounce") {
    return "";
  }

  return normalized;
}

function finalizeTranslatedText(text) {
  let normalized = normalizeText(text);
  if (!normalized) {
    return "";
  }

  normalized = normalized
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\s+!/g, "!")
    .replace(/\s+\?/g, "?")
    .replace(/\s+:/g, ":")
    .replace(/\s+;/g, ";");

  if (!/[.!?\u2026]$/.test(normalized) && normalized.length > 24) {
    normalized += ".";
  }

  return normalized;
}

function prepareSpeechText(text) {
  let normalized = finalizeTranslatedText(text);
  if (!normalized || normalized.length < 6) {
    return "";
  }

  normalized = normalized
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\(([^)]+)\)/g, ", $1, ")
    .replace(/\s-\s/g, ", ")
    .replace(/:\s/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

  if ((settings.targetLanguage || "ru") === "uk") {
    normalized = normalized
      .replace(/\bAI\b/gi, "\u0435\u0439 \u0430\u0439")
      .replace(/\bAPI\b/gi, "\u0435\u0439 \u043f\u0456 \u0430\u0439")
      .replace(/\bGitHub\b/gi, "\u0433\u0456\u0442\u0445\u0430\u0431")
      .replace(/\bYouTube\b/gi, "\u044e\u0442\u0443\u0431")
      .replace(/\bJW Player\b/gi, "\u0434\u0436\u0435\u0439 \u0434\u0430\u0431\u043b-\u044e \u043f\u043b\u0435\u0454\u0440");
  } else {
    normalized = normalized
      .replace(/\bAI\b/gi, "\u044d\u0439 \u0430\u0439")
      .replace(/\bAPI\b/gi, "\u044d\u0439 \u043f\u0438 \u0430\u0439")
      .replace(/\bGitHub\b/gi, "\u0433\u0438\u0442\u0445\u0430\u0431")
      .replace(/\bYouTube\b/gi, "\u044e\u0442\u0443\u0431")
      .replace(/\bJW Player\b/gi, "\u0434\u0436\u0435\u0439 \u0434\u0430\u0431\u043b-\u044e \u043f\u043b\u0435\u0435\u0440");
  }

  return normalized;
}

function splitForSpeech(text) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?\u2026])\s+/);
  let buffer = "";

  sentences.forEach((sentence) => {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length <= 165) {
      buffer = candidate;
      return;
    }

    if (buffer) {
      chunks.push(buffer);
    }

    if (sentence.length <= 165) {
      buffer = sentence;
      return;
    }

    const parts = sentence.split(/,\s+/);
    let localBuffer = "";
    parts.forEach((part) => {
      const localCandidate = localBuffer ? `${localBuffer}, ${part}` : part;
      if (localCandidate.length <= 145) {
        localBuffer = localCandidate;
      } else {
        if (localBuffer) {
          chunks.push(localBuffer);
        }
        localBuffer = part;
      }
    });
    buffer = localBuffer;
  });

  if (buffer) {
    chunks.push(buffer);
  }

  return chunks.map((chunk) => chunk.trim()).filter(Boolean);
}

function getSpeechPauseMs(text) {
  if (/[.!?\u2026]$/.test(text)) {
    return 220;
  }
  if (/,/.test(text)) {
    return 150;
  }
  return 110;
}

function isDuplicateSpeech(text) {
  const fingerprint = fingerprintText(text);
  if (!fingerprint) {
    return true;
  }

  if (fingerprint === lastQueueFingerprint || fingerprint === fingerprintText(lastSpokenText)) {
    return true;
  }

  return speechQueue.some((item) => fingerprintText(item) === fingerprint);
}

function fingerprintText(text) {
  return normalizeText(text).toLowerCase().replace(/[.!?,:;"'`-]/g, "");
}

function hasStrongEnding(text) {
  return /[.!?\u2026:]$/.test(text);
}

function getWaitingMessage() {
  return (settings.targetLanguage || "ru") === "uk" ? UI_TEXT.waiting.uk : UI_TEXT.waiting.ru;
}

function normalizeText(text) {
  return `${text || ""}`
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\u200b/g, "")
    .trim();
}

function isUsefulCaptionText(text, element) {
  if (!text || text.length < 2 || text.length > 260) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width < 20 || rect.height < 8) {
    return false;
  }

  const lower = text.toLowerCase();
  const junkPhrases = [
    "about this video",
    "hotkeys",
    "picture in picture",
    "powered by jw player",
    "settings",
    "subtitles",
    "captions"
  ];

  if (junkPhrases.some((phrase) => lower.includes(phrase))) {
    return false;
  }

  const linkDensity = element.querySelectorAll("a, button, input").length;
  return linkDensity <= 2;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}















