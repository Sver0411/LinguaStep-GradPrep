import { describe, expect, it } from "vitest";
import { WORD_PAIRS } from "../data/words";
import { GRAMMAR_POINTS } from "../data/grammar";

describe("curated vocabulary", () => {
  it("contains exactly 100 complete and unique word pairs", () => {
    expect(WORD_PAIRS).toHaveLength(100);
    expect(new Set(WORD_PAIRS.map((word) => word.id)).size).toBe(100);
    expect(new Set(WORD_PAIRS.map((word) => word.japanese.term)).size).toBe(100);
    expect(new Set(WORD_PAIRS.map((word) => word.english.term.toLowerCase())).size).toBe(100);

    WORD_PAIRS.forEach((word) => {
      expect(word.meaningZh.trim()).not.toBe("");
      expect(word.japanese.reading?.trim()).not.toBe("");
      expect(word.japanese.romanization?.trim()).not.toBe("");
      expect(word.japanese.exampleZh.trim()).not.toBe("");
      expect(word.english.phonetic?.trim()).not.toBe("");
      expect(word.english.exampleZh.trim()).not.toBe("");
      expect(word.japanese.collocations.length).toBeGreaterThan(0);
      expect(word.english.collocations.length).toBeGreaterThan(0);
      expect(word.source).toBe("curated");
    });
  });
});

describe("curated grammar", () => {
  it("contains 14 Japanese and 6 English points", () => {
    expect(GRAMMAR_POINTS).toHaveLength(20);
    expect(GRAMMAR_POINTS.filter((point) => point.language === "japanese")).toHaveLength(14);
    expect(GRAMMAR_POINTS.filter((point) => point.language === "english")).toHaveLength(6);
    expect(new Set(GRAMMAR_POINTS.map((point) => point.id)).size).toBe(20);
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
    expect(questionIds.size).toBe(100);
  });
});
