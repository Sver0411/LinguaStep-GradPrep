/**
 * Pronunciation for Japanese and English words.
 *
 * Two sources, in order:
 *  1. Youdao's public dictionary voice endpoint, which returns a real MP3
 *     recording per word. It is free and needs no key, and its Japanese
 *     voice is far more reliable than whatever speech engine happens to be
 *     installed on the machine.
 *  2. The browser's Web Speech API as an offline fallback, so pronunciation
 *     still works without a network connection when a system voice exists.
 *
 * The app still ships no audio files of its own.
 */

export type SpeechLanguage = "ja-JP" | "en-US";

let currentAudio: HTMLAudioElement | null = null;

function dictionaryUrl(text: string, language: SpeechLanguage): string {
  const query = encodeURIComponent(text);
  return language === "ja-JP"
    ? `https://dict.youdao.com/dictvoice?audio=${query}&le=jap`
    : `https://dict.youdao.com/dictvoice?audio=${query}&type=2`;
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
    const audio = new Audio(dictionaryUrl(trimmed, language));
    audio.preload = "auto";
    currentAudio = audio;
    const play = audio.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => {
        // Network blocked, endpoint unavailable, or autoplay refused — fall
        // back to the system voice instead of failing silently.
        if (currentAudio === audio) currentAudio = null;
        speakOffline(trimmed, language);
      });
    }
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
