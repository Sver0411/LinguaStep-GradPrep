import type {
  DailyRecord,
  GrammarProgress,
  LearningSnapshot,
  MistakeRecord,
  TestResult,
  WordProgress,
} from "../models";

/**
 * Persistence boundary for learning data.
 *
 * UI code should depend on this interface rather than a browser storage API so
 * that IndexedDB can later be replaced by a remote repository.
 */
export interface LearningRepository {
  getSnapshot(): Promise<LearningSnapshot>;
  saveSnapshot(snapshot: LearningSnapshot): Promise<void>;
  upsertWordProgress(progress: WordProgress): Promise<void>;
  upsertGrammarProgress(progress: GrammarProgress): Promise<void>;
  upsertMistake(mistake: MistakeRecord): Promise<void>;
  deleteMistake(id: string): Promise<void>;
  setFavorites(contentIds: readonly string[]): Promise<void>;
  saveTestResult(result: TestResult): Promise<void>;
  upsertDailyRecord(record: DailyRecord): Promise<void>;

  /** Clears progress and history while retaining mistakes and favorites. */
  resetLearningProgress(): Promise<void>;
  resetMistakes(): Promise<void>;
  resetAllData(): Promise<void>;
}
