/**
 * The vocabulary of this module: what it exposes, in one place.
 *
 * Kept separate so the provider, the store and every action hook can describe
 * themselves without importing each other.
 */
import type { AIArtifactBatch } from "@/lib/ai/client/artifact-library";
import type {
  AppSettings,
  DailyPlan,
  GrammarComparison,
  GrammarPoint,
  GrammarProgress,
  LearningSnapshot,
  MasteryRating,
  MistakeRecord,
  MistakeState,
  QuestionSource,
  StudyMode,
  TestAnswer,
  TestMode,
  TestResult,
  TestSourceFilter,
  WordPair,
  WordProgress,
} from "@/lib/models";

export type ResetScope =
  | "progress"
  | "tests"
  | "mistakes"
  | "favorites"
  | "all";
export type FavoriteKind = "word" | "grammar" | "comparison" | "vocab";
export type AIClearScope = "history" | "explanations" | "content" | "all";

export interface BackupPayload {
  app: string;
  version: string;
  exportedAt: string;
  settings: AppSettings;
  snapshot: LearningSnapshot;
}

export interface BackupImportResult {
  ok: boolean;
  message: string;
}

export interface CompleteTestOptions {
  mode: TestMode;
  sourceFilter: TestSourceFilter;
  startedAt: string;
}

export interface LearningContextValue {
  snapshot: LearningSnapshot;
  settings: AppSettings;
  allWords: WordPair[];
  allGrammar: GrammarPoint[];
  allComparisons: GrammarComparison[];
  ready: boolean;
  storageDegraded: boolean;
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
  studyWord: (
    wordId: string,
    rating: MasteryRating,
    mode?: StudyMode,
  ) => Promise<WordProgress>;
  completeGrammar: (
    grammarId: string,
    answers: TestAnswer[],
  ) => Promise<GrammarProgress>;
  completeTest: (
    answers: TestAnswer[],
    options?: Partial<CompleteTestOptions>,
  ) => Promise<TestResult>;
  answerMistake: (
    mistakeId: string,
    selectedIndex: number,
  ) => Promise<MistakeRecord | null>;
  setMistakeState: (mistakeId: string, state: MistakeState) => Promise<void>;
  removeMistake: (mistakeId: string) => Promise<void>;
  toggleMistakeFavorite: (mistakeId: string) => Promise<void>;
  toggleFavorite: (kind: FavoriteKind, id: string) => Promise<void>;
  removeFavorites: (keys: readonly string[]) => Promise<void>;
  isFavorite: (kind: FavoriteKind, id: string) => boolean;
  markWordKnown: (wordId: string, mode?: StudyMode) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  rebuildTodayPlan: () => Promise<DailyPlan>;
  saveAIArtifacts: (batch: AIArtifactBatch) => Promise<void>;
  removeAIContent: (keys: readonly string[]) => Promise<void>;
  undoAIGeneration: (generationId: string) => Promise<void>;
  removeAIGeneration: (generationId: string, removeContent?: boolean) => Promise<void>;
  clearAIData: (scope: AIClearScope) => Promise<void>;
  resetData: (scope: ResetScope) => Promise<void>;
  exportBackup: () => string;
  importBackup: (raw: string) => Promise<BackupImportResult>;
}
