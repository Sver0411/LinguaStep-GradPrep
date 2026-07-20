export type ThemeMode = "light" | "dark" | "system";
export type DisplayDensity = "compact" | "full";
export type RevealMode = "together" | "step-by-step";
export type MasteryRating = "known" | "fuzzy" | "unknown";
export type LearningStatus = "new" | "learning" | "learned";
export type ContentSource = "curated" | "ai-generated" | "user-created";
export type GrammarLanguage = "japanese" | "english";
export type QuestionSource = "word" | "grammar";

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

export interface ReviewSchedule {
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
}

export interface WordProgress {
  wordId: string;
  status: LearningStatus;
  mastery: MasteryRating;
  studyCount: number;
  lastStudiedAt: string;
  firstStudiedAt: string;
  schedule: ReviewSchedule;
}

export interface GrammarProgress {
  grammarId: string;
  status: LearningStatus;
  studyCount: number;
  correctCount: number;
  attemptCount: number;
  lastStudiedAt: string;
  firstStudiedAt: string;
  schedule: ReviewSchedule;
}

export interface MistakeRecord {
  id: string;
  question: ChoiceQuestion;
  selectedIndex: number;
  errorCount: number;
  correctStreak: number;
  active: boolean;
  priority: number;
  firstWrongAt: string;
  lastWrongAt: string;
  lastAnsweredAt: string;
}

export interface TestAnswer {
  question: ChoiceQuestion;
  selectedIndex: number;
  isCorrect: boolean;
}

export interface TestResult {
  id: string;
  mode: "mixed" | "japanese" | "english";
  answers: TestAnswer[];
  correctCount: number;
  completedAt: string;
}

export interface DailyRecord {
  date: string;
  wordsStudied: number;
  newWordsStudied?: number;
  reviewWordsStudied?: number;
  grammarStudied: number;
  questionsAnswered: number;
  correctAnswers: number;
}

export interface AppSettings {
  theme: ThemeMode;
  displayDensity: DisplayDensity;
  revealMode: RevealMode;
  dailyNewWords: number;
  studyRoundSize: number;
  grammarExerciseCount: number;
  animations: boolean;
}

export interface LearningSnapshot {
  wordProgress: WordProgress[];
  grammarProgress: GrammarProgress[];
  mistakes: MistakeRecord[];
  favorites: string[];
  testResults: TestResult[];
  dailyRecords: DailyRecord[];
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
