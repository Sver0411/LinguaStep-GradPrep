import type { AppSettings, LearningSnapshot } from "./models";

export const APP_NAME = "LinguaStep";
export const APP_NAME_ZH = "日英阶梯";
export const APP_VERSION = "0.2.0";
export const REVIEW_ALGORITHM_VERSION = 2;

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  displayDensity: "compact",
  revealMode: "together",
  revealOrder: "japanese-first",
  defaultStudyMode: "combined",
  dailyNewWords: 20,
  dailyReviewLimit: 50,
  dailyGrammarCount: 1,
  dailyTestQuestions: 10,
  studyRoundSize: 10,
  grammarExerciseCount: 5,
  prioritizeMistakes: true,
  autoFillPlan: true,
  weekendAdjustment: "same",
  masteryStreak: 3,
  immediateTestFeedback: false,
  animations: true,
  reduceMotion: false,
  fontSize: "standard",
};

export const EMPTY_SNAPSHOT: LearningSnapshot = {
  wordProgress: [],
  grammarProgress: [],
  mistakes: [],
  favorites: [],
  testResults: [],
  dailyRecords: [],
  dailyPlans: [],
};

export const MISTAKE_MASTERY_STREAK = 3;
