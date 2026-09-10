import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../lib/constants";
import {
  calculateDailyPlanProgress,
  generateDailyPlan,
  getOrCreateDailyPlan,
} from "../lib/daily-plan";
import { makeDailyRecord, makeGrammar, makeMistake, makeReviewState, makeWord, makeWordProgress, NOW } from "./fixtures";

describe("daily plan generation", () => {
  const words = Array.from({ length: 30 }, (_, index) =>
    makeWord(`word-${index + 1}`, String(index + 1)),
  );
  const grammar = [makeGrammar("grammar-1"), makeGrammar("grammar-2")];

  it("selects new, overdue, mistakes, grammar and test targets", () => {
    const overdue = makeWordProgress(
      "word-1",
      "combined",
      makeReviewState("known", { nextReviewAt: "2026-07-18T04:00:00.000Z" }),
    );
    const plan = generateDailyPlan({
      date: "2026-07-20",
      now: NOW,
      settings: { ...DEFAULT_SETTINGS, dailyNewWords: 10, dailyReviewLimit: 5 },
      words,
      grammar,
      wordProgress: [overdue],
      grammarProgress: [],
      mistakes: [makeMistake()],
    });
    expect(plan.newWordIds).toHaveLength(10);
    expect(plan.reviewWordIds).toEqual(["word-1"]);
    expect(plan.overdueWordIds).toEqual(["word-1"]);
    expect(plan.mistakeIds).toHaveLength(1);
    expect(plan.grammarIds).toEqual(["grammar-1"]);
    expect(plan.testTarget).toBe(10);
  });

  it("does not generate a duplicate plan for the same local date", () => {
    const input = {
      date: "2026-07-20",
      now: NOW,
      settings: DEFAULT_SETTINGS,
      words,
      grammar,
      wordProgress: [],
      grammarProgress: [],
      mistakes: [],
    };
    const first = getOrCreateDailyPlan([], input);
    const second = getOrCreateDailyPlan([first.plan], { ...input, now: "2026-07-20T10:00:00.000Z" });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.plan.generatedAt).toBe(first.plan.generatedAt);
  });

  it("creates a new plan after the date changes", () => {
    const first = generateDailyPlan({
      date: "2026-07-20",
      now: NOW,
      settings: DEFAULT_SETTINGS,
      words,
      grammar,
      wordProgress: [],
      grammarProgress: [],
      mistakes: [],
    });
    const next = getOrCreateDailyPlan([first], {
      date: "2026-07-21",
      now: "2026-07-21T04:00:00.000Z",
      settings: DEFAULT_SETTINGS,
      words,
      grammar,
      wordProgress: [],
      grammarProgress: [],
      mistakes: [],
    });
    expect(next.created).toBe(true);
    expect(next.plan.date).toBe("2026-07-21");
  });

  it("prioritizes unfinished tasks from earlier plans when auto-fill is enabled", () => {
    const previous = {
      ...generateDailyPlan({
        date: "2026-07-19",
        now: "2026-07-19T04:00:00.000Z",
        settings: { ...DEFAULT_SETTINGS, dailyNewWords: 2 },
        words,
        grammar,
        wordProgress: [],
        grammarProgress: [],
        mistakes: [],
      }),
      newWordIds: ["word-8", "word-9"],
      grammarIds: ["grammar-2"],
    };
    const plan = generateDailyPlan({
      date: "2026-07-20",
      now: NOW,
      settings: { ...DEFAULT_SETTINGS, dailyNewWords: 2, autoFillPlan: true },
      words,
      grammar,
      wordProgress: [],
      grammarProgress: [],
      mistakes: [],
      previousPlans: [previous],
    });
    expect(plan.newWordIds).toEqual(["word-8", "word-9"]);
    expect(plan.grammarIds[0]).toBe("grammar-2");
  });

  it("calculates plan completion without exceeding targets", () => {
    const plan = {
      ...generateDailyPlan({
        date: "2026-07-20",
        now: NOW,
        settings: { ...DEFAULT_SETTINGS, dailyNewWords: 2, dailyTestQuestions: 5 },
        words,
        grammar,
        wordProgress: [],
        grammarProgress: [],
        mistakes: [],
      }),
      reviewWordIds: ["word-20"],
    };
    const record = {
      ...makeDailyRecord(),
      newWordsStudied: 5,
      reviewWordsStudied: 1,
      questionsAnswered: 9,
    };
    const progress = calculateDailyPlanProgress(plan, record);
    expect(progress.newCompleted).toBe(2);
    expect(progress.reviewCompleted).toBe(1);
    expect(progress.testCompleted).toBe(5);
    expect(progress.percent).toBeLessThanOrEqual(100);
  });
});
