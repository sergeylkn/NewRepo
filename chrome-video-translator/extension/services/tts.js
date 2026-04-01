(() => {
  const root = globalThis;
  let currentText = '';

  function chooseVoice(targetLanguage, preferredUri) {
    const voices = speechSynthesis.getVoices();
    const prefix = targetLanguage === 'uk' ? 'uk' : targetLanguage === 'en' ? 'en' : 'ru';
    if (preferredUri) {
      const direct = voices.find((v) => v.voiceURI === preferredUri);
      if (direct) return direct;
    }
    return voices.find((v) => `${v.lang || ''}`.toLowerCase().startsWith(prefix)) || null;
  }

  function speak({ text, targetLanguage, voiceUri, rate, pitch }) {
    const normalized = `${text || ''}`.trim();
    if (!normalized || normalized === currentText) return;
    currentText = normalized;

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(normalized);
    utterance.rate = Number(rate || 1);
    utterance.pitch = Number(pitch || 1);
    utterance.lang = targetLanguage === 'uk' ? 'uk-UA' : targetLanguage === 'en' ? 'en-US' : 'ru-RU';

    const voice = chooseVoice(targetLanguage, voiceUri);
    if (voice) utterance.voice = voice;

    speechSynthesis.speak(utterance);
  }

  function stop() {
    currentText = '';
    speechSynthesis.cancel();
  }

  root.AIVTPRO = root.AIVTPRO || {};
  root.AIVTPRO.tts = { speak, stop, chooseVoice };
})();
