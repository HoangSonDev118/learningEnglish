const CLICK_SOUND_PATH = "/sounds/clickBtn.mp3";
const HAPTIC_DURATION_MS = 12;

let clickAudioPrototype: HTMLAudioElement | null = null;

export function playClickButtonSound() {
  if (typeof window === "undefined") return;

  // Best effort haptic feedback. Unsupported browsers (including some iOS versions)
  // will safely ignore this call.
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(HAPTIC_DURATION_MS);
    }
  } catch {
    // Ignore haptic API failures.
  }

  try {
    if (!clickAudioPrototype) {
      clickAudioPrototype = new Audio(CLICK_SOUND_PATH);
      clickAudioPrototype.preload = "auto";
      clickAudioPrototype.volume = 0.5;
    }

    const audio = clickAudioPrototype.cloneNode(true) as HTMLAudioElement;
    audio.volume = clickAudioPrototype.volume;
    void audio.play().catch(() => {
      // Ignore playback failures from browser policies or user settings.
    });
  } catch {
    // Ignore audio API failures.
  }
}
