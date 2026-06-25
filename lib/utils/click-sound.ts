const CLICK_SOUND_PATH = "/sounds/clickBtn.mp3";
const EASY_SOUND_PATH = "/sounds/easy.mp3";

// Web Audio API approach: decode once, play with near-zero latency.
// HTMLAudioElement cloneNode causes noticeable delay + quiet volume on iOS Safari.

let audioCtx: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let fetchPromise: Promise<void> | null = null;
let easyAudioBuffer: AudioBuffer | null = null;
let easyFetchPromise: Promise<void> | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Cls =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Cls) return null;
    audioCtx = new Cls();
  }
  return audioCtx;
}

function ensureBuffer(): Promise<void> {
  if (audioBuffer) return Promise.resolve();
  if (fetchPromise) return fetchPromise;
  const ctx = getAudioContext();
  if (!ctx) return Promise.reject(new Error("AudioContext unavailable"));

  fetchPromise = fetch(CLICK_SOUND_PATH)
    .then((r) => r.arrayBuffer())
    .then((ab) => ctx.decodeAudioData(ab))
    .then((buf) => {
      audioBuffer = buf;
    })
    .catch(() => {
      fetchPromise = null; // allow retry on failure
    });
  return fetchPromise;
}

function ensureEasyBuffer(): Promise<void> {
  if (easyAudioBuffer) return Promise.resolve();
  if (easyFetchPromise) return easyFetchPromise;
  const ctx = getAudioContext();
  if (!ctx) return Promise.reject(new Error("AudioContext unavailable"));

  easyFetchPromise = fetch(EASY_SOUND_PATH)
    .then((r) => r.arrayBuffer())
    .then((ab) => ctx.decodeAudioData(ab))
    .then((buf) => {
      easyAudioBuffer = buf;
    })
    .catch(() => {
      easyFetchPromise = null; // allow retry on failure
    });
  return easyFetchPromise;
}

function playDecodedBuffer(buffer: AudioBuffer, volume: number, when = 0): void {
  if (!audioCtx) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.value = volume;
  src.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(when);
}

export function playClickButtonSound(): void {
  if (typeof window === "undefined") return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const run = () =>
    ensureBuffer()
      .then(() => {
        if (!audioBuffer) return;
        playDecodedBuffer(audioBuffer, 0.5);
      })
      .catch(() => {});

  // iOS suspends AudioContext until a user gesture. Resume it here since
  // this function is always called directly from a user interaction.
  if (ctx.state === "suspended") {
    ctx.resume().then(run).catch(() => {});
  } else {
    run();
  }
}

export function playEasySound(): void {
  if (typeof window === "undefined") return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const run = () =>
    ensureEasyBuffer()
      .then(() => {
        if (!easyAudioBuffer) return;
        playDecodedBuffer(easyAudioBuffer, 0.7);
      })
      .catch(() => {});

  if (ctx.state === "suspended") {
    ctx.resume().then(run).catch(() => {});
  } else {
    run();
  }
}

export function playClickAndEasyTogether(): void {
  if (typeof window === "undefined") return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const run = () =>
    Promise.all([ensureBuffer(), ensureEasyBuffer()])
      .then(() => {
        if (!audioCtx || !audioBuffer || !easyAudioBuffer) return;
        const at = audioCtx.currentTime + 0.005;
        playDecodedBuffer(audioBuffer, 0.5, at);
        playDecodedBuffer(easyAudioBuffer, 0.7, at);
      })
      .catch(() => {});

  if (ctx.state === "suspended") {
    ctx.resume().then(run).catch(() => {});
  } else {
    run();
  }
}
