import type {
  DailyRecord,
  GrammarProgress,
  LearningSnapshot,
  MistakeRecord,
  TestResult,
  WordProgress,
} from "../models";
import type { LearningRepository } from "./types";

export const LEARNING_DATABASE_NAME = "lingua-step-learning";
export const LEARNING_DATABASE_VERSION = 1;

const STORES = {
  wordProgress: "wordProgress",
  grammarProgress: "grammarProgress",
  mistakes: "mistakes",
  favorites: "favorites",
  testResults: "testResults",
  dailyRecords: "dailyRecords",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

const ALL_STORES: StoreName[] = Object.values(STORES);
const LEARNING_PROGRESS_STORES: StoreName[] = [
  STORES.wordProgress,
  STORES.grammarProgress,
  STORES.testResults,
  STORES.dailyRecords,
];

interface FavoriteRecord {
  contentId: string;
  position?: number;
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

    request.onupgradeneeded = () => {
      const database = request.result;

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

    try {
      const values = await Promise.all([
        wordProgress,
        grammarProgress,
        mistakes,
        favorites,
        testResults,
        dailyRecords,
      ] as const);
      await completed;

      return {
        wordProgress: values[0],
        grammarProgress: values[1],
        mistakes: values[2],
        favorites: values[3]
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
        testResults: values[4],
        dailyRecords: values[5],
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

      for (const store of [
        wordStore,
        grammarStore,
        mistakeStore,
        favoriteStore,
        testStore,
        dailyStore,
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

  async resetLearningProgress(): Promise<void> {
    await this.clear(LEARNING_PROGRESS_STORES);
  }

  async resetMistakes(): Promise<void> {
    await this.clear([STORES.mistakes]);
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
