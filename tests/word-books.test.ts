import { describe, expect, it } from "vitest";
import { BOOK_MEMBERSHIPS } from "../data/word-books";
import { WORD_PAIRS } from "../data/words";
import { chooseBookWords, validWordBook, wordsInBook } from "../lib/word-books";
import { restrictSnapshotToActiveVocabulary, createPlan } from "../context/learning/snapshot-utils";
import { DEFAULT_SETTINGS } from "../lib/constants";
import { makeSnapshot, makeWordProgress, makeReviewState, makeMistake } from "./fixtures";

describe("word book study", () => {
  it("resolves book order, skips already studied words and honors explicit selection without truncation", () => {
    const words = wordsInBook("green-n5", WORD_PAIRS);
    expect(words.map((word) => word.id)).toEqual(BOOK_MEMBERSHIPS["green-n5"].map(([id]) => id));
    const progress = [makeWordProgress(words[0].id, "japanese")];
    expect(chooseBookWords({ words, progress, mode: "japanese", order: "sequential", limit: 3 }).map((word) => word.id)).toEqual(words.slice(1, 4).map((word) => word.id));
    const selectedIds = new Set(words.slice(0, 25).map((word) => word.id));
    expect(chooseBookWords({ words, progress, mode: "japanese", order: "sequential", source: "selected", selectedIds, limit: 10 })).toHaveLength(25);
  });
  it("shuffles once without losing or repeating selected entries", () => {
    const words = wordsInBook("red-n5", WORD_PAIRS).slice(0, 20);
    const shuffled = chooseBookWords({ words, progress: [], mode: "combined", order: "random", limit: 20, random: () => 0.25 });
    expect(new Set(shuffled.map((word) => word.id))).toEqual(new Set(words.map((word) => word.id)));
    expect(shuffled.map((word) => word.id)).not.toEqual(words.map((word) => word.id));
  });
  it("shares progress across books while retaining independent language modes", () => {
    const a = wordsInBook("red-n5", WORD_PAIRS);
    const b = wordsInBook("green-n5", WORD_PAIRS);
    const shared = a.find((word) => b.some((other) => other.id === word.id))!;
    const progress = [makeWordProgress(shared.id, "japanese")];
    expect(chooseBookWords({ words: b, progress, mode: "japanese", order: "sequential", source: "new", limit: 10000 }).some((word) => word.id === shared.id)).toBe(false);
    expect(chooseBookWords({ words: b, progress, mode: "english", order: "sequential", source: "new", limit: 10000 }).some((word) => word.id === shared.id)).toBe(true);
  });
  it("limits daily new words and due reviews to the selected book", () => {
    const inside = wordsInBook("green-n5", WORD_PAIRS);
    const ids = new Set(inside.map((word) => word.id));
    const outside = WORD_PAIRS.find((word) => !ids.has(word.id))!;
    const snapshot = makeSnapshot(); snapshot.dailyRecords = []; snapshot.dailyPlans = [];
    snapshot.wordProgress = [makeWordProgress(outside.id, "combined", makeReviewState("unknown", { nextReviewAt: "2020-01-01T00:00:00Z" }))];
    const plan = createPlan(snapshot, { ...DEFAULT_SETTINGS, studyWordBook: "green-n5", wordStudyOrder: "sequential" });
    expect(plan.newWordIds.length).toBeGreaterThan(0);
    expect(plan.newWordIds.every((id) => ids.has(id))).toBe(true);
    expect(plan.reviewWordIds).not.toContain(outside.id);
    expect(plan.wordBookId).toBe("green-n5");
    expect(validWordBook("missing-book")).toBe("red-n3");
  });
  it("preserves legacy learning history and favorites when the old content is retired", () => {
    const snapshot = makeSnapshot(); snapshot.wordProgress = [makeWordProgress("word-legacy")]; snapshot.favorites = ["word:word-legacy"];
    const next = restrictSnapshotToActiveVocabulary(snapshot);
    expect(next.wordProgress).toEqual(snapshot.wordProgress);
    expect(next.favorites).toEqual(snapshot.favorites);
  });
  it("archives retired grammar mistakes without removing history or unrelated exam mistakes", () => {
    const snapshot = makeSnapshot();
    const retired = {...makeMistake(), id:"retired-grammar",contentRef:{source:"grammar" as const,sourceId:"jp-legacy"}};
    const exam = {...makeMistake(), id:"exam-grammar",contentRef:{source:"grammar" as const,sourceId:"exam-jp-n3-1"}};
    snapshot.mistakes=[retired,exam];
    const next=restrictSnapshotToActiveVocabulary(snapshot);
    expect(next.mistakes.find((item)=>item.id===retired.id)).toMatchObject({active:false,state:"archived",history:retired.history});
    expect(next.mistakes.find((item)=>item.id===exam.id)).toEqual(exam);
    expect(next.grammarProgress).toEqual(snapshot.grammarProgress);
  });

});
