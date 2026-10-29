import type { StudyMode, WordPair } from "./models";
import { speakSequence, type SpeechClip, type SpeechLanguage } from "./speech";
export function revealWordAudio(word: WordPair, mode: StudyMode, before: number, after: number, first: "japanese" | "english", enabled: boolean) {
  if (!enabled || after <= before) return;
  const languages: ("japanese" | "english")[] = mode !== "combined" ? [mode]
    : after === 1 ? [first] : before === 1 ? [first === "japanese" ? "english" : "japanese"]
    : first === "japanese" ? ["japanese", "english"] : ["english", "japanese"];
  const clips = languages.flatMap((language, index) => {
    const foreign: SpeechClip = { text: word[language].term, language: (language === "japanese" ? "ja-JP" : "en-US") as SpeechLanguage, ...(language === "japanese" && word.audioUrl ? { audioUrl: word.audioUrl } : {}) };
    const clips: SpeechClip[] = before === 0 && index === 0
      ? [foreign, { text: word.meaningZh, language: "zh-CN" as SpeechLanguage }]
      : [foreign];
    const entry = word[language];
    if (entry.example.trim()) {
      clips.push({ text: entry.example, language: foreign.language });
      if (entry.exampleZh.trim()) clips.push({ text: entry.exampleZh, language: "zh-CN" });
    }
    return clips;
  });
  void speakSequence(clips);
}
