import { describe, expect, it } from "vitest";
import { createEmptyCard, fsrs, Rating } from "ts-fsrs";
import { applyWordQuizAnswer, normalizeQuizMemory } from "../lib/word-quiz-scheduler";
import { buildWordQuiz, fillWordCycle, quizDirection } from "../lib/word-quiz";
import { migrateWordProgressRecord } from "../lib/repositories/migrations";
import { makeWord, NOW } from "./fixtures";
import type { ReviewState } from "../lib/models";

const words = Array.from({ length: 10 }, (_, index) => makeWord(`quiz-${index}`, `${index}`));
describe("word learning cycles and objective memory", () => {
  it("fills five slots with failures first and reveals only the three new additions", () => {
    const first = fillWordCycle([], words, new Set());
    expect(first.active.map((word) => word.id)).toEqual(words.slice(0, 5).map((word) => word.id));
    const next = fillWordCycle([words[3], words[4]], first.reserve, new Set(words.slice(0, 5).map((word) => word.id)));
    expect(next.active).toEqual(words.slice(3, 8));
    expect(next.fresh).toEqual(words.slice(5, 8));
    expect(next.reserve).toEqual(words.slice(8));
  });
  it("does not reveal failures again and handles exhausted new words without padding", () => {
    const cycle = fillWordCycle([words[0], words[1]], [], new Set());
    expect(cycle.active).toEqual(words.slice(0, 2)); expect(cycle.fresh).toEqual([]);
    expect(fillWordCycle([], [], new Set()).active).toEqual([]);
  });
  it("builds both bilingual directions, excludes duplicate translations and refuses ambiguous pools", () => {
    const duplicate = { ...words[1], english: { ...words[1].english, term: words[0].english.term } };
    for (const direction of ["ja-en", "en-ja"] as const) {
      const question = buildWordQuiz(words[0], [...words, duplicate], "combined", direction, () => 0.2)!;
      expect(new Set(question.options).size).toBe(4);
      expect(question.options[question.correctIndex]).toBe(direction === "ja-en" ? words[0].english.term : words[0].japanese.term);
      expect(question.prompt).toBe(direction === "ja-en" ? words[0].japanese.term : words[0].english.term);
    }
    expect(buildWordQuiz(words[0], [words[0], duplicate], "combined", "ja-en")).toBeNull();
    const failed = applyWordQuizAnswer(undefined, false, "ja-en", "combined", NOW);
    expect(quizDirection("combined", failed, "english")).toBe("ja-en");
  });
  it("uses actual FSRS Again/Good scheduling with a 90% target", () => {
    const scheduler = fsrs({ request_retention: .9, enable_fuzz: false, maximum_interval: 36500 });
    for (const correct of [true, false]) {
      const result = applyWordQuizAnswer(undefined, correct, "ja-en", "combined", NOW);
      const expected = scheduler.next(createEmptyCard(new Date(NOW)), new Date(NOW), correct ? Rating.Good : Rating.Again).card;
      expect(result.nextReviewAt).toBe(expected.due.toISOString());
      expect(result.stability).toBe(expected.stability);
      expect(result.quizMemory?.attempts).toBe(1);
      expect(result.recallHistory?.[0]).toMatchObject({ rating: correct ? "known" : "unknown", gapDays: 0, method: "choice" });
    }
  });
  it("does not mark same-session successes mastered and alternates translation direction", () => {
    let state: ReviewState | undefined;
    for (let index = 0; index < 12; index++) state = applyWordQuizAnswer(state, true, index % 2 ? "en-ja" : "ja-en", "combined", new Date(Date.parse(NOW) + index * 60000).toISOString());
    expect(state?.status).not.toBe("mastered");
    expect(state?.quizMemory?.spacedCorrectStreak).toBe(0);
    expect(quizDirection("combined", state, "english")).toBe("ja-en");
  });
  it("requires spaced success and both directions for mature bilingual recognition", () => {
    let state: ReviewState | undefined;
    let now = Date.parse(NOW);
    for (let index = 0; index < 18; index++) {
      state = applyWordQuizAnswer(state, true, index % 2 ? "en-ja" : "ja-en", "combined", new Date(now).toISOString());
      if ((state.quizMemory?.spacedCorrectStreak ?? 0) < 3) expect(state.status).not.toBe("mastered");
      now = Math.max(now + 86400000, Date.parse(state.nextReviewAt));
      if (state.status === "mastered") break;
    }
    expect(state?.status).toBe("mastered");
    const failed = applyWordQuizAnswer(state, false, "ja-en", "combined", new Date(now).toISOString());
    expect(failed.status).toBe("learning"); expect(failed.quizMemory?.spacedCorrectStreak).toBe(0);
  });
  it("round-trips FSRS memory as JSON and rejects invalid imported scheduling values", () => {
    const review = applyWordQuizAnswer(undefined, false, "ja-en", "combined", NOW);
    const restored = migrateWordProgressRecord(JSON.parse(JSON.stringify({ wordId: words[0].id, modes: { combined: review } })), NOW);
    expect(restored.modes.combined?.quizMemory).toEqual(review.quizMemory);
    expect(restored.modes.combined?.algorithmVersion).toBe(3);
    expect(restored.modes.combined?.recallHistory?.[0].method).toBe("choice");
    expect(normalizeQuizMemory({ ...review.quizMemory, card: { ...review.quizMemory!.card, stability: -100 } })).toBeUndefined();
  });
});
