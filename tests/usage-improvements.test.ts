import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../lib/constants";
import { EXAM_QUESTIONS, examBankStats } from "../data/exam-questions";
import { WORD_PAIRS } from "../data/words";
import { GRAMMAR_POINTS } from "../data/grammar";
import { bookToStudyWord, findBookStudyWord } from "../lib/book-learning";
import { BOOK_VOCAB_WORDS } from "../data/book-vocab-data";
import { generateDailyPlan, calculateDailyPlanProgress } from "../lib/daily-plan";
import { buildTrainingItems, matchesTypedAnswer } from "../lib/training";
import { learningInsights } from "../lib/learning-insights";
import { migrateLearningSnapshot } from "../lib/repositories/migrations";
import { applyReviewRating } from "../lib/spaced-repetition";
import { makeSnapshot, makeDailyRecord, makeDailyPlan, makeReviewState, makeWordProgress, makeTestResult, makeQuestion, NOW } from "./fixtures";

describe("usage review fixes", () => {
  it("provides a sentence and Chinese translation for each built-in word language", () => {
    for (const word of WORD_PAIRS) for (const language of ["japanese", "english"] as const) {
      expect(word[language].example.trim(), `${word.id}:${language}`).not.toBe("");
      expect(word[language].exampleZh.trim(), `${word.id}:${language}:zh`).not.toBe("");
    }
  });
  it("never labels middle-school questions as CET or labels unverified questions as official papers", () => {
    const foundation = EXAM_QUESTIONS.filter((q) => q.id.includes("ext-en-"));
    expect(foundation).toHaveLength(800);
    expect(foundation.every((q) => q.examLevel === "基础英语" && q.sourceKind === "practice")).toBe(true);
    expect(examBankStats("english").real).toBe(0);
    expect(EXAM_QUESTIONS.filter((q) => q.examSection === "reading").every((q) => Boolean(q.context))).toBe(true);
  });
  it("preserves imported user words, bookmarks and review state during storage migration", () => {
    const imported = bookToStudyWord(BOOK_VOCAB_WORDS[0]);
    const snapshot = makeSnapshot(); snapshot.aiWords = [imported]; snapshot.wordProgress = [makeWordProgress(imported.id)];
    const restored = migrateLearningSnapshot(snapshot);
    expect(restored.aiWords[0].source).toBe("user-created");
    expect(restored.wordProgress[0].wordId).toBe(imported.id);
    expect(findBookStudyWord(BOOK_VOCAB_WORDS[0], [imported])?.id).toBe(imported.id);
  });
  it("fits a goal-specific plan inside the time budget and prioritizes due reviews", () => {
    const words = WORD_PAIRS.filter((w) => w.japanese.difficulty.includes("N2")).slice(0, 50);
    const plan = generateDailyPlan({ date: "2026-07-20", now: NOW, settings: { ...DEFAULT_SETTINGS, dailyMinutes: 10, grammarCourse: "jp-n2", primaryGoal: "N2", defaultStudyMode: "japanese", studyJapaneseLevel: "all" }, words, grammar: GRAMMAR_POINTS,
      wordProgress: [makeWordProgress(words[0].id, "japanese", makeReviewState("unknown", { nextReviewAt: "2026-07-19T00:00:00Z" }))], grammarProgress: [], mistakes: [] });
    expect(plan.estimatedMinutes).toBeLessThanOrEqual(10);
    expect(plan.reviewWordIds).toContain(words[0].id);
    expect(plan.grammarIds.every((id) => GRAMMAR_POINTS.find((g) => g.id === id)?.level.includes("N2"))).toBe(true);
  });
  it("does not credit old completed counts to a rebuilt plan", () => {
    const plan = { ...makeDailyPlan(), completedBeforePlan: { newWords: 10, reviewWords: 0, grammar: 0, test: 0 } };
    expect(calculateDailyPlanProgress(plan, { ...makeDailyRecord(), newWordsStudied: 10 }).newCompleted).toBe(0);
  });
  it("requires a real typed answer and prioritizes unseen training prompts", () => {
    expect(matchesTypedAnswer("  HELLO, world! ", ["Hello world."])).toBe(true);
    expect(matchesTypedAnswer("", [""])).toBe(false);
    expect(matchesTypedAnswer("今日は学校へ行きます。", ["明日は学校へ行きます。"])).toBe(false);
    const items = buildTrainingItems("listening", "japanese", WORD_PAIRS, GRAMMAR_POINTS, []);
    expect(items.length).toBeGreaterThan(5);
    expect(items[0].audio?.text).toBeTruthy();
    const result = makeTestResult(); result.answers = [{ question: items[0].question, selectedIndex: 0, isCorrect: true }];
    const fresh = buildTrainingItems("listening", "japanese", WORD_PAIRS, GRAMMAR_POINTS, [result]);
    expect(fresh[0].question.id).not.toBe(items[0].question.id);
    expect(buildTrainingItems("cloze", "japanese", WORD_PAIRS, GRAMMAR_POINTS, [])[0].expected?.length).toBeGreaterThan(0);
  });
  it("keeps first attempts and delayed self-recall separate from repeated same-day practice", () => {
    const snapshot = makeSnapshot(); snapshot.wordProgress = [makeWordProgress("w", "japanese", makeReviewState("known", { recallHistory: [
      { at: "2026-07-19T01:00:00Z", gapDays: 2, rating: "unknown" },
      { at: "2026-07-19T01:10:00Z", gapDays: 0.01, rating: "known" },
    ] }))];
    const q = makeQuestion("same-question");
    snapshot.testResults = [{ ...makeTestResult(), completedAt: "2026-07-18T00:00:00Z", answers: [{ question: q, selectedIndex: 0, isCorrect: false }] },
      { ...makeTestResult(), completedAt: "2026-07-19T00:00:00Z", answers: [{ question: q, selectedIndex: 2, isCorrect: true }] }];
    const insights = learningInsights(snapshot, new Date(NOW));
    expect(insights.windows[0]).toMatchObject({ total: 1, success: 0, percent: 0 });
    expect(insights.firstTotal).toBe(1); expect(insights.firstCorrect).toBe(0);
  });
  it("stores actual recall history without fabricating legacy attempts", () => {
    const state = applyReviewRating(makeReviewState("known", { lastStudiedAt: "2026-07-17T04:00:00Z" }), "unknown", NOW);
    expect(state.recallHistory?.[0]).toMatchObject({ rating: "unknown", gapDays: 3 });
    expect(migrateLearningSnapshot(makeSnapshot()).wordProgress[0]?.modes.combined?.recallHistory).toBeUndefined();
  });
});
