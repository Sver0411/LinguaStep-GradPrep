import type { WordPair } from "./models";

export const JAPANESE_STUDY_LEVELS = ["JLPT N3", "JLPT N2", "JLPT N1"] as const;
export const ENGLISH_STUDY_LEVELS = ["CET-4", "CET-6", "TOEIC"] as const;

export type JapaneseStudyLevel = (typeof JAPANESE_STUDY_LEVELS)[number];
export type EnglishStudyLevel = (typeof ENGLISH_STUDY_LEVELS)[number];

export function japaneseStudyLevelFromRank(rank: number): JapaneseStudyLevel {
  if (rank <= 2_000) return "JLPT N3";
  if (rank <= 8_000) return "JLPT N2";
  return "JLPT N1";
}

export function englishStudyLevelFromRank(rank: number): EnglishStudyLevel {
  if (rank <= 3_000) return "CET-4";
  if (rank <= 10_000) return "CET-6";
  return "TOEIC";
}

function normalizeJapaneseLevel(level: string): JapaneseStudyLevel {
  if (/N1/i.test(level) || level.includes("扩展")) return "JLPT N1";
  if (/N2/i.test(level) || level.includes("进阶")) return "JLPT N2";
  return "JLPT N3";
}

function normalizeEnglishLevel(level: string): EnglishStudyLevel {
  if (/TOEIC/i.test(level)) return "TOEIC";
  if (/CET[-・ ]?6|六级/i.test(level)) return "CET-6";
  return "CET-4";
}

/** Normalize legacy and AI-generated labels into the three study categories. */
export function normalizeWordStudyLevels(word: WordPair): WordPair {
  const japaneseDifficulty = normalizeJapaneseLevel(word.japanese.difficulty);
  const englishDifficulty = normalizeEnglishLevel(word.english.difficulty);
  if (
    japaneseDifficulty === word.japanese.difficulty &&
    englishDifficulty === word.english.difficulty
  ) {
    return word;
  }
  return {
    ...word,
    japanese: { ...word.japanese, difficulty: japaneseDifficulty },
    english: { ...word.english, difficulty: englishDifficulty },
  };
}
