import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../lib/constants";
import { MemoryLearningRepository } from "../lib/repositories/memory";
import {
  LocalStorageSettingsRepository,
  SETTINGS_STORAGE_KEY,
} from "../lib/repositories/settings";
import {
  makeDailyPlan,
  makeDailyRecord,
  makeGrammarProgress,
  makeMistake,
  makeSnapshot,
  makeTestResult,
  makeWordProgress,
} from "./fixtures";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("MemoryLearningRepository", () => {
  it("round-trips a full phase-two snapshot without sharing references", async () => {
    const source = makeSnapshot();
    const repository = new MemoryLearningRepository();
    await repository.saveSnapshot(source);
    const result = await repository.getSnapshot();
    expect(result).toEqual(source);
    result.favorites.push("word:mutated");
    expect((await repository.getSnapshot()).favorites).not.toContain("word:mutated");
  });

  it("supports granular upserts and deduplicated favorites", async () => {
    const repository = new MemoryLearningRepository();
    await repository.upsertWordProgress(makeWordProgress());
    await repository.upsertGrammarProgress(makeGrammarProgress());
    await repository.upsertMistake(makeMistake());
    await repository.saveTestResult(makeTestResult());
    await repository.upsertDailyRecord(makeDailyRecord());
    await repository.upsertDailyPlan(makeDailyPlan());
    await repository.setFavorites(["word:word-1", "word:word-1"]);
    const result = await repository.getSnapshot();
    expect(result.wordProgress).toHaveLength(1);
    expect(result.grammarProgress).toHaveLength(1);
    expect(result.mistakes).toHaveLength(1);
    expect(result.testResults).toHaveLength(1);
    expect(result.dailyPlans).toHaveLength(1);
    expect(result.favorites).toEqual(["word:word-1"]);
  });

  it("applies each reset scope without deleting unrelated families", async () => {
    const repository = new MemoryLearningRepository(makeSnapshot());
    await repository.resetTests();
    expect((await repository.getSnapshot()).testResults).toEqual([]);
    expect((await repository.getSnapshot()).mistakes).toHaveLength(1);

    await repository.resetFavorites();
    expect((await repository.getSnapshot()).favorites).toEqual([]);
    expect((await repository.getSnapshot()).wordProgress).toHaveLength(1);

    await repository.resetMistakes();
    expect((await repository.getSnapshot()).mistakes).toEqual([]);

    await repository.resetLearningProgress();
    const reset = await repository.getSnapshot();
    expect(reset.wordProgress).toEqual([]);
    expect(reset.grammarProgress).toEqual([]);
    expect(reset.dailyRecords).toEqual([]);
    expect(reset.dailyPlans).toEqual([]);
  });
});

describe("LocalStorageSettingsRepository", () => {
  it("migrates the old simultaneous reveal default once and preserves later choices", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, revealMode: "together" }),
    );
    const repository = new LocalStorageSettingsRepository(
      SETTINGS_STORAGE_KEY,
      storage,
    );
    expect(repository.get().revealMode).toBe("step-by-step");
    expect(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toMatchObject({
      _settingsVersion: 4,
      revealMode: "step-by-step",
      focusModeEnabled: false,
      immediateTestFeedback: true,
    });

    repository.update({ revealMode: "together" });
    const reloaded = new LocalStorageSettingsRepository(
      SETTINGS_STORAGE_KEY,
      storage,
    );
    expect(reloaded.get().revealMode).toBe("together");
  });

  it("turns focus mode off for existing version-two settings without changing reveal choice", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        _settingsVersion: 2,
        revealMode: "together",
        focusModeEnabled: true,
      }),
    );
    const settings = new LocalStorageSettingsRepository(
      SETTINGS_STORAGE_KEY,
      storage,
    ).get();
    expect(settings.revealMode).toBe("together");
    expect(settings.focusModeEnabled).toBe(false);
    expect(settings.immediateTestFeedback).toBe(true);
  });

  it("turns immediate test feedback on once for existing version-three settings", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        _settingsVersion: 3,
        immediateTestFeedback: false,
      }),
    );
    const repository = new LocalStorageSettingsRepository(
      SETTINGS_STORAGE_KEY,
      storage,
    );
    expect(repository.get().immediateTestFeedback).toBe(true);
    expect(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toMatchObject({
      _settingsVersion: 4,
      immediateTestFeedback: true,
    });

    repository.update({ immediateTestFeedback: false });
    expect(
      new LocalStorageSettingsRepository(SETTINGS_STORAGE_KEY, storage).get()
        .immediateTestFeedback,
    ).toBe(false);
  });

  it("migrates phase-one settings by filling phase-two defaults", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        theme: "dark",
        displayDensity: "full",
        revealMode: "step-by-step",
        dailyNewWords: 30,
        studyRoundSize: 20,
        grammarExerciseCount: 3,
        animations: false,
      }),
    );
    const settings = new LocalStorageSettingsRepository(
      SETTINGS_STORAGE_KEY,
      storage,
    ).get();
    expect(settings).toMatchObject({
      theme: "dark",
      displayDensity: "full",
      dailyNewWords: 30,
      dailyReviewLimit: DEFAULT_SETTINGS.dailyReviewLimit,
      defaultStudyMode: "combined",
      revealOrder: "japanese-first",
      fontSize: "standard",
    });
  });

  it("validates invalid values and persists updates", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ theme: "pink", dailyNewWords: -2 }),
    );
    const repository = new LocalStorageSettingsRepository(
      SETTINGS_STORAGE_KEY,
      storage,
    );
    expect(repository.get()).toMatchObject(DEFAULT_SETTINGS);
    const updated = repository.update({
      theme: "light",
      defaultStudyMode: "english",
      dailyReviewLimit: 80,
    });
    expect(updated).toMatchObject({
      theme: "light",
      defaultStudyMode: "english",
      dailyReviewLimit: 80,
    });
    expect(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toMatchObject(
      updated,
    );
  });
});
