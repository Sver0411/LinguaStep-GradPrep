import { describe, expect, it } from "vitest";
import {
  calculateLongestStreak,
  calculateStreak,
  createTestQuestions,
  getWordModeState,
  isAnswerCorrect,
  updateDailyRecord,
  updateGrammarProgress,
  updateMistakeRecord,
  updateWordMastery,
} from "../lib/learning";
import { applyReviewRating } from "../lib/spaced-repetition";
import type { MistakeRecord } from "../lib/models";
import {
  NOW,
  makeGrammar,
  makeGrammarProgress,
  makeMistake,
  makeQuestion,
  makeReviewState,
  makeWord,
  makeWordProgress,
} from "./fixtures";

function requireMistake(value: MistakeRecord | null): MistakeRecord {
  expect(value).not.toBeNull();
  if (!value) throw new Error("Expected a mistake record");
  return value;
}

describe("phase-two spaced repetition", () => {
  it("schedules a first known rating four days later", () => {
    const state = applyReviewRating(undefined, "known", NOW);
    expect(state).toMatchObject({
      mastery: "known",
      status: "review",
      intervalDays: 4,
      reviewCount: 1,
      correctStreak: 1,
      isNew: false,
      algorithmVersion: 2,
    });
    expect(state.nextReviewAt).toBe("2026-07-24T04:00:00.000Z");
  });

  it("extends intervals after consecutive known ratings and reaches mastered", () => {
    const first = applyReviewRating(undefined, "known", NOW);
    const second = applyReviewRating(first, "known", first.nextReviewAt);
    const third = applyReviewRating(second, "known", second.nextReviewAt);
    expect(second.intervalDays).toBeGreaterThan(first.intervalDays);
    expect(third.intervalDays).toBeGreaterThan(second.intervalDays);
    expect(third).toMatchObject({ correctStreak: 3, status: "mastered" });
  });

  it("schedules fuzzy for the next day and raises difficulty", () => {
    const previous = makeReviewState("known", { stability: 8, difficulty: 4 });
    const result = applyReviewRating(previous, "fuzzy", NOW);
    expect(result).toMatchObject({
      mastery: "fuzzy",
      status: "learning",
      intervalDays: 1,
      correctStreak: 0,
      lapses: previous.lapses,
    });
    expect(result.difficulty).toBeGreaterThan(previous.difficulty);
  });

  it("resets an unknown item to a ten-minute retry and records a lapse", () => {
    const previous = makeReviewState("known", { stability: 10, lapses: 2 });
    const result = applyReviewRating(previous, "unknown", NOW);
    expect(result.nextReviewAt).toBe("2026-07-20T04:10:00.000Z");
    expect(result).toMatchObject({
      intervalDays: 0,
      correctStreak: 0,
      lapses: 3,
      status: "learning",
    });
  });

  it("gives a bounded stability bonus after an overdue successful review", () => {
    const previous = makeReviewState("known", {
      nextReviewAt: "2026-07-10T04:00:00.000Z",
      intervalDays: 4,
      stability: 4,
    });
    const result = applyReviewRating(previous, "known", NOW);
    expect(result.stability).toBeGreaterThan(4);
    expect(result.stability).toBeLessThan(20);
  });
});

describe("independent study modes", () => {
  it("keeps combined, Japanese and English progress separately", () => {
    const combined = updateWordMastery(undefined, "word-1", "known", NOW, "combined");
    const japanese = updateWordMastery(
      combined,
      "word-1",
      "fuzzy",
      "2026-07-20T05:00:00.000Z",
      "japanese",
    );
    const english = updateWordMastery(
      japanese,
      "word-1",
      "unknown",
      "2026-07-20T06:00:00.000Z",
      "english",
    );
    expect(getWordModeState(english, "combined")?.mastery).toBe("known");
    expect(getWordModeState(english, "japanese")?.mastery).toBe("fuzzy");
    expect(getWordModeState(english, "english")?.mastery).toBe("unknown");
  });

  it("maps grammar exercise accuracy onto the same review scheduler", () => {
    const result = updateGrammarProgress(undefined, "grammar-1", 4, 5, NOW);
    expect(result.status).toBe("review");
    expect(result.review.mastery).toBe("known");
    const weak = updateGrammarProgress(result, "grammar-1", 2, 5, NOW);
    expect(weak.status).toBe("learning");
    expect(weak.review.mastery).toBe("unknown");
  });
});

describe("choice questions and mistake lifecycle", () => {
  const question = makeQuestion();

  it("judges a choice by its correct option index", () => {
    expect(isAnswerCorrect(question, 2)).toBe(true);
    expect(isAnswerCorrect(question, 0)).toBe(false);
  });

  it("creates an active record and appends answer history", () => {
    const result = requireMistake(
      updateMistakeRecord(undefined, question, 1, NOW),
    );
    expect(result).toMatchObject({
      errorCount: 1,
      correctStreak: 0,
      state: "active",
      active: true,
    });
    expect(result.contentRef).toEqual({ source: "word", sourceId: "word-1" });
    expect(result.history).toHaveLength(1);
  });

  it("moves through consolidating to mastered after three correct answers", () => {
    const wrong = makeMistake(question);
    const first = requireMistake(
      updateMistakeRecord(wrong, question, 2, "2026-07-20T05:00:00.000Z"),
    );
    const second = requireMistake(
      updateMistakeRecord(first, question, 2, "2026-07-20T06:00:00.000Z"),
    );
    const third = requireMistake(
      updateMistakeRecord(second, question, 2, "2026-07-20T07:00:00.000Z"),
    );
    expect(first.state).toBe("consolidating");
    expect(second.state).toBe("consolidating");
    expect(third).toMatchObject({ state: "mastered", active: false });
    expect(third.history).toHaveLength(4);
  });

  it("returns a mastered item to active after another wrong answer", () => {
    const mastered = { ...makeMistake(question), state: "mastered" as const, active: false, correctStreak: 3 };
    const result = requireMistake(
      updateMistakeRecord(mastered, question, 0, "2026-07-21T04:00:00.000Z"),
    );
    expect(result).toMatchObject({ state: "active", active: true, correctStreak: 0 });
  });
});

describe("local-date activity", () => {
  it("calculates current and longest streaks", () => {
    const dates = ["2026-07-15", "2026-07-16", "2026-07-18", "2026-07-19", "2026-07-20"];
    expect(calculateStreak(dates, "2026-07-20")).toBe(3);
    expect(calculateLongestStreak(dates)).toBe(3);
    expect(calculateStreak(["2026-07-18"], "2026-07-20")).toBe(0);
  });

  it("accumulates all mode and review counters", () => {
    const records = updateDailyRecord([], "2026-07-20", {
      wordsStudied: 1,
      newWordsStudied: 1,
      japaneseWordsStudied: 1,
    });
    const result = updateDailyRecord(records, "2026-07-20", {
      wordsStudied: 2,
      reviewWordsStudied: 2,
      englishWordsStudied: 2,
      questionsAnswered: 3,
      correctAnswers: 2,
    });
    expect(result[0]).toMatchObject({
      wordsStudied: 3,
      newWordsStudied: 1,
      reviewWordsStudied: 2,
      japaneseWordsStudied: 1,
      englishWordsStudied: 2,
      questionsAnswered: 3,
      correctAnswers: 2,
    });
  });
});

describe("test generation", () => {
  const vocabulary = [
    makeWord("word-1", "一"),
    makeWord("word-2", "二"),
    makeWord("word-3", "三"),
    makeWord("word-4", "四"),
  ];
  const grammar = [makeGrammar("grammar-1"), makeGrammar("grammar-2")];

  it("only uses studied source items and respects Japanese mode", () => {
    const questions = createTestQuestions(
      [makeWordProgress("word-1", "japanese")],
      [makeGrammarProgress("grammar-1")],
      vocabulary,
      grammar,
      {
        mode: "japanese",
        sourceFilter: "all-learned",
        count: 10,
        now: NOW,
      },
    );
    expect(questions.length).toBeGreaterThan(0);
    expect(
      questions.every((question) =>
        ["word-1", "grammar-1"].includes(question.sourceId),
      ),
    ).toBe(true);
    expect(questions.every((question) => question.language !== "english")).toBe(true);
  });

  it("filters favorite and due sources", () => {
    const due = makeWordProgress(
      "word-1",
      "combined",
      makeReviewState("known", { nextReviewAt: "2026-07-19T04:00:00.000Z" }),
    );
    const favorite = createTestQuestions(
      [due, makeWordProgress("word-2")],
      [],
      vocabulary,
      [],
      {
        mode: "mixed",
        sourceFilter: "favorites",
        count: 10,
        now: NOW,
        favorites: ["word:word-2"],
      },
    );
    expect(new Set(favorite.map((item) => item.sourceId))).toEqual(new Set(["word-2"]));

    const dueQuestions = createTestQuestions(
      [due, makeWordProgress("word-2")],
      [],
      vocabulary,
      [],
      { mode: "mixed", sourceFilter: "due", count: 10, now: NOW },
    );
    expect(new Set(dueQuestions.map((item) => item.sourceId))).toEqual(new Set(["word-1"]));
  });

  it("produces four unique options for normal vocabulary pools", () => {
    const questions = createTestQuestions(
      vocabulary.map((word) => makeWordProgress(word.id)),
      [],
      vocabulary,
      [],
      { mode: "mixed", sourceFilter: "all-learned", count: 15, now: NOW },
    );
    questions.forEach((question) => {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
    });
  });

  it("uses each vocabulary item at most once in the same test round", () => {
    const questions = createTestQuestions(
      vocabulary.map((word) => makeWordProgress(word.id)),
      [],
      vocabulary,
      [],
      { mode: "mixed", sourceFilter: "all-learned", count: 30, now: NOW },
    );
    expect(questions).toHaveLength(vocabulary.length);
    expect(new Set(questions.map((question) => question.sourceId)).size).toBe(
      questions.length,
    );
  });

  it("rotates mixed translation directions across different words", () => {
    const largerVocabulary = Array.from({ length: 12 }, (_, index) =>
      makeWord(`word-${index + 1}`, `词义${index + 1}`),
    );
    const questions = createTestQuestions(
      largerVocabulary.map((word) => makeWordProgress(word.id)),
      [],
      largerVocabulary,
      [],
      { mode: "mixed", sourceFilter: "all-learned", count: 12, now: NOW },
    );
    expect(new Set(questions.map((question) => question.id.split("-v")[1])).size).toBe(6);
  });

  it("places active mistake content first when prioritization is enabled", () => {
    const mistakeQuestion = makeQuestion("mistake-word-3", "word", "word-3");
    const questions = createTestQuestions(
      vocabulary.map((word) => makeWordProgress(word.id)),
      [],
      vocabulary,
      [],
      {
        mode: "mixed",
        sourceFilter: "all-learned",
        count: 1,
        now: NOW,
        mistakes: [makeMistake(mistakeQuestion)],
        prioritizeMistakes: true,
      },
    );
    expect(questions[0].sourceId).toBe("word-3");
  });
});
