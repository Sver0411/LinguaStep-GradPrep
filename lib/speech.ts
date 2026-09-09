/**
 * Thin wrapper around the Web Speech API.
 *
 * LinguaStep deliberately ships no audio files, so pronunciation depends on
 * whatever voices the operating system provides. Unsupported browsers simply
 * never render the speaker button instead of showing a control that does
 * nothing.
 */

export type SpeechLanguage = "ja-JP" | "en-US";

export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.SpeechSynthesisUtterance === "function" &&
    typeof window.speechSynthesis !== "undefined"
  );
}

let warmedUp = false;

/**
 * Chrome populates getVoices() asynchronously; registering the listener early
 * makes the first click use a proper voice instead of the default one.
 */
export function warmUpSpeech(): void {
  if (!isSpeechSupported() || warmedUp) return;
  warmedUp = true;
  const load = () => void window.speechSynthesis.getVoices();
  load();
  window.speechSynthesis.addEventListener?.("voiceschanged", load);
}

function pickVoice(language: SpeechLanguage): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const prefix = language.slice(0, 2).toLowerCase();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === language.toLowerCase()) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ??
    null
  );
}

export function speak(text: string, language: SpeechLanguage): void {
  if (!isSpeechSupported() || !text.trim()) return;
  const synth = window.speechSynthesis;
  // Cancel the previous utterance so rapid clicks do not queue up.
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = language === "ja-JP" ? 0.85 : 1;
  const voice = pickVoice(language);
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

/** True when a usable voice exists for the language, so the UI can hide dead controls. */
export function hasVoice(language: SpeechLanguage): boolean {
  if (!isSpeechSupported()) return false;
  return pickVoice(language) !== null;
}
