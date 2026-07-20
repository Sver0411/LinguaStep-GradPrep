import { EMPTY_SNAPSHOT } from "../constants";
import type {
  DailyPlan,
  DailyRecord,
  GrammarProgress,
  LearningSnapshot,
  MistakeRecord,
  TestResult,
  WordProgress,
} from "../models";
import type { LearningRepository } from "./types";

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function replaceByKey<T>(
  values: readonly T[],
  value: T,
  getKey: (item: T) => string,
): T[] {
  const key = getKey(value);
  const index = values.findIndex((item) => getKey(item) === key);

  if (index === -1) {
    return [...values, value];
  }

  const next = [...values];
  next[index] = value;
  return next;
}

/**
 * Session-only fallback used when IndexedDB cannot be opened.
 * Copies are made at the repository boundary so callers cannot mutate state by
 * retaining a reference returned from getSnapshot().
 */
export class MemoryLearningRepository implements LearningRepository {
  private snapshot: LearningSnapshot;

  constructor(initialSnapshot: LearningSnapshot = EMPTY_SNAPSHOT) {
    this.snapshot = clone(initialSnapshot);
  }

  async getSnapshot(): Promise<LearningSnapshot> {
    return clone(this.snapshot);
  }

  async saveSnapshot(snapshot: LearningSnapshot): Promise<void> {
    this.snapshot = clone(snapshot);
  }

  async upsertWordProgress(progress: WordProgress): Promise<void> {
    this.snapshot.wordProgress = replaceByKey(
      this.snapshot.wordProgress,
      clone(progress),
      (item) => item.wordId,
    );
  }

  async upsertGrammarProgress(progress: GrammarProgress): Promise<void> {
    this.snapshot.grammarProgress = replaceByKey(
      this.snapshot.grammarProgress,
      clone(progress),
      (item) => item.grammarId,
    );
  }

  async upsertMistake(mistake: MistakeRecord): Promise<void> {
    this.snapshot.mistakes = replaceByKey(
      this.snapshot.mistakes,
      clone(mistake),
      (item) => item.id,
    );
  }

  async deleteMistake(id: string): Promise<void> {
    this.snapshot.mistakes = this.snapshot.mistakes.filter(
      (mistake) => mistake.id !== id,
    );
  }

  async setFavorites(contentIds: readonly string[]): Promise<void> {
    this.snapshot.favorites = [...new Set(contentIds)];
  }

  async saveTestResult(result: TestResult): Promise<void> {
    this.snapshot.testResults = replaceByKey(
      this.snapshot.testResults,
      clone(result),
      (item) => item.id,
    );
  }

  async upsertDailyRecord(record: DailyRecord): Promise<void> {
    this.snapshot.dailyRecords = replaceByKey(
      this.snapshot.dailyRecords,
      clone(record),
      (item) => item.date,
    );
  }

  async upsertDailyPlan(plan: DailyPlan): Promise<void> {
    this.snapshot.dailyPlans = replaceByKey(
      this.snapshot.dailyPlans,
      clone(plan),
      (item) => item.date,
    );
  }

  async resetLearningProgress(): Promise<void> {
    this.snapshot.wordProgress = [];
    this.snapshot.grammarProgress = [];
    this.snapshot.testResults = [];
    this.snapshot.dailyRecords = [];
    this.snapshot.dailyPlans = [];
  }

  async resetMistakes(): Promise<void> {
    this.snapshot.mistakes = [];
  }

  async resetTests(): Promise<void> {
    this.snapshot.testResults = [];
  }

  async resetFavorites(): Promise<void> {
    this.snapshot.favorites = [];
  }

  async resetAllData(): Promise<void> {
    this.snapshot = clone(EMPTY_SNAPSHOT);
  }
}
