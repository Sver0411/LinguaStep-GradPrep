import { describe, expect, it } from "vitest";
import { WORD_PAIRS } from "../data/words";
import { GRAMMAR_POINTS } from "../data/grammar";
import { GRAMMAR_COMPARISONS } from "../data/grammar-comparisons";

describe("built-in vocabulary", () => {
  it("contains exactly 6000 complete and unique word pairs", () => {
    expect(WORD_PAIRS).toHaveLength(6_000);
    expect(new Set(WORD_PAIRS.map((word) => word.id)).size).toBe(6_000);
    expect(new Set(WORD_PAIRS.map((word) => word.japanese.term)).size).toBe(6_000);
    expect(
      new Set(WORD_PAIRS.map((word) => word.english.term.toLowerCase())).size,
    ).toBe(6_000);
    WORD_PAIRS.forEach((word) => {
      expect(word.meaningZh.trim()).not.toBe("");
      expect(word.japanese.reading?.trim()).not.toBe("");
      expect(word.japanese.romanization?.trim()).not.toBe("");
      expect(word.japanese.example.trim()).not.toBe("");
      expect(word.japanese.exampleZh.trim()).not.toBe("");
      expect(word.english.phonetic?.trim()).not.toBe("");
      expect(word.english.example.trim()).not.toBe("");
      expect(word.english.exampleZh.trim()).not.toBe("");
      expect(word.japanese.collocations.length).toBeGreaterThan(0);
      expect(word.english.collocations.length).toBeGreaterThan(0);
      expect(["高频", "常用", "普通", "低频"]).toContain(word.frequency);
      expect(word.source).toBe("curated");
    });
  });

  it("keeps the requested Japanese difficulty distribution for the 200 new pairs", () => {
    const phaseTwo = WORD_PAIRS.slice(100, 300);
    expect(
      phaseTwo.filter((word) => word.japanese.difficulty === "JLPT N3"),
    ).toHaveLength(60);
    expect(
      phaseTwo.filter((word) => word.japanese.difficulty === "JLPT N2"),
    ).toHaveLength(110);
    expect(
      phaseTwo.filter((word) => word.japanese.difficulty === "JLPT N1 过渡"),
    ).toHaveLength(30);
  });
});

describe("curated grammar", () => {
  it("contains 35 Japanese and 15 English points", () => {
    expect(GRAMMAR_POINTS).toHaveLength(50);
    expect(
      GRAMMAR_POINTS.filter((point) => point.language === "japanese"),
    ).toHaveLength(35);
    expect(
      GRAMMAR_POINTS.filter((point) => point.language === "english"),
    ).toHaveLength(15);
    expect(new Set(GRAMMAR_POINTS.map((point) => point.id)).size).toBe(50);
  });

  it("provides five valid four-option exercises for every point", () => {
    const questionIds = new Set<string>();
    GRAMMAR_POINTS.forEach((point) => {
      expect(point.explanation.length).toBeGreaterThan(30);
      expect(point.examples).toHaveLength(2);
      expect(point.exercises).toHaveLength(5);
      expect(point.commonErrors.length).toBeGreaterThan(0);
      expect(point.confusables.length).toBeGreaterThan(0);
      point.exercises.forEach((question) => {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options).size).toBe(4);
        expect(question.correctIndex).toBeGreaterThanOrEqual(0);
        expect(question.correctIndex).toBeLessThan(4);
        expect(question.sourceId).toBe(point.id);
        expect(question.source).toBe("grammar");
        expect(questionIds.has(question.id)).toBe(false);
        questionIds.add(question.id);
      });
    });
    expect(questionIds.size).toBe(250);
  });

  it("contains 137 meaningful comparison groups with exercises", () => {
    expect(GRAMMAR_COMPARISONS).toHaveLength(137);
    expect(new Set(GRAMMAR_COMPARISONS.map((item) => item.id)).size).toBe(137);
    GRAMMAR_COMPARISONS.forEach((item) => {
      expect(item.difference.length).toBeGreaterThan(20);
      expect(item.pitfalls.length).toBeGreaterThan(0);
      expect(item.exercise.source).toBe("comparison");
      expect(item.exercise.sourceId).toBe(item.id);
      expect(item.exercise.options).toHaveLength(4);
      expect(new Set(item.exercise.options).size).toBe(4);
      expect(item.exercise.correctIndex).toBeGreaterThanOrEqual(0);
      expect(item.exercise.correctIndex).toBeLessThan(4);
    });
  });
});
