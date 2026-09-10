import { describe, expect, it } from "vitest";
import {
  migrateLearningSnapshot,
  migrateWordProgressRecord,
} from "../lib/repositories/migrations";
import { makeSnapshot, NOW } from "./fixtures";

describe("phase-one to phase-two data migration", () => {
  it("maps legacy word progress into combined mode without changing due time", () => {
    const migrated = migrateWordProgressRecord({
      wordId: "word-1",
      status: "learned",
      mastery: "known",
      studyCount: 4,
      firstStudiedAt: "2026-07-01T04:00:00.000Z",
      lastStudiedAt: NOW,
      schedule: {
        dueAt: "2026-07-25T04:00:00.000Z",
        intervalDays: 5,
        easeFactor: 2.2,
        repetitions: 3,
        lapses: 1,
      },
    });
    expect(migrated.wordId).toBe("word-1");
    expect(migrated.modes.combined).toMatchObject({
      mastery: "known",
      reviewCount: 4,
      nextReviewAt: "2026-07-25T04:00:00.000Z",
      intervalDays: 5,
      lapses: 1,
      algorithmVersion: 2,
    });
  });

  it("is idempotent for an already migrated snapshot", () => {
    const snapshot = makeSnapshot();
    expect(migrateLearningSnapshot(migrateLearningSnapshot(snapshot))).toEqual(
      migrateLearningSnapshot(snapshot),
    );
  });

  it("fills safe defaults instead of discarding partially damaged data", () => {
    const migrated = migrateLearningSnapshot({
      wordProgress: [{ wordId: "word-1", mastery: "fuzzy" }],
      dailyRecords: [{ date: "2026-07-20", wordsStudied: 2 }],
      favorites: ["word:word-1", 3],
    });
    expect(migrated.wordProgress[0].modes.combined?.mastery).toBe("fuzzy");
    expect(migrated.dailyRecords[0]).toMatchObject({
      wordsStudied: 2,
      combinedWordsStudied: 2,
      grammarStudied: 0,
    });
    expect(migrated.favorites).toEqual(["word:word-1"]);
  });
});
