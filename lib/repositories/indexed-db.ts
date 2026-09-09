import type {
  AIContentReport,
  AIExplanationRecord,
  AIGenerationRecord,
  AISavedCollection,
  AIUsageRecord,
  DailyPlan,
  DailyRecord,
  GrammarComparison,
  GrammarPoint,
  GrammarProgress,
  LearningSnapshot,
  MistakeRecord,
  TestResult,
  WordProgress,
  WordPair,
} from "../models";
import type { LearningRepository, SnapshotPatch } from "./types";
import {
  migrateDailyPlan,
  migrateDailyRecord,
  migrateAICollection,
  migrateAIComparison,
  migrateAIContentReport,
  migrateAIExplanation,
  migrateAIGeneration,
  migrateAIGrammar,
  migrateAIUsage,
  migrateAIWord,
  migrateGrammarProgressRecord,
  migrateMistakeRecord,
  migrateTestResult,
  migrateWordProgressRecord,
} from "./migrations";

export const LEARNING_DATABASE_NAME = "lingua-step-learning";
export const LEARNING_DATABASE_VERSION = 3;

const STORES = {
  wordProgress: "wordProgress",
  grammarProgress: "grammarProgress",
  mistakes: "mistakes",
  favorites: "favorites",
  testResults: "testResults",
  dailyRecords: "dailyRecords",
  dailyPlans: "dailyPlans",
  aiWords: "aiWords",
  aiGrammar: "aiGrammar",
  aiComparisons: "aiComparisons",
  aiGenerations: "aiGenerations",
  aiUsage: "aiUsage",
  aiExplanations: "aiExplanations",
  aiCollections: "aiCollections",
  aiContentReports: "aiContentReports",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

const ALL_STORES: StoreName[] = Object.values(STORES);
const LEARNING_PROGRESS_STORES: StoreName[] = [
  STORES.wordProgress,
  STORES.grammarProgress,
  STORES.testResults,
  STORES.dailyRecords,
  STORES.dailyPlans,
];

interface FavoriteRecord {
  contentId: string;
  position?: number;
}

function ensureIndex(
  store: IDBObjectStore,
  name: string,
  keyPath: string,
): void {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, { unique: false });
  }
}

function migrateStore(
  store: IDBObjectStore,
  migrate: (value: unknown) => object,
): void {
  const request = store.openCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    cursor.update(migrate(cursor.value));
    cursor.continue();
  };
}

/** A recoverable signal that lets the application select the memory fallback. */
export class IndexedDbUnavailableError extends Error {
  readonly originalError: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = "IndexedDbUnavailableError";
    this.originalError = originalError;
  }
}

export function isIndexedDbUnavailableError(
  error: unknown,
): error is IndexedDbUnavailableError {
  return (
    error instanceof IndexedDbUnavailableError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "IndexedDbUnavailableError")
  );
}

/** Safe to call during SSR; merely importing this module never touches window. */
export function isIndexedDbSupported(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

function unavailable(message: string, error?: unknown): IndexedDbUnavailableError {
  if (isIndexedDbUnavailableError(error)) {
    return error;
  }

  return new IndexedDbUnavailableError(message, error);
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDbSupported()) {
    return Promise.reject(
      new IndexedDbUnavailableError(
        "IndexedDB is not available in this environment.",
      ),
    );
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(
        LEARNING_DATABASE_NAME,
        LEARNING_DATABASE_VERSION,
      );
    } catch (error) {
      reject(unavailable("IndexedDB could not be opened.", error));
      return;
    }

    request.onupgradeneeded = (event) => {
      const database = request.result;
      const transaction = request.transaction;
      if (!transaction) {
        throw new Error("IndexedDB upgrade transaction is unavailable.");
      }

      if (!database.objectStoreNames.contains(STORES.wordProgress)) {
        database.createObjectStore(STORES.wordProgress, {
          keyPath: "wordId",
        });
      }
      if (!database.objectStoreNames.contains(STORES.grammarProgress)) {
        database.createObjectStore(STORES.grammarProgress, {
          keyPath: "grammarId",
        });
      }
      if (!database.objectStoreNames.contains(STORES.mistakes)) {
        database.createObjectStore(STORES.mistakes, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STORES.favorites)) {
        database.createObjectStore(STORES.favorites, {
          keyPath: "contentId",
        });
      }
      if (!database.objectStoreNames.contains(STORES.testResults)) {
        database.createObjectStore(STORES.testResults, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STORES.dailyRecords)) {
        database.createObjectStore(STORES.dailyRecords, { keyPath: "date" });
      }
      if (!database.objectStoreNames.contains(STORES.dailyPlans)) {
        database.createObjectStore(STORES.dailyPlans, { keyPath: "date" });
      }
      if (!database.objectStoreNames.contains(STORES.aiWords)) {
        database.createObjectStore(STORES.aiWords, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STORES.aiGrammar)) {
        database.createObjectStore(STORES.aiGrammar, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STORES.aiComparisons)) {
        database.createObjectStore(STORES.aiComparisons, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STORES.aiGenerations)) {
        database.createObjectStore(STORES.aiGenerations, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STORES.aiUsage)) {
        database.createObjectStore(STORES.aiUsage, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STORES.aiExplanations)) {
        database.createObjectStore(STORES.aiExplanations, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STORES.aiCollections)) {
        database.createObjectStore(STORES.aiCollections, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STORES.aiContentReports)) {
        database.createObjectStore(STORES.aiContentReports, { keyPath: "id" });
      }

      const wordStore = transaction.objectStore(STORES.wordProgress);
      const grammarStore = transaction.objectStore(STORES.grammarProgress);
      const mistakeStore = transaction.objectStore(STORES.mistakes);
      const testStore = transaction.objectStore(STORES.testResults);
      const dailyStore = transaction.objectStore(STORES.dailyRecords);
      const planStore = transaction.objectStore(STORES.dailyPlans);
      const aiWordStore = transaction.objectStore(STORES.aiWords);
      const aiGrammarStore = transaction.objectStore(STORES.aiGrammar);
      const aiComparisonStore = transaction.objectStore(STORES.aiComparisons);
      const aiGenerationStore = transaction.objectStore(STORES.aiGenerations);
      const aiUsageStore = transaction.objectStore(STORES.aiUsage);
      const aiExplanationStore = transaction.objectStore(STORES.aiExplanations);
      const aiCollectionStore = transaction.objectStore(STORES.aiCollections);
      const aiReportStore = transaction.objectStore(STORES.aiContentReports);

      ensureIndex(wordStore, "nextReviewAt", "nextReviewAt");
      ensureIndex(wordStore, "lastStudiedAt", "lastStudiedAt");
      ensureIndex(wordStore, "learningStatus", "learningStatus");
      ensureIndex(grammarStore, "nextReviewAt", "nextReviewAt");
      ensureIndex(grammarStore, "lastStudiedAt", "lastStudiedAt");
      ensureIndex(grammarStore, "status", "status");
      ensureIndex(mistakeStore, "lastWrongAt", "lastWrongAt");
      ensureIndex(mistakeStore, "errorCount", "errorCount");
      ensureIndex(mistakeStore, "state", "state");
      ensureIndex(testStore, "completedAt", "completedAt");
      ensureIndex(dailyStore, "date", "date");
      ensureIndex(planStore, "generatedAt", "generatedAt");
      ensureIndex(aiWordStore, "generationId", "aiMetadata.generationId");
      ensureIndex(aiGrammarStore, "generationId", "aiMetadata.generationId");
      ensureIndex(aiComparisonStore, "generationId", "aiMetadata.generationId");
      ensureIndex(aiGenerationStore, "createdAt", "createdAt");
      ensureIndex(aiGenerationStore, "kind", "kind");
      ensureIndex(aiGenerationStore, "status", "status");
      ensureIndex(aiUsageStore, "completedAt", "completedAt");
      ensureIndex(aiUsageStore, "requestId", "requestId");
      ensureIndex(aiExplanationStore, "cacheKey", "cacheKey");
      ensureIndex(aiCollectionStore, "createdAt", "createdAt");
      ensureIndex(aiReportStore, "contentId", "contentId");

      if (event.oldVersion < 2) {
        migrateStore(wordStore, migrateWordProgressRecord);
        migrateStore(grammarStore, migrateGrammarProgressRecord);
        migrateStore(mistakeStore, migrateMistakeRecord);
        migrateStore(testStore, migrateTestResult);
        migrateStore(dailyStore, migrateDailyRecord);
      }
    };

    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }

      settled = true;
      resolve(request.result);
    };

    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(
        unavailable(
          "IndexedDB initialization failed.",
          request.error ?? undefined,
        ),
      );
    };

    request.onblocked = () => {
      if (settled) return;
      settled = true;
      reject(
        new IndexedDbUnavailableError(
          "IndexedDB initialization was blocked by another open tab.",
        ),
      );
    };
  });
}

function transactionCompleted(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        unavailable(
          "The IndexedDB transaction was aborted.",
          transaction.error ?? undefined,
        ),
      );
    transaction.onerror = () => {
      // The abort handler reports the final transaction error.
    };
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        unavailable(
          "An IndexedDB request failed.",
          request.error ?? undefined,
        ),
      );
  });
}

function getAll<T>(store: IDBObjectStore): Promise<T[]> {
  return requestResult(store.getAll() as IDBRequest<T[]>);
}

/**
 * IndexedDB implementation with one object store per structured data family.
 * The constructor is SSR-safe; the database is opened lazily on first use.
 */
export class IndexedDbLearningRepository implements LearningRepository {
  private databasePromise: Promise<IDBDatabase> | undefined;

  async getSnapshot(): Promise<LearningSnapshot> {
    const database = await this.getDatabase();
    let transaction: IDBTransaction;

    try {
      transaction = database.transaction(ALL_STORES, "readonly");
    } catch (error) {
      throw unavailable("IndexedDB is not ready for reading.", error);
    }

    const completed = transactionCompleted(transaction);
    const wordProgress = getAll<WordProgress>(
      transaction.objectStore(STORES.wordProgress),
    );
    const grammarProgress = getAll<GrammarProgress>(
      transaction.objectStore(STORES.grammarProgress),
    );
    const mistakes = getAll<MistakeRecord>(
      transaction.objectStore(STORES.mistakes),
    );
    const favorites = getAll<FavoriteRecord>(
      transaction.objectStore(STORES.favorites),
    );
    const testResults = getAll<TestResult>(
      transaction.objectStore(STORES.testResults),
    );
    const dailyRecords = getAll<DailyRecord>(
      transaction.objectStore(STORES.dailyRecords),
    );
    const dailyPlans = getAll<DailyPlan>(
      transaction.objectStore(STORES.dailyPlans),
    );
    const aiWords = getAll<WordPair>(transaction.objectStore(STORES.aiWords));
    const aiGrammar = getAll<GrammarPoint>(
      transaction.objectStore(STORES.aiGrammar),
    );
    const aiComparisons = getAll<GrammarComparison>(
      transaction.objectStore(STORES.aiComparisons),
    );
    const aiGenerations = getAll<AIGenerationRecord>(
      transaction.objectStore(STORES.aiGenerations),
    );
    const aiUsage = getAll<AIUsageRecord>(
      transaction.objectStore(STORES.aiUsage),
    );
    const aiExplanations = getAll<AIExplanationRecord>(
      transaction.objectStore(STORES.aiExplanations),
    );
    const aiCollections = getAll<AISavedCollection>(
      transaction.objectStore(STORES.aiCollections),
    );
    const aiContentReports = getAll<AIContentReport>(
      transaction.objectStore(STORES.aiContentReports),
    );

    try {
      const [
        storedWordProgress,
        storedGrammarProgress,
        storedMistakes,
        storedFavorites,
        storedTestResults,
        storedDailyRecords,
        storedDailyPlans,
        storedAIWords,
        storedAIGrammar,
        storedAIComparisons,
        storedAIGenerations,
        storedAIUsage,
        storedAIExplanations,
        storedAICollections,
        storedAIContentReports,
      ] = await Promise.all([
        wordProgress,
        grammarProgress,
        mistakes,
        favorites,
        testResults,
        dailyRecords,
        dailyPlans,
        aiWords,
        aiGrammar,
        aiComparisons,
        aiGenerations,
        aiUsage,
        aiExplanations,
        aiCollections,
        aiContentReports,
      ] as const);
      await completed;

      return {
        wordProgress: storedWordProgress.map((item) => migrateWordProgressRecord(item)),
        grammarProgress: storedGrammarProgress.map((item) =>
          migrateGrammarProgressRecord(item),
        ),
        mistakes: storedMistakes.map((item) => migrateMistakeRecord(item)),
        favorites: storedFavorites
          .map((favorite, index) => ({
            contentId: favorite.contentId,
            position: favorite.position ?? index,
          }))
          .sort(
            (left, right) =>
              left.position - right.position ||
              left.contentId.localeCompare(right.contentId),
          )
          .map((favorite) => favorite.contentId),
        testResults: storedTestResults.map((item) => migrateTestResult(item)),
        dailyRecords: storedDailyRecords.map((item) => migrateDailyRecord(item)),
        dailyPlans: storedDailyPlans.map((item) => migrateDailyPlan(item)),
        aiWords: storedAIWords.map((item) => migrateAIWord(item)),
        aiGrammar: storedAIGrammar.map((item) => migrateAIGrammar(item)),
        aiComparisons: storedAIComparisons.map((item) => migrateAIComparison(item)),
        aiGenerations: storedAIGenerations.map((item) => migrateAIGeneration(item)),
        aiUsage: storedAIUsage.map((item) => migrateAIUsage(item)),
        aiExplanations: storedAIExplanations.map((item) => migrateAIExplanation(item)),
        aiCollections: storedAICollections.map((item) => migrateAICollection(item)),
        aiContentReports: storedAIContentReports.map((item) => migrateAIContentReport(item)),
      };
    } catch (error) {
      await completed.catch(() => undefined);
      throw unavailable("Learning data could not be read from IndexedDB.", error);
    }
  }

  async saveSnapshot(snapshot: LearningSnapshot): Promise<void> {
    await this.write(ALL_STORES, (transaction) => {
      const wordStore = transaction.objectStore(STORES.wordProgress);
      const grammarStore = transaction.objectStore(STORES.grammarProgress);
      const mistakeStore = transaction.objectStore(STORES.mistakes);
      const favoriteStore = transaction.objectStore(STORES.favorites);
      const testStore = transaction.objectStore(STORES.testResults);
      const dailyStore = transaction.objectStore(STORES.dailyRecords);
      const planStore = transaction.objectStore(STORES.dailyPlans);
      const aiWordStore = transaction.objectStore(STORES.aiWords);
      const aiGrammarStore = transaction.objectStore(STORES.aiGrammar);
      const aiComparisonStore = transaction.objectStore(STORES.aiComparisons);
      const aiGenerationStore = transaction.objectStore(STORES.aiGenerations);
      const aiUsageStore = transaction.objectStore(STORES.aiUsage);
      const aiExplanationStore = transaction.objectStore(STORES.aiExplanations);
      const aiCollectionStore = transaction.objectStore(STORES.aiCollections);
      const aiReportStore = transaction.objectStore(STORES.aiContentReports);

      for (const store of [
        wordStore,
        grammarStore,
        mistakeStore,
        favoriteStore,
        testStore,
        dailyStore,
        planStore,
        aiWordStore,
        aiGrammarStore,
        aiComparisonStore,
        aiGenerationStore,
        aiUsageStore,
        aiExplanationStore,
        aiCollectionStore,
        aiReportStore,
      ]) {
        store.clear();
      }

      snapshot.wordProgress.forEach((item) => wordStore.put(item));
      snapshot.grammarProgress.forEach((item) => grammarStore.put(item));
      snapshot.mistakes.forEach((item) => mistakeStore.put(item));
      [...new Set(snapshot.favorites)].forEach((contentId, position) =>
        favoriteStore.put({ contentId, position } satisfies FavoriteRecord),
      );
      snapshot.testResults.forEach((item) => testStore.put(item));
      snapshot.dailyRecords.forEach((item) => dailyStore.put(item));
      snapshot.dailyPlans.forEach((item) => planStore.put(item));
      snapshot.aiWords.forEach((item) => aiWordStore.put(item));
      snapshot.aiGrammar.forEach((item) => aiGrammarStore.put(item));
      snapshot.aiComparisons.forEach((item) => aiComparisonStore.put(item));
      snapshot.aiGenerations.forEach((item) => aiGenerationStore.put(item));
      snapshot.aiUsage.forEach((item) => aiUsageStore.put(item));
      snapshot.aiExplanations.forEach((item) => aiExplanationStore.put(item));
      snapshot.aiCollections.forEach((item) => aiCollectionStore.put(item));
      snapshot.aiContentReports.forEach((item) => aiReportStore.put(item));
    });
  }

  async saveSnapshotPatch(patch: SnapshotPatch): Promise<void> {
    const entries = (
      Object.entries(patch) as Array<
        [keyof typeof STORES, readonly unknown[] | undefined]
      >
    ).filter((entry): entry is [keyof typeof STORES, readonly unknown[]] =>
      Array.isArray(entry[1]),
    );
    if (entries.length === 0) return;

    const storeNames = entries
      .map(([key]) => STORES[key])
      .filter((name): name is StoreName => Boolean(name));

    await this.write(storeNames, (transaction) => {
      entries.forEach(([key, values]) => {
        const store = transaction.objectStore(STORES[key]);
        store.clear();
        if (key === "favorites") {
          [...new Set(values as readonly string[])].forEach(
            (contentId, position) =>
              store.put({ contentId, position } satisfies FavoriteRecord),
          );
          return;
        }
        values.forEach((value) => store.put(value as object));
      });
    });
  }

  async upsertWordProgress(progress: WordProgress): Promise<void> {
    await this.put(STORES.wordProgress, progress);
  }

  async upsertGrammarProgress(progress: GrammarProgress): Promise<void> {
    await this.put(STORES.grammarProgress, progress);
  }

  async upsertMistake(mistake: MistakeRecord): Promise<void> {
    await this.put(STORES.mistakes, mistake);
  }

  async deleteMistake(id: string): Promise<void> {
    await this.write([STORES.mistakes], (transaction) => {
      transaction.objectStore(STORES.mistakes).delete(id);
    });
  }

  async setFavorites(contentIds: readonly string[]): Promise<void> {
    await this.write([STORES.favorites], (transaction) => {
      const store = transaction.objectStore(STORES.favorites);
      store.clear();
      [...new Set(contentIds)].forEach((contentId, position) =>
        store.put({ contentId, position } satisfies FavoriteRecord),
      );
    });
  }

  async saveTestResult(result: TestResult): Promise<void> {
    await this.put(STORES.testResults, result);
  }

  async upsertDailyRecord(record: DailyRecord): Promise<void> {
    await this.put(STORES.dailyRecords, record);
  }

  async upsertDailyPlan(plan: DailyPlan): Promise<void> {
    await this.put(STORES.dailyPlans, plan);
  }

  async resetLearningProgress(): Promise<void> {
    await this.clear(LEARNING_PROGRESS_STORES);
  }

  async resetMistakes(): Promise<void> {
    await this.clear([STORES.mistakes]);
  }

  async resetTests(): Promise<void> {
    await this.clear([STORES.testResults]);
  }

  async resetFavorites(): Promise<void> {
    await this.clear([STORES.favorites]);
  }

  async resetAllData(): Promise<void> {
    await this.clear(ALL_STORES);
  }

  private async getDatabase(): Promise<IDBDatabase> {
    if (!this.databasePromise) {
      const pending = openDatabase();
      this.databasePromise = pending
        .then((database) => {
          database.onversionchange = () => {
            database.close();
            this.databasePromise = undefined;
          };
          return database;
        })
        .catch((error: unknown) => {
          this.databasePromise = undefined;
          throw unavailable("IndexedDB initialization failed.", error);
        });
    }

    return this.databasePromise;
  }

  private async put(storeName: StoreName, value: object): Promise<void> {
    await this.write([storeName], (transaction) => {
      transaction.objectStore(storeName).put(value);
    });
  }

  private async clear(storeNames: StoreName[]): Promise<void> {
    await this.write(storeNames, (transaction) => {
      storeNames.forEach((storeName) =>
        transaction.objectStore(storeName).clear(),
      );
    });
  }

  private async write(
    storeNames: StoreName[],
    operation: (transaction: IDBTransaction) => void,
  ): Promise<void> {
    const database = await this.getDatabase();

    try {
      const transaction = database.transaction(storeNames, "readwrite");
      const completed = transactionCompleted(transaction);

      try {
        operation(transaction);
      } catch (error) {
        try {
          transaction.abort();
        } catch {
          // The browser may already have aborted the failed transaction.
        }
        await completed.catch(() => undefined);
        throw error;
      }

      await completed;
    } catch (error) {
      throw unavailable("Learning data could not be saved to IndexedDB.", error);
    }
  }
}
