export function speakEnglish(text: string) {
  if (typeof window === "undefined") return;
  if (!text.trim()) return;
  if (!("speechSynthesis" in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find((voice) =>
    voice.lang.toLowerCase().startsWith("en")
  );

  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
