import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  IndexedDbLearningRepository,
  LEARNING_DATABASE_NAME,
  LEARNING_DATABASE_VERSION,
  isIndexedDbSupported,
} from "../lib/repositories";
import { makeDailyPlan, makeSnapshot } from "./fixtures";

function openLegacyDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEARNING_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore("wordProgress", { keyPath: "wordId" });
      database.createObjectStore("grammarProgress", { keyPath: "grammarId" });
      database.createObjectStore("mistakes", { keyPath: "id" });
      database.createObjectStore("favorites", { keyPath: "contentId" });
      database.createObjectStore("testResults", { keyPath: "id" });
      database.createObjectStore("dailyRecords", { keyPath: "date" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(
        [
          "wordProgress",
          "grammarProgress",
          "mistakes",
          "favorites",
          "testResults",
          "dailyRecords",
        ],
        "readwrite",
      );
      const schedule = {
        dueAt: "2026-07-23T04:00:00.000Z",
        intervalDays: 3,
        easeFactor: 2.35,
        repetitions: 1,
        lapses: 0,
      };
      transaction.objectStore("wordProgress").put({
        wordId: "word-legacy",
        status: "learned",
        mastery: "known",
        studyCount: 1,
        firstStudiedAt: "2026-07-20T04:00:00.000Z",
        lastStudiedAt: "2026-07-20T04:00:00.000Z",
        schedule,
      });
      transaction.objectStore("grammarProgress").put({
        grammarId: "grammar-legacy",
        status: "learned",
        studyCount: 1,
        correctCount: 4,
        attemptCount: 5,
        firstStudiedAt: "2026-07-20T04:00:00.000Z",
        lastStudiedAt: "2026-07-20T04:00:00.000Z",
        schedule,
      });
      const question = {
        id: "legacy-question",
        source: "word",
        sourceId: "word-legacy",
        prompt: "旧题目",
        options: ["A", "B", "C", "D"],
        correctIndex: 1,
        explanation: "旧解析",
      };
      transaction.objectStore("mistakes").put({
        id: "mistake-legacy",
        question,
        selectedIndex: 0,
        errorCount: 1,
        correctStreak: 0,
        active: true,
        priority: 1,
        firstWrongAt: "2026-07-20T04:00:00.000Z",
        lastWrongAt: "2026-07-20T04:00:00.000Z",
        lastAnsweredAt: "2026-07-20T04:00:00.000Z",
      });
      transaction.objectStore("favorites").put({ contentId: "word:word-legacy" });
      transaction.objectStore("testResults").put({
        id: "test-legacy",
        mode: "mixed",
        answers: [{ question, selectedIndex: 1, isCorrect: true }],
        correctCount: 1,
        completedAt: "2026-07-20T04:00:00.000Z",
      });
      transaction.objectStore("dailyRecords").put({
        date: "2026-07-20",
        wordsStudied: 1,
        grammarStudied: 1,
        questionsAnswered: 1,
        correctAnswers: 1,
      });
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

describe("IndexedDbLearningRepository v2", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "indexedDB", {
      value: new IDBFactory(),
      configurable: true,
    });
  });

  it("initializes seven stores and round-trips a structured snapshot", async () => {
    expect(isIndexedDbSupported()).toBe(true);
    const repository = new IndexedDbLearningRepository();
    expect(await repository.getSnapshot()).toEqual({
      wordProgress: [],
      grammarProgress: [],
      mistakes: [],
      favorites: [],
      testResults: [],
      dailyRecords: [],
      dailyPlans: [],
    });
    const expected = makeSnapshot();
    await repository.saveSnapshot(expected);
    expect(await repository.getSnapshot()).toEqual(expected);
  });

  it("supports granular writes, order-preserving favorites and reset scopes", async () => {
    const repository = new IndexedDbLearningRepository();
    const expected = makeSnapshot();
    await repository.upsertWordProgress(expected.wordProgress[0]);
    await repository.upsertGrammarProgress(expected.grammarProgress[0]);
    await repository.upsertMistake(expected.mistakes[0]);
    await repository.setFavorites([
      "word:word-1",
      "word:word-1",
      "grammar:grammar-1",
    ]);
    await repository.saveTestResult(expected.testResults[0]);
    await repository.upsertDailyRecord(expected.dailyRecords[0]);
    await repository.upsertDailyPlan(makeDailyPlan());
    expect(await repository.getSnapshot()).toEqual(expected);

    await repository.resetTests();
    expect((await repository.getSnapshot()).testResults).toEqual([]);
    await repository.resetFavorites();
    expect((await repository.getSnapshot()).favorites).toEqual([]);
    await repository.resetMistakes();
    expect((await repository.getSnapshot()).mistakes).toEqual([]);
    await repository.resetAllData();
    expect((await repository.getSnapshot()).wordProgress).toEqual([]);
  });

  it("migrates a phase-one database without losing records", async () => {
    await openLegacyDatabase();
    const repository = new IndexedDbLearningRepository();
    const migrated = await repository.getSnapshot();
    expect(LEARNING_DATABASE_VERSION).toBe(2);
    expect(migrated.wordProgress).toHaveLength(1);
    expect(migrated.wordProgress[0].modes.combined).toMatchObject({
      mastery: "known",
      nextReviewAt: "2026-07-23T04:00:00.000Z",
      algorithmVersion: 2,
    });
    expect(migrated.grammarProgress[0].review.algorithmVersion).toBe(2);
    expect(migrated.mistakes[0]).toMatchObject({
      state: "active",
      contentRef: { source: "word", sourceId: "word-legacy" },
    });
    expect(migrated.testResults[0]).toMatchObject({
      sourceFilter: "all-learned",
      durationSeconds: 0,
    });
    expect(migrated.dailyRecords[0]).toMatchObject({
      wordsStudied: 1,
      combinedWordsStudied: 1,
      japaneseWordsStudied: 0,
    });
    expect(migrated.favorites).toEqual(["word:word-legacy"]);
    expect(migrated.dailyPlans).toEqual([]);
  });
});
