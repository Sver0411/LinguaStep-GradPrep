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

let currentAudio: HTMLAudioElement | null = null;

function sources(text: string, language: SpeechLanguage): string[] {
  const query = encodeURIComponent(text);
  if (language === "ja-JP") {
    return [
      `https://dict.youdao.com/dictvoice?audio=${query}&le=jap`,
      `https://fanyi.baidu.com/gettts?lan=jap&text=${query}&spd=3&source=web`,
    ];
  }
  return [
    `https://dict.youdao.com/dictvoice?audio=${query}&type=2`,
    `https://fanyi.baidu.com/gettts?lan=en&text=${query}&spd=3&source=web`,
  ];
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

function playFrom(urls: string[], index: number, text: string, language: SpeechLanguage): void {
  if (index >= urls.length) {
    // Every network source failed — the system voice is the last resort.
    speakOffline(text, language);
    return;
  }
  const audio = new Audio(urls[index]);
  audio.preload = "auto";
  currentAudio = audio;
  const play = audio.play();
  if (play && typeof play.catch === "function") {
    play.catch(() => {
      if (currentAudio !== audio) return; // superseded by a newer click
      currentAudio = null;
      playFrom(urls, index + 1, text, language);
    });
  }
}

export function speak(text: string, language: SpeechLanguage): void {
  const trimmed = text.trim();
  if (!trimmed || typeof window === "undefined") return;

  if (typeof window.Audio === "function") {
    // Stop whatever is playing so rapid clicks do not overlap.
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    playFrom(sources(trimmed, language), 0, trimmed, language);
    return;
  }

  speakOffline(trimmed, language);
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
