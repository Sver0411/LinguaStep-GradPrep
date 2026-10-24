import type { AppSettings, WordPair } from "./models";
export const STUDY_GOALS = ["general", "N3", "N2", "N1", "CET-4", "CET-6", "TOEIC"] as const;
export const GOAL_LABELS: Record<string, string> = { general: "综合学习", "N3": "JLPT N3", "N2": "JLPT N2", "N1": "JLPT N1", "CET-4": "英语四级", "CET-6": "英语六级", TOEIC: "TOEIC" };
export function wordInGoal(word: WordPair, settings: AppSettings): boolean {
  const mode = settings.defaultStudyMode;
  if (mode !== "japanese" && !word.english.term) return false;
  const goal = settings.primaryGoal ?? "general";
  if (goal !== "general") {
    const level = /^N/.test(goal) ? word.japanese.difficulty : word.english.difficulty;
    if (!level.includes(goal)) return false;
  }
  if (mode !== "english" && settings.studyJapaneseLevel !== "all" && word.japanese.difficulty !== settings.studyJapaneseLevel) return false;
  if (mode !== "japanese" && settings.studyEnglishLevel !== "all" && word.english.difficulty !== settings.studyEnglishLevel) return false;
  return true;
}
