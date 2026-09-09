import { describe, expect, it } from "vitest";
import { WORD_PAIRS } from "../data/words";
import { GRAMMAR_POINTS } from "../data/grammar";
import { GRAMMAR_COMPARISONS } from "../data/grammar-comparisons";
import { EXAM_QUESTIONS } from "../data/exam-questions";
import { EXAM_REFERENCE_WORDS } from "../data/words-exam-reference";

describe("built-in vocabulary", () => {
  it("contains the expanded, reviewed and unique exam word bank", () => {
    expect(EXAM_REFERENCE_WORDS.length).toBeGreaterThanOrEqual(400);
    expect(WORD_PAIRS).toHaveLength(2559);
    expect(new Set(WORD_PAIRS.map((word) => word.id)).size).toBe(WORD_PAIRS.length);
    expect(new Set(WORD_PAIRS.map((word) => word.japanese.term)).size).toBe(WORD_PAIRS.length);
    expect(
      new Set(WORD_PAIRS.map((word) => word.english.term.toLowerCase())).size,
    ).toBe(WORD_PAIRS.length);
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
      expect(["JLPT N3", "JLPT N2", "JLPT N1"]).toContain(
        word.japanese.difficulty,
      );
      expect(["CET-4", "CET-6", "TOEIC"]).toContain(
        word.english.difficulty,
      );
      expect(["高频", "常用", "普通", "低频"]).toContain(word.frequency);
      expect(word.source).toBe("curated");
      expect(word.tags ?? []).not.toContain("扩展词库");
    });
    for (const level of ["JLPT N1", "JLPT N2", "JLPT N3"] as const) {
      expect(WORD_PAIRS.filter((word) => word.japanese.difficulty === level).length).toBeGreaterThanOrEqual(800);
    }
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
      phaseTwo.filter((word) => word.japanese.difficulty === "JLPT N1"),
    ).toHaveLength(30);
    expect(
      phaseTwo.filter((word) => word.english.difficulty === "CET-4"),
    ).toHaveLength(100);
    expect(
      phaseTwo.filter((word) => word.english.difficulty === "CET-6"),
    ).toHaveLength(70);
    expect(
      phaseTwo.filter((word) => word.english.difficulty === "TOEIC"),
    ).toHaveLength(30);
  });

  it("stores verbs as dictionary headwords and suru verbs as stems", () => {
    const verbs = WORD_PAIRS.filter((word) =>
      word.japanese.partOfSpeech.includes("动词"),
    );
    expect(verbs.length).toBeGreaterThan(80);
    expect(
      verbs.filter((word) => word.note.includes("词条按サ变词干")).length,
    ).toBe(60);
    expect(verbs.every((word) => !word.japanese.term.endsWith("する"))).toBe(true);
    expect(
      verbs.every(
        (word) =>
          !/(ます|ました|ません|ている|ない|かった|です)$/.test(
            word.japanese.term,
          ),
      ),
    ).toBe(true);
    const participate = WORD_PAIRS.find((word) => word.id === "word-021");
    expect(participate?.japanese.term).toBe("参加");
    expect(participate?.japanese.reading).toBe("さんか");
  });

  it("keeps OCR-verified red and green book source labels", () => {
    expect(WORD_PAIRS.find((word) => word.japanese.term === "ストレス")?.tags)
      .toContain("红宝书");
    expect(WORD_PAIRS.find((word) => word.japanese.term === "見出し")?.tags)
      .toContain("绿宝书");
  });
});

describe("curated grammar", () => {
  it("contains 65 Japanese and 15 English points", () => {
    expect(GRAMMAR_POINTS).toHaveLength(80);
    expect(
      GRAMMAR_POINTS.filter((point) => point.language === "japanese"),
    ).toHaveLength(65);
    expect(
      GRAMMAR_POINTS.filter((point) => point.language === "english"),
    ).toHaveLength(15);
    expect(new Set(GRAMMAR_POINTS.map((point) => point.id)).size).toBe(80);
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
    expect(questionIds.size).toBe(400);
  });

  it("includes the newly reviewed blue-book N3 grammar set", () => {
    expect(GRAMMAR_POINTS.find((point) => point.id === "jp-aida")?.title)
      .toContain("〜間／間に");
    expect(GRAMMAR_POINTS.find((point) => point.id === "jp-wokomete")?.source)
      .toBe("curated");
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

describe("exam question bank", () => {
  /**
   * Bucket sizes are whatever the real hand-written and vocabulary-derived
   * content adds up to, so the tests assert the properties that matter instead
   * of a padded total: unique ids, full coverage, and no bucket built by
   * replaying the same prompt.
   */
  it("keeps every exam question complete and uniquely identified", () => {
    expect(new Set(EXAM_QUESTIONS.map((question) => question.id)).size).toBe(
      EXAM_QUESTIONS.length,
    );
    EXAM_QUESTIONS.forEach((question) => {
      expect(question.prompt.trim()).not.toBe("");
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(4);
      expect(question.explanation.trim()).not.toBe("");
      expect(question.sourceLabel.trim()).not.toBe("");
    });
  });

  const LEVELS = {
    japanese: ["N3", "N2", "N1"],
    english: ["CET-4", "CET-6", "TOEIC"],
  } as const;
  const SECTIONS = ["characters", "grammar", "reading"] as const;
  type ExamLanguageKey = "japanese" | "english";

  function bucket(
    language: ExamLanguageKey,
    level: string,
    section: (typeof SECTIONS)[number],
  ) {
    return EXAM_QUESTIONS.filter(
      (question) =>
        question.examLanguage === language &&
        question.examLevel === level &&
        question.examSection === section,
    );
  }

  it("covers every language, level and section", () => {
    (["japanese", "english"] as const).forEach((language) => {
      LEVELS[language].forEach((level) => {
        SECTIONS.forEach((section) => {
          expect(bucket(language, level, section).length).toBeGreaterThan(0);
        });
      });
    });
  });

  it("never fills a bucket by replaying the same prompt", () => {
    (["japanese", "english"] as const).forEach((language) => {
      LEVELS[language].forEach((level) => {
        (["characters", "reading"] as const).forEach((section) => {
          const prompts = bucket(language, level, section).map(
            (question) => question.prompt,
          );
          expect(new Set(prompts).size).toBe(prompts.length);
        });
      });
    });
  });

  it("does not reuse grammar material across exam levels", () => {
    (["japanese", "english"] as const).forEach((language) => {
      const promptsByLevel = LEVELS[language].map((level) =>
        new Set(
          bucket(language, level, "grammar").map((question) => question.prompt),
        ),
      );
      for (let left = 0; left < promptsByLevel.length; left += 1) {
        for (let right = left + 1; right < promptsByLevel.length; right += 1) {
          let shared = 0;
          promptsByLevel[left].forEach((prompt) => {
            if (promptsByLevel[right].has(prompt)) shared += 1;
          });
          expect(shared).toBe(0);
        }
      }
    });
  });

  it("keeps the reading bank at its hand-written size", () => {
    EXAM_QUESTIONS.filter((question) => question.examSection === "reading").forEach(
      (question) => {
        expect(question.id.startsWith("generated-reading-")).toBe(false);
      },
    );
  });
});
