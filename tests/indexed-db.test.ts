import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
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
  IndexedDbLearningRepository,
  isIndexedDbSupported,
} from "../lib/repositories";

const NOW = "2026-07-20T04:00:00.000Z";

function progress(wordId: string): WordProgress {
  return {
    wordId,
    status: "learned",
    mastery: "known",
    studyCount: 1,
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

function grammarProgress(grammarId: string): GrammarProgress {
  return {
    grammarId,
    status: "learned",
    studyCount: 1,
    correctCount: 4,
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

function question(): ChoiceQuestion {
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

function snapshot(): LearningSnapshot {
  const testQuestion = question();
  const mistake: MistakeRecord = {
    id: "mistake-question-1",
    question: testQuestion,
    selectedIndex: 0,
    errorCount: 1,
    correctStreak: 0,
    active: true,
    priority: 1,
    firstWrongAt: NOW,
    lastWrongAt: NOW,
    lastAnsweredAt: NOW,
  };
  const test: TestResult = {
    id: "test-1",
    mode: "mixed",
    answers: [
      {
        question: testQuestion,
        selectedIndex: 1,
        isCorrect: true,
      },
    ],
    correctCount: 1,
    completedAt: NOW,
  };
  const daily: DailyRecord = {
    date: "2026-07-20",
    wordsStudied: 1,
    newWordsStudied: 1,
    reviewWordsStudied: 0,
    grammarStudied: 1,
    questionsAnswered: 5,
    correctAnswers: 4,
  };
  return {
    wordProgress: [progress("word-1")],
    grammarProgress: [grammarProgress("grammar-1")],
    mistakes: [mistake],
    favorites: ["word:word-1", "grammar:grammar-1"],
    testResults: [test],
    dailyRecords: [daily],
  };
}

describe("IndexedDbLearningRepository", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "indexedDB", {
      value: new IDBFactory(),
      configurable: true,
    });
  });

  it("initializes all stores and round-trips a structured snapshot", async () => {
    expect(isIndexedDbSupported()).toBe(true);
    const repository = new IndexedDbLearningRepository();
    expect(await repository.getSnapshot()).toEqual({
      wordProgress: [],
      grammarProgress: [],
      mistakes: [],
      favorites: [],
      testResults: [],
      dailyRecords: [],
    });

    const expected = snapshot();
    await repository.saveSnapshot(expected);
    expect(await repository.getSnapshot()).toEqual(expected);
  });

  it("supports granular upserts, replacement, deletion and favorite deduplication", async () => {
    const repository = new IndexedDbLearningRepository();
    const expected = snapshot();
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
    expect(await repository.getSnapshot()).toEqual(expected);

    const updated = { ...expected.wordProgress[0], studyCount: 4 };
    await repository.upsertWordProgress(updated);
    await repository.deleteMistake(expected.mistakes[0].id);
    const result = await repository.getSnapshot();
    expect(result.wordProgress).toEqual([updated]);
    expect(result.mistakes).toEqual([]);
  });

  it("applies the three reset scopes without deleting unrelated families", async () => {
    const repository = new IndexedDbLearningRepository();
    const expected = snapshot();
    await repository.saveSnapshot(expected);

    await repository.resetLearningProgress();
    expect(await repository.getSnapshot()).toEqual({
      wordProgress: [],
      grammarProgress: [],
      mistakes: expected.mistakes,
      favorites: expected.favorites,
      testResults: [],
      dailyRecords: [],
    });

    await repository.resetMistakes();
    expect((await repository.getSnapshot()).mistakes).toEqual([]);

    await repository.saveSnapshot(expected);
    await repository.resetAllData();
    expect(await repository.getSnapshot()).toEqual({
      wordProgress: [],
      grammarProgress: [],
      mistakes: [],
      favorites: [],
      testResults: [],
      dailyRecords: [],
    });
  });
});
