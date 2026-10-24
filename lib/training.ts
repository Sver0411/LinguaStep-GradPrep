import { EXAM_QUESTIONS } from "@/data/exam-questions";
import type { ChoiceQuestion, GrammarPoint, StudyMode, TestResult, WordPair } from "./models";
import type { SpeechLanguage } from "./speech";
export type TrainingKind = "listening" | "dictation" | "cloze" | "reading";
export interface TrainingItem { question: ChoiceQuestion; audio?: { text: string; language: SpeechLanguage }; expected?: string[] }
export const TRAINING_LABELS: Record<TrainingKind, string> = { listening: "短句听辨", dictation: "听写", cloze: "语法填空", reading: "新语境阅读" };
export function normalizeTypedAnswer(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
}
export function matchesTypedAnswer(value: string, expected: readonly string[]): boolean {
  const answer = normalizeTypedAnswer(value);
  return answer.length > 0 && expected.some((item) => normalizeTypedAnswer(item) === answer);
}
export function buildTrainingItems(kind: TrainingKind, mode: StudyMode, words: readonly WordPair[], grammar: readonly GrammarPoint[], results: readonly TestResult[], goal = "general"): TrainingItem[] {
  const language = mode === "english" ? "english" : "japanese";
  const seen = new Set(results.flatMap((result) => result.answers.map((answer) => answer.question.id)));
  let items: TrainingItem[];
  if (kind === "reading") {
    items = EXAM_QUESTIONS.filter((question) => question.examLanguage === language && question.examSection === "reading" && (goal === "general" || question.examLevel === goal)).map((question) => ({ question }));
  } else if (kind === "cloze") {
    items = grammar.filter((point) => point.language === language && (goal === "general" || point.level.includes(goal))).flatMap((point) => point.exercises.map((exercise) => ({
      question: { ...exercise, id: `cloze-${exercise.id}`, source: "grammar" as const, sourceId: point.id, category: "cloze", language, explanation: `${exercise.explanation}\n接续：${point.connection}\n易混：${point.confusables.join("；")}\n${(point.confusableDifferences ?? []).join("；")}` },
      expected: [exercise.options[exercise.correctIndex]],
    })));
  } else {
    const eligible = words.filter((word) => (goal === "general" || word[language].difficulty.includes(goal)) && word[language].example && (kind === "dictation" || word[language].exampleZh));
    const unique = new Map(eligible.map((word) => [word[language].example, word]));
    const pool = [...unique.values()];
    const translationPool = [...new Set(pool.map((word) => word[language].exampleZh).filter(Boolean))];
    items = pool.flatMap((word) => {
      const entry = word[language];
      if (kind === "listening") {
        const translations: string[] = [];
        for (const translation of translationPool) {
          if (translation !== entry.exampleZh) translations.push(translation);
          if (translations.length === 3) break;
        }
        if (translations.length < 3) return [];
        return [{ audio: { text: entry.example, language: language === "japanese" ? "ja-JP" as const : "en-US" as const }, question: {
          id: `listening-${language}-${word.id}`, source: "word" as const, sourceId: word.id, language, category: "listening",
          prompt: "听短句，选择正确的中文意思。", options: [entry.exampleZh, ...translations] as [string, string, string, string], correctIndex: 0,
          explanation: `${entry.example}\n${entry.exampleZh}`,
        } }];
      }
      return [{ audio: { text: entry.example, language: language === "japanese" ? "ja-JP" as const : "en-US" as const }, expected: [entry.example], question: {
        id: `dictation-${language}-${word.id}`, source: "word" as const, sourceId: word.id, language, category: "dictation", prompt: "听音频，写出原句（忽略标点、空格和英文大小写）。",
        options: [entry.example, "输入与原句不符", "", ""] as [string, string, string, string], correctIndex: 0, explanation: `${entry.example}\n${entry.exampleZh}`,
      } }];
    });
  }
  // Keep playback and text grading when the same question is saved to the mistake notebook.
  items = items.map((item) => ({ ...item, question: { ...item.question,
    ...(item.audio ? { audio: item.audio } : {}),
    ...(item.expected ? { acceptedAnswers: item.expected } : {}),
  } }));
  // New prompts first. Only fall back to previous prompts when the fresh pool is exhausted.
  return items.sort((a, b) => Number(seen.has(a.question.id)) - Number(seen.has(b.question.id)));
}
