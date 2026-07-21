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
export type AIProviderName = "deepseek" | "mock";
export type AIConnectionMode = "server" | "byok";
export type AISecretPersistence = "session" | "device";
export type AISaveMode = "saved" | "temporary";
export type AIValidationStatus = "passed" | "repaired" | "rejected";
export type AIGenerationKind = "words" | "grammar" | "quiz" | "explanation";
export type AIGenerationStatus = "running" | "succeeded" | "partial" | "failed" | "cancelled";
export type AIErrorCode =
  | "NOT_CONFIGURED"
  | "INVALID_API_KEY"
  | "PROXY_ACCESS_DENIED"
  | "INSUFFICIENT_BALANCE"
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "MODEL_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "SERVER_OVERLOADED"
  | "EMPTY_RESPONSE"
  | "TRUNCATED_RESPONSE"
  | "INVALID_JSON"
  | "SCHEMA_VALIDATION_FAILED"
  | "CONTENT_VALIDATION_FAILED"
  | "REQUEST_CANCELLED"
  | "DAILY_LIMIT_REACHED"
  | "OFFLINE"
  | "UNKNOWN";

export interface AIContentMetadata {
  source: "ai";
  provider: "deepseek";
  model: string;
  promptName: string;
  promptVersion: string;
  generationId: string;
  generatedAt: string;
  validationStatus: AIValidationStatus;
  contentHash: string;
}

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
  tags?: string[];
  source: ContentSource;
  aiMetadata?: AIContentMetadata;
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
  confusableDifferences?: string[];
  exercises: ChoiceQuestion[];
  source: ContentSource;
  aiMetadata?: AIContentMetadata;
}

export interface GrammarComparison {
  id: string;
  semantic: string;
  japanese: string;
  english: string;
  difference: string;
  samePoints?: string;
  nonInterchangeable?: string[];
  japaneseExample: string;
  englishExample: string;
  translationZh: string;
  pitfalls: string[];
  exercise: ChoiceQuestion;
  level: string;
  source?: ContentSource;
  aiMetadata?: AIContentMetadata;
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
  focusModeEnabled: boolean;
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

export interface AISettings {
  enabled: boolean;
  connectionMode: AIConnectionMode;
  apiKeyPersistence: AISecretPersistence;
  proxyTokenPersistence: AISecretPersistence;
  autoSave: boolean;
  defaultWordCount: 1 | 5 | 10;
  defaultJapaneseLevel: "N3" | "N2" | "N1";
  defaultEnglishLevel: "高中基础" | "四级" | "六级" | "TOEIC 过渡";
  defaultFrequency: "高频" | "常用" | "普通";
  defaultPurpose: "日常" | "考试" | "综合";
  defaultQuality: "fast" | "quality";
  qualityReview: boolean;
  autoRetry: boolean;
  maxRetries: number;
  dailyRequestSoftLimit: number;
}

export interface AIGenerationRecord {
  id: string;
  requestId: string;
  kind: AIGenerationKind;
  createdAt: string;
  completedAt: string;
  provider: AIProviderName;
  model: string;
  promptName: string;
  promptVersion: string;
  status: AIGenerationStatus;
  saveMode: AISaveMode;
  validationStatus: AIValidationStatus;
  requestedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  contentIds: string[];
  previewLabels: string[];
  parameters?: Record<string, string | number | boolean | undefined>;
  usageId?: string;
  errorCode?: AIErrorCode;
  errorMessage?: string;
}

export interface AIUsageRecord {
  id: string;
  requestId: string;
  operation: AIGenerationKind | "health" | "models" | "repair" | "review";
  model: string;
  promptName: string;
  promptVersion: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  success: boolean;
  retryCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheHitTokens: number;
  errorCode?: AIErrorCode;
}

export interface AIExplanationContent {
  whyCorrect: string;
  whyUserChoiceWrong: string;
  keyPoint: string;
  languageDifference: string;
  example: string;
  preventionTip: string;
}

export interface AIExplanationRecord {
  id: string;
  cacheKey: string;
  questionId: string;
  selectedIndex: number;
  correctIndex: number;
  variant: "simple" | "detailed";
  content: AIExplanationContent;
  model: string;
  promptVersion: string;
  generatedAt: string;
  generationId: string;
}

export interface AISavedCollection {
  id: string;
  title: string;
  generationId: string;
  createdAt: string;
  questions: ChoiceQuestion[];
}

export interface AIContentReport {
  id: string;
  contentType: "word" | "grammar" | "comparison" | "quiz";
  contentId: string;
  generationId: string;
  reason: string;
  createdAt: string;
  status: "open" | "resolved";
}

export interface LearningSnapshot {
  wordProgress: WordProgress[];
  grammarProgress: GrammarProgress[];
  mistakes: MistakeRecord[];
  favorites: string[];
  testResults: TestResult[];
  dailyRecords: DailyRecord[];
  dailyPlans: DailyPlan[];
  aiWords: WordPair[];
  aiGrammar: GrammarPoint[];
  aiComparisons: GrammarComparison[];
  aiGenerations: AIGenerationRecord[];
  aiUsage: AIUsageRecord[];
  aiExplanations: AIExplanationRecord[];
  aiCollections: AISavedCollection[];
  aiContentReports: AIContentReport[];
}
