export type ThemeMode = "light" | "dark" | "system";
export type DisplayDensity = "compact" | "full";
export type RevealMode = "together" | "step-by-step";
export type RevealOrder = "japanese-first" | "english-first" | "random";
export type StudyMode = "combined" | "japanese" | "english";
export type MasteryRating = "known" | "fuzzy" | "unknown";
export type LearningStatus = "new" | "learning" | "review" | "mastered";
export type ContentSource = "curated" | "ai-generated" | "user-created";
export type GrammarLanguage = "japanese" | "english";
export type GrammarViewMode = GrammarLanguage | "comparison";
export type QuestionSource = "word" | "grammar" | "comparison";
export type FrequencyLevel = "高频" | "常用" | "普通" | "低频";
export type MistakeState = "active" | "consolidating" | "mastered" | "archived";
export type FontSize = "standard" | "large";
export type WeekendAdjustment = "same" | "lighter" | "heavier";
export type TestMode = "mixed" | "japanese" | "english";
export type TestSourceFilter =
  | "all-learned"
  | "today"
  | "recent-7"
  | "mistakes"
  | "favorites"
  | "due";

export interface WordLanguageEntry {
  term: string;
  reading?: string;
  romanization?: string;
  phonetic?: string;
  partOfSpeech: string;
  difficulty: string;
  example: string;
  exampleZh: string;
  collocations: string[];
}

export interface WordPair {
  id: string;
  meaningZh: string;
  japanese: WordLanguageEntry;
  english: WordLanguageEntry;
  note: string;
  highFrequency: boolean;
  frequency?: FrequencyLevel;
  source: ContentSource;
  audioUrl?: string;
  spellingHint?: string;
}

export interface ChoiceQuestion {
  id: string;
  source: QuestionSource;
  sourceId: string;
  prompt: string;
  context?: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  language?: TestMode;
  difficulty?: string;
  category?: string;
}

export interface GrammarExample {
  text: string;
  translationZh: string;
}

export interface GrammarPoint {
  id: string;
  title: string;
  language: GrammarLanguage;
  level: string;
  explanation: string;
  structure: string;
  connection: string;
  scenarios: string[];
  nuance: string;
  examples: GrammarExample[];
  comparison: {
    japanese: string;
    english: string;
    translationZh: string;
  };
  commonErrors: string[];
  confusables: string[];
  exercises: ChoiceQuestion[];
  source: ContentSource;
}

export interface GrammarComparison {
  id: string;
  semantic: string;
  japanese: string;
  english: string;
  difference: string;
  japaneseExample: string;
  englishExample: string;
  translationZh: string;
  pitfalls: string[];
  exercise: ChoiceQuestion;
  level: string;
}

/** Version 2 review state used by both word modes and grammar items. */
export interface ReviewState {
  status: LearningStatus;
  mastery: MasteryRating;
  firstStudiedAt: string;
  lastStudiedAt: string;
  nextReviewAt: string;
  intervalDays: number;
  reviewCount: number;
  correctStreak: number;
  lapses: number;
  stability: number;
  difficulty: number;
  lastRating: MasteryRating;
  isNew: boolean;
  suspended: boolean;
  algorithmVersion: number;
}

/** Retained as an import-compatible alias for phase-one callers. */
export interface ReviewSchedule {
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
}

export interface WordProgress {
  wordId: string;
  modes: Partial<Record<StudyMode, ReviewState>>;
  nextReviewAt: string;
  lastStudiedAt: string;
  learningStatus: LearningStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GrammarProgress {
  grammarId: string;
  status: LearningStatus;
  studyCount: number;
  correctCount: number;
  attemptCount: number;
  lastStudiedAt: string;
  firstStudiedAt: string;
  nextReviewAt: string;
  review: ReviewState;
}

export interface MistakeHistoryEntry {
  answeredAt: string;
  selectedIndex: number;
  correct: boolean;
}

export interface MistakeRecord {
  id: string;
  contentRef: {
    source: QuestionSource;
    sourceId: string;
  };
  question: ChoiceQuestion;
  selectedIndex: number;
  errorCount: number;
  correctStreak: number;
  active: boolean;
  state: MistakeState;
  priority: number;
  favorite: boolean;
  firstWrongAt: string;
  lastWrongAt: string;
  lastAnsweredAt: string;
  history: MistakeHistoryEntry[];
}

export interface TestAnswer {
  question: ChoiceQuestion;
  selectedIndex: number;
  isCorrect: boolean;
}

export interface TestResult {
  id: string;
  mode: TestMode;
  sourceFilter: TestSourceFilter;
  answers: TestAnswer[];
  correctCount: number;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
}

export interface DailyRecord {
  date: string;
  wordsStudied: number;
  newWordsStudied: number;
  reviewWordsStudied: number;
  japaneseWordsStudied: number;
  englishWordsStudied: number;
  combinedWordsStudied: number;
  grammarStudied: number;
  japaneseGrammarStudied: number;
  englishGrammarStudied: number;
  questionsAnswered: number;
  correctAnswers: number;
}

export interface DailyPlan {
  date: string;
  generatedAt: string;
  newWordIds: string[];
  reviewWordIds: string[];
  overdueWordIds: string[];
  mistakeIds: string[];
  grammarIds: string[];
  testTarget: number;
  studyMode: StudyMode;
}

export interface AppSettings {
  theme: ThemeMode;
  displayDensity: DisplayDensity;
  revealMode: RevealMode;
  revealOrder: RevealOrder;
  defaultStudyMode: StudyMode;
  dailyNewWords: number;
  dailyReviewLimit: number;
  dailyGrammarCount: number;
  dailyTestQuestions: number;
  studyRoundSize: number;
  grammarExerciseCount: number;
  prioritizeMistakes: boolean;
  autoFillPlan: boolean;
  weekendAdjustment: WeekendAdjustment;
  masteryStreak: number;
  immediateTestFeedback: boolean;
  animations: boolean;
  reduceMotion: boolean;
  fontSize: FontSize;
}

export interface LearningSnapshot {
  wordProgress: WordProgress[];
  grammarProgress: GrammarProgress[];
  mistakes: MistakeRecord[];
  favorites: string[];
  testResults: TestResult[];
  dailyRecords: DailyRecord[];
  dailyPlans: DailyPlan[];
}

export interface AiGenerationRequest {
  kind: "word" | "grammar" | "test" | "mistake-explanation";
  language?: GrammarLanguage | "mixed";
  prompt: string;
}

export interface AiGenerationResult<T> {
  data: T;
  provider: "mock" | "deepseek";
  generatedAt: string;
}
