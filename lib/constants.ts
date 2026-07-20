import type { AppSettings, LearningSnapshot } from "./models";

export const APP_NAME = "LinguaStep";
export const APP_NAME_ZH = "日英阶梯";
export const APP_VERSION = "0.1.0";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  displayDensity: "compact",
  revealMode: "together",
  dailyNewWords: 20,
  studyRoundSize: 10,
  grammarExerciseCount: 5,
  animations: true,
};

export const EMPTY_SNAPSHOT: LearningSnapshot = {
  wordProgress: [],
  grammarProgress: [],
  mistakes: [],
  favorites: [],
  testResults: [],
  dailyRecords: [],
};

export const MISTAKE_MASTERY_STREAK = 3;
