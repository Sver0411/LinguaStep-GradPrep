import type { AISettings, AppSettings, LearningSnapshot } from "./models";

export const APP_NAME = "LinguaStep";
export const APP_NAME_ZH = "日英阶梯";
export const APP_VERSION = "0.15.2";
export const REVIEW_ALGORITHM_VERSION = 2;

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  focusModeEnabled: false,
  displayDensity: "compact",
  revealMode: "step-by-step",
  revealOrder: "japanese-first",
  studyJapaneseLevel: "all",
  studyEnglishLevel: "all",
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
  immediateTestFeedback: true,
  autoSpeak: false,
  animations: true,
  reduceMotion: false,
  fontSize: "standard",
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: true,
  connectionMode: "byok",
  apiKeyPersistence: "session",
  proxyTokenPersistence: "session",
  autoSave: true,
  defaultWordCount: 5,
  defaultGrammarCount: 10,
  defaultJapaneseLevel: "N2",
  defaultEnglishLevel: "四级",
  defaultFrequency: "高频",
  defaultPurpose: "综合",
  defaultQuality: "fast",
  qualityReview: false,
  autoRetry: true,
  maxRetries: 3,
  dailyRequestSoftLimit: 30,
};

export const EMPTY_SNAPSHOT: LearningSnapshot = {
  wordProgress: [],
  grammarProgress: [],
  mistakes: [],
  favorites: [],
  testResults: [],
  dailyRecords: [],
  dailyPlans: [],
  aiWords: [],
  aiGrammar: [],
  aiComparisons: [],
  aiGenerations: [],
  aiUsage: [],
  aiExplanations: [],
  aiCollections: [],
  aiContentReports: [],
};

export const MISTAKE_MASTERY_STREAK = 3;
