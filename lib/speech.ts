/**
 * Pronunciation for Japanese and English words.
 *
 * Source order:
 *  1. Youdao's public dictionary voice endpoint. It returns a real recording
 *     (160 kbps) rather than a synthesiser, which is why the reading sounds
 *     like a person. Free, no key.
 *  2. Baidu's translate voice endpoint — also reachable from mainland China
 *     when Youdao is blocked or rate limited.
 *  3. The browser's Web Speech API, which needs no network at all but sounds
 *     synthetic and depends on an installed system voice.
 *
 * The app still ships no audio files of its own.
 */

export type SpeechLanguage = "ja-JP" | "en-US";

const APP_BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
  .trim()
  .replace(/\/+$/, "");

let currentAudio: HTMLAudioElement | null = null;

function sources(text: string, language: SpeechLanguage): string[] {
  const query = encodeURIComponent(text);
  const lang = language === "ja-JP" ? "ja" : "en";
  if (language === "ja-JP") {
    return [
      // Our own origin first: the audio is fetched server-side, so a browser
      // that cannot reach the dictionary directly still gets the recording.
      `${APP_BASE_PATH}/api/tts?text=${query}&lang=${lang}`,
      `https://dict.youdao.com/dictvoice?audio=${query}&le=jap`,
    ];
  }
  return [
    `${APP_BASE_PATH}/api/tts?text=${query}&lang=${lang}`,
    `https://dict.youdao.com/dictvoice?audio=${query}&type=2`,
  ];
}

/**
 * The clip is downloaded in full and handed to the player as a local object
 * URL. Streaming straight from the network meant playback started before the
 * data arrived, which is what produced clipped endings and missing openings
 * depending on how the buffering happened to land that time.
 */
const blobCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();
let playToken = 0;

async function resolveAudio(url: string): Promise<string | null> {
  const cached = blobCache.get(url);
  if (cached) return cached;
  let pending = inflight.get(url);
  if (!pending) {
    pending = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const blob = await response.blob();
        if (blob.size < 512) return null;
        const objectUrl = URL.createObjectURL(blob);
        blobCache.set(url, objectUrl);
        return objectUrl;
      } catch {
        return null;
      } finally {
        inflight.delete(url);
      }
    })();
    inflight.set(url, pending);
  }
  return pending;
}

async function playChain(
  urls: string[],
  index: number,
  text: string,
  language: SpeechLanguage,
  token: number,
): Promise<void> {
  if (token !== playToken) return;
  if (index >= urls.length) {
    speakOffline(text, language);
    return;
  }
  const objectUrl = await resolveAudio(urls[index]);
  if (token !== playToken) return;
  if (!objectUrl) {
    await playChain(urls, index + 1, text, language, token);
    return;
  }
  const audio = new Audio(objectUrl);
  // Reset explicitly: some browsers resume the previous position otherwise.
  audio.currentTime = 0;
  currentAudio = audio;
  try {
    await audio.play();
  } catch {
    if (token === playToken) {
      currentAudio = null;
      await playChain(urls, index + 1, text, language, token);
    }
  }
}

/**
 * Warm the cache for a word before the user asks for it.
 *
 * iOS only allows audio to start from inside the click's own synchronous
 * call stack; once we `await` a download the gesture is spent and playback is
 * refused, which silently dropped people back to the robotic system voice.
 * Fetching ahead of time means the click finds the blob already in hand and
 * can play synchronously.
 */
export function preload(text: string, language: SpeechLanguage): void {
  const trimmed = text.trim();
  if (!trimmed || typeof window === "undefined") return;
  const url = sources(trimmed, language)[0];
  if (blobCache.has(url) || inflight.has(url)) return;
  void resolveAudio(url);
}

export function speak(text: string, language: SpeechLanguage): void {
  const trimmed = text.trim();
  if (!trimmed || typeof window === "undefined") return;

  if (typeof window.Audio !== "function") {
    speakOffline(trimmed, language);
    return;
  }

  // A new click invalidates whatever is still resolving or playing.
  playToken += 1;
  const token = playToken;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();

  const urls = sources(trimmed, language);
  const ready = blobCache.get(urls[0]);
  if (ready) {
    // Synchronous path: still inside the click handler, so mobile browsers
    // allow it.
    const audio = new Audio(ready);
    audio.currentTime = 0;
    currentAudio = audio;
    void audio.play().catch(() => {
      if (token === playToken) {
        currentAudio = null;
        void playChain(urls, 1, trimmed, language, token);
      }
    });
    return;
  }

  void playChain(urls, 0, trimmed, language, token);
}

export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof window.Audio === "function" ||
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

let warmedUp = false;

/**
 * Chrome populates getVoices() asynchronously; registering the listener early
 * makes the first fallback click use a proper voice instead of the default one.
 */
export function warmUpSpeech(): void {
  if (typeof window === "undefined") return;
  if (typeof window.speechSynthesis === "undefined") return;
  if (warmedUp) return;
  warmedUp = true;
  const load = () => void window.speechSynthesis.getVoices();
  load();
  window.speechSynthesis.addEventListener?.("voiceschanged", load);
}

function pickVoice(language: SpeechLanguage): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const prefix = language.slice(0, 2).toLowerCase();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === language.toLowerCase()) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ??
    null
  );
}

function speakOffline(text: string, language: SpeechLanguage): void {
  if (typeof window === "undefined") return;
  if (typeof window.SpeechSynthesisUtterance !== "function") return;
  if (!window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = language === "ja-JP" ? 0.85 : 1;
  const voice = pickVoice(language);
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

/**
 * True when pronunciation can be attempted at all. With the dictionary voice
 * available this is effectively always true, so the buttons stay visible.
 */
export function hasVoice(language: SpeechLanguage): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.Audio === "function") return true;
  return pickVoice(language) !== null;
}
