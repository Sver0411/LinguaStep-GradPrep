import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, EMPTY_SNAPSHOT } from "../lib/constants";
import type {
  ChoiceQuestion,
  DailyRecord,
  GrammarProgress,
  LearningSnapshot,
  MistakeRecord,
  TestResult,
  WordProgress,
} from "../lib/models";
import {
  LocalStorageSettingsRepository,
  MemoryLearningRepository,
  SETTINGS_STORAGE_KEY,
} from "../lib/repositories";

const NOW = "2026-07-20T04:00:00.000Z";

class StorageMock implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function makeQuestion(): ChoiceQuestion {
  return {
    id: "question-1",
    source: "word",
    sourceId: "word-1",
    prompt: "请选择正确答案",
    options: ["错误 A", "正确", "错误 B", "错误 C"],
    correctIndex: 1,
    explanation: "测试解析",
  };
}

function makeWordProgress(studyCount = 1): WordProgress {
  return {
    wordId: "word-1",
    status: "learned",
    mastery: "known",
    studyCount,
    firstStudiedAt: NOW,
    lastStudiedAt: NOW,
    schedule: {
      dueAt: "2026-07-23T04:00:00.000Z",
      intervalDays: 3,
      easeFactor: 2.35,
      repetitions: 1,
      lapses: 0,
    },
  };
}

function makeGrammarProgress(correctCount = 4): GrammarProgress {
  return {
    grammarId: "grammar-1",
    status: "learned",
    studyCount: 1,
    correctCount,
    attemptCount: 5,
    firstStudiedAt: NOW,
    lastStudiedAt: NOW,
    schedule: {
      dueAt: "2026-07-23T04:00:00.000Z",
      intervalDays: 3,
      easeFactor: 2.3,
      repetitions: 1,
      lapses: 0,
    },
  };
}

function makeMistake(errorCount = 1): MistakeRecord {
  return {
    id: "mistake-question-1",
    question: makeQuestion(),
    selectedIndex: 0,
    errorCount,
    correctStreak: 0,
    active: true,
    priority: errorCount,
    firstWrongAt: NOW,
    lastWrongAt: NOW,
    lastAnsweredAt: NOW,
  };
}

function makeTestResult(correctCount = 1): TestResult {
  const question = makeQuestion();
  return {
    id: "test-1",
    mode: "mixed",
    answers: [
      {
        question,
        selectedIndex: question.correctIndex,
        isCorrect: true,
      },
    ],
    correctCount,
    completedAt: NOW,
  };
}

function makeDailyRecord(wordsStudied = 2): DailyRecord {
  return {
    date: "2026-07-20",
    wordsStudied,
    grammarStudied: 1,
    questionsAnswered: 4,
    correctAnswers: 3,
  };
}

function makeFullSnapshot(): LearningSnapshot {
  return {
    wordProgress: [makeWordProgress()],
    grammarProgress: [makeGrammarProgress()],
    mistakes: [makeMistake()],
    favorites: ["word-1", "grammar-1"],
    testResults: [makeTestResult()],
    dailyRecords: [makeDailyRecord()],
  };
}

describe("MemoryLearningRepository", () => {
  it("saves snapshots without exposing mutable internal references", async () => {
    const source = makeFullSnapshot();
    const repository = new MemoryLearningRepository();

    await repository.saveSnapshot(source);
    source.favorites.push("word-2");
    source.wordProgress[0].studyCount = 99;

    const firstRead = await repository.getSnapshot();
    expect(firstRead).toEqual(makeFullSnapshot());

    firstRead.favorites.push("grammar-2");
    firstRead.mistakes[0].priority = 5;
    expect(await repository.getSnapshot()).toEqual(makeFullSnapshot());
  });

  it("replaces keyed records and deduplicates favorites", async () => {
    const repository = new MemoryLearningRepository();

    await repository.upsertWordProgress(makeWordProgress(1));
    await repository.upsertWordProgress(makeWordProgress(2));
    await repository.upsertGrammarProgress(makeGrammarProgress(3));
    await repository.upsertGrammarProgress(makeGrammarProgress(5));
    await repository.upsertMistake(makeMistake(1));
    await repository.upsertMistake(makeMistake(2));
    await repository.setFavorites(["word-1", "word-1", "grammar-1"]);
    await repository.saveTestResult(makeTestResult(0));
    await repository.saveTestResult(makeTestResult(1));
    await repository.upsertDailyRecord(makeDailyRecord(2));
    await repository.upsertDailyRecord(makeDailyRecord(6));

    const snapshot = await repository.getSnapshot();
    expect(snapshot.wordProgress).toEqual([makeWordProgress(2)]);
    expect(snapshot.grammarProgress).toEqual([makeGrammarProgress(5)]);
    expect(snapshot.mistakes).toEqual([makeMistake(2)]);
    expect(snapshot.favorites).toEqual(["word-1", "grammar-1"]);
    expect(snapshot.testResults).toEqual([makeTestResult(1)]);
    expect(snapshot.dailyRecords).toEqual([makeDailyRecord(6)]);

    await repository.deleteMistake("mistake-question-1");
    expect((await repository.getSnapshot()).mistakes).toEqual([]);
  });

  it("resets learning progress while retaining mistakes and favorites", async () => {
    const repository = new MemoryLearningRepository(makeFullSnapshot());

    await repository.resetLearningProgress();

    expect(await repository.getSnapshot()).toEqual({
      wordProgress: [],
      grammarProgress: [],
      mistakes: [makeMistake()],
      favorites: ["word-1", "grammar-1"],
      testResults: [],
      dailyRecords: [],
    });
  });

  it("resets mistakes without changing other learning data", async () => {
    const expected = makeFullSnapshot();
    expected.mistakes = [];
    const repository = new MemoryLearningRepository(makeFullSnapshot());

    await repository.resetMistakes();

    expect(await repository.getSnapshot()).toEqual(expected);
  });

  it("resets every stored data family", async () => {
    const repository = new MemoryLearningRepository(makeFullSnapshot());

    await repository.resetAllData();

    expect(await repository.getSnapshot()).toEqual(EMPTY_SNAPSHOT);
  });
});

describe("LocalStorageSettingsRepository", () => {
  it("returns defaults when storage has no saved settings", () => {
    const repository = new LocalStorageSettingsRepository(
      SETTINGS_STORAGE_KEY,
      new StorageMock(),
    );

    expect(repository.get()).toEqual(DEFAULT_SETTINGS);
  });

  it("merges saved partial settings with defaults and preserves them on update", () => {
    const storage = new StorageMock();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ theme: "dark", dailyNewWords: 12 }),
    );
    const repository = new LocalStorageSettingsRepository(
      SETTINGS_STORAGE_KEY,
      storage,
    );

    expect(repository.get()).toEqual({
      ...DEFAULT_SETTINGS,
      theme: "dark",
      dailyNewWords: 12,
    });

    const updated = repository.update({
      revealMode: "step-by-step",
      animations: false,
    });
    expect(updated).toEqual({
      ...DEFAULT_SETTINGS,
      theme: "dark",
      dailyNewWords: 12,
      revealMode: "step-by-step",
      animations: false,
    });
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).toBe(JSON.stringify(updated));
  });

  it("removes persisted settings and restores defaults on reset", () => {
    const storage = new StorageMock();
    const repository = new LocalStorageSettingsRepository(
      SETTINGS_STORAGE_KEY,
      storage,
    );
    repository.update({ theme: "light", studyRoundSize: 30 });

    expect(repository.reset()).toEqual(DEFAULT_SETTINGS);
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
    expect(repository.get()).toEqual(DEFAULT_SETTINGS);
  });
});
