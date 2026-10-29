import { describe, expect, it } from "vitest";
import { WORD_PAIRS } from "../data/words";
import { GRAMMAR_POINTS } from "../data/grammar";
import { GRAMMAR_COMPARISONS } from "../data/grammar-comparisons";
import { EXAM_QUESTIONS } from "../data/exam-questions";
import meaningReview from "../data/word-meaning-review.json";
import { WORD_BOOKS, BOOK_MEMBERSHIPS } from "../data/word-books";

describe("book vocabulary", () => {
  it("provides ten real red/green book memberships with shared stable IDs", () => {
    expect(WORD_BOOKS).toHaveLength(10);
    expect(WORD_PAIRS.length).toBeGreaterThan(12000);
    expect(new Set(WORD_PAIRS.map((word) => word.id)).size).toBe(WORD_PAIRS.length);
    const ids = new Set(WORD_PAIRS.map((word) => word.id));
    for (const color of ["red", "green"]) for (const grade of [1, 2, 3, 4, 5]) {
      const book = WORD_BOOKS.find((item) => item.id === `${color}-n${grade}`)!;
      expect(book.wordCount).toBeGreaterThan(600);
      const members = BOOK_MEMBERSHIPS[book.id];
      expect(members).toHaveLength(book.wordCount);
      expect(new Set(members.map(([id]) => id)).size).toBe(members.length);
      expect(members.every(([id]) => ids.has(id))).toBe(true);
    }
    expect(WORD_PAIRS.every((word) => /^bw-[a-f0-9]{16}$/.test(word.id))).toBe(true);
  });

  it("keeps bilingual examples, Chinese meanings and book audio complete", () => {
    for (const word of WORD_PAIRS) {
      for (const value of [word.meaningZh, word.japanese.term, word.japanese.reading, word.english.term, word.japanese.example, word.japanese.exampleZh, word.english.example, word.english.exampleZh]) {
        expect(value?.trim(), word.id).toBeTruthy();
      }
      expect(word.audioUrl, word.id).toMatch(/^\/api\/word-audio\/[a-f0-9]{32}$/);
      expect(word.note).toBe("");
      expect(word.source).toBe("curated");
      expect(["JLPT N1", "JLPT N2", "JLPT N3", "JLPT N4", "JLPT N5"]).toContain(word.japanese.difficulty);
    }
  });

  it("serves concise Chinese glosses with reversible editorial records", () => {
    const byId = new Map(WORD_PAIRS.map((word) => [word.id,word]));
    expect(meaningReview.reviewedWords).toBe(WORD_PAIRS.length);
    expect(meaningReview.changes).toHaveLength(meaningReview.editedWords);
    for (const change of meaningReview.changes) {
      expect(change.from).toBeTruthy();
      expect(byId.get(change.id)?.meaningZh).toBe(change.to);
    }
    expect(WORD_PAIRS.filter((word) => /[ぁ-ヿ（）()〔〕【】\[\]「」△★=<>]/.test(word.meaningZh)).map((word) => word.id)).toEqual([]);
    expect(WORD_PAIRS.filter((word) => !word.meaningZh.trim() || word.meaningZh.length > 22).map((word) => word.id)).toEqual([]);
    expect(WORD_PAIRS.find((word) => word.japanese.term === "行ってらっしゃい")?.meaningZh).toBe("慢走；路上小心");
    const rawFood=WORD_PAIRS.find((word) => word.japanese.term === "生物" && word.japanese.reading === "なまもの")!;
    const organism=WORD_PAIRS.find((word) => word.japanese.term === "生物" && word.japanese.reading === "せいぶつ")!;
    expect(rawFood.meaningZh).not.toBe(organism.meaningZh);
  });

  it("uses verified book order and corrected dictionary headwords", () => {
    const byId = new Map(WORD_PAIRS.map((word) => [word.id, word]));
    expect(BOOK_MEMBERSHIPS["green-n1"].slice(0, 3).map(([id]) => byId.get(id)?.japanese.term)).toEqual(["合図", "愛想", "当たり"]);
    expect(BOOK_MEMBERSHIPS["green-n2"][0][0]).toBe(WORD_PAIRS.find((word) => word.japanese.term === "相変わらず")?.id);
    expect(WORD_PAIRS.some((word) => word.japanese.term === "ギヨーザ")).toBe(false);
    expect(WORD_PAIRS.find((word) => word.japanese.term === "餃子")?.japanese.reading).toBe("ぎょうざ");
  });
});

describe("curated grammar", () => {
  it("loads reviewed Blue Book source across N1–N5 and retains English lessons", () => {
    expect(GRAMMAR_POINTS).toHaveLength(781);
    expect(new Set(GRAMMAR_POINTS.map((point) => point.id)).size).toBe(781);
    expect(GRAMMAR_POINTS.filter((point) => point.language === "english")).toHaveLength(15);
    for (const [level,count] of Object.entries({N5:125,N4:130,N3:138,N2:159,N1:214})) expect(GRAMMAR_POINTS.filter((point) => point.level === `JLPT ${level}`)).toHaveLength(count);
    expect(GRAMMAR_POINTS.some((point) => point.id === "bb-868919d64c152dc0")).toBe(false);
    const held = GRAMMAR_POINTS.find((point) => point.id === "bb-56ec4a5ab254c067")!;
    expect(held.examples).toHaveLength(1);
    expect(held.examples[0].text).toContain("桜の並木");
  });

  it("keeps source examples paired and every recall reversible without authored filler", () => {
    const ids = new Set<string>();
    let examples=0, recalls=0, images=0;
    for (const point of GRAMMAR_POINTS.filter((point) => point.book)) {
      expect(point.book!.sourceNote).toBeTruthy();
      expect(point.examples.length || point.explanation || point.nuance || point.book!.images.length).toBeTruthy();
      images += point.book!.images.length;
      examples += point.examples.length;
      for (const example of point.examples) {
        expect(example.text.trim()).toBeTruthy(); expect(example.translationZh.trim()).toBeTruthy();
      }
      for (const question of point.exercises) {
        expect(ids.has(question.id)).toBe(false); ids.add(question.id);
        expect(question.acceptedAnswers).toHaveLength(1);
        const original = question.prompt.replace("（　）",question.acceptedAnswers![0]);
        expect(point.examples.some((example) => example.text === original && question.explanation === `${example.text}\n${example.translationZh}`)).toBe(true);
        expect(question.sourceId).toBe(point.id);
        recalls++;
      }
    }
    expect(examples).toBe(2465); expect(recalls).toBe(2074); expect(images).toBe(159);
    const table = GRAMMAR_POINTS.find((point) => point.title === "基数词")!;
    expect(table.examples).toHaveLength(0); expect(table.exercises).toHaveLength(0); expect(table.book!.images).toHaveLength(2);
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
      expect(new Set(question.options).size, `${question.id}: ${question.options.join(" / ")}`).toBe(4);
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
