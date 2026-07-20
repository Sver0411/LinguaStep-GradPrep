import { describe, expect, it } from "vitest";

import {
  calculateStreak,
  compareWordReviewPriority,
  createMixedTest,
  isAnswerCorrect,
  needsWordReview,
  updateDailyRecord,
  updateMistakeRecord,
  updateWordMastery,
} from "../lib/learning";
import type {
  ChoiceQuestion,
  GrammarPoint,
  GrammarProgress,
  MistakeRecord,
  WordPair,
  WordProgress,
} from "../lib/models";

const NOW = "2026-07-20T04:00:00.000Z";

function makeQuestion(
  id = "question-1",
  source: ChoiceQuestion["source"] = "word",
  sourceId = "word-1",
): ChoiceQuestion {
  return {
    id,
    source,
    sourceId,
    prompt: "请选择正确答案",
    options: ["错误 A", "错误 B", "正确", "错误 C"],
    correctIndex: 2,
    explanation: "测试解析",
  };
}

function makeWord(id: string, suffix: string): WordPair {
  return {
    id,
    meaningZh: `含义${suffix}`,
    japanese: {
      term: `日本語${suffix}`,
      reading: `にほんご${suffix}`,
      romanization: `nihongo-${suffix}`,
      partOfSpeech: "名词",
      difficulty: "N5",
      example: `日本語例文${suffix}`,
      exampleZh: `日语例句${suffix}`,
      collocations: [],
    },
    english: {
      term: `English ${suffix}`,
      phonetic: `/english-${suffix}/`,
      partOfSpeech: "noun",
      difficulty: "A1",
      example: `English example ${suffix}`,
      exampleZh: `英语例句${suffix}`,
      collocations: [],
    },
    note: `备注${suffix}`,
    highFrequency: true,
    source: "curated",
  };
}

function makeWordProgress(wordId: string): WordProgress {
  return {
    wordId,
    status: "learned",
    mastery: "known",
    studyCount: 1,
    firstStudiedAt: NOW,
    lastStudiedAt: NOW,
    schedule: {
      dueAt: "2026-07-23T04:00:00.000Z",
      intervalDays: 3,
      easeFactor: 2.35,
      repetitions: 1,
      lapses: 0,
    },
  };
}

function makeGrammarProgress(grammarId: string): GrammarProgress {
  return {
    grammarId,
    status: "learned",
    studyCount: 1,
    correctCount: 4,
    attemptCount: 5,
    firstStudiedAt: NOW,
    lastStudiedAt: NOW,
    schedule: {
      dueAt: "2026-07-23T04:00:00.000Z",
      intervalDays: 3,
      easeFactor: 2.3,
      repetitions: 1,
      lapses: 0,
    },
  };
}

function makeGrammar(id: string, exercise: ChoiceQuestion): GrammarPoint {
  return {
    id,
    title: `语法 ${id}`,
    language: "japanese",
    level: "N5",
    explanation: "语法说明",
    structure: "A + B",
    connection: "接续说明",
    scenarios: ["日常"],
    nuance: "语气说明",
    examples: [{ text: "例文", translationZh: "例句" }],
    comparison: {
      japanese: "日本語の例文",
      english: "An English example",
      translationZh: "对照例句",
    },
    commonErrors: [],
    confusables: [],
    exercises: [exercise],
    source: "curated",
  };
}

function requireMistake(value: MistakeRecord | null): MistakeRecord {
  expect(value).not.toBeNull();
  if (value === null) {
    throw new Error("Expected an active mistake record");
  }
  return value;
}

describe("updateWordMastery", () => {
  it("creates a learned word and a three-day review for an initial known rating", () => {
    const result = updateWordMastery(undefined, "word-1", "known", NOW);

    expect(result).toEqual({
      wordId: "word-1",
      status: "learned",
      mastery: "known",
      studyCount: 1,
      firstStudiedAt: NOW,
      lastStudiedAt: NOW,
      schedule: {
        dueAt: "2026-07-23T04:00:00.000Z",
        intervalDays: 3,
        easeFactor: expect.closeTo(2.35, 10),
        repetitions: 1,
        lapses: 0,
      },
    });
  });

  it("shortens the review interval and ease after a fuzzy rating", () => {
    const previous: WordProgress = {
      ...makeWordProgress("word-1"),
      studyCount: 4,
      firstStudiedAt: "2026-07-01T04:00:00.000Z",
      schedule: {
        dueAt: "2026-07-21T04:00:00.000Z",
        intervalDays: 4,
        easeFactor: 2,
        repetitions: 2,
        lapses: 1,
      },
    };

    expect(updateWordMastery(previous, "word-1", "fuzzy", NOW)).toEqual({
      wordId: "word-1",
      status: "learning",
      mastery: "fuzzy",
      studyCount: 5,
      firstStudiedAt: "2026-07-01T04:00:00.000Z",
      lastStudiedAt: NOW,
      schedule: {
        dueAt: "2026-07-21T04:00:00.000Z",
        intervalDays: 1,
        easeFactor: 1.85,
        repetitions: 1,
        lapses: 1,
      },
    });
  });

  it("schedules an unknown word in ten minutes and records a lapse", () => {
    const previous: WordProgress = {
      ...makeWordProgress("word-1"),
      studyCount: 4,
      firstStudiedAt: "2026-07-01T04:00:00.000Z",
      schedule: {
        dueAt: "2026-07-21T04:00:00.000Z",
        intervalDays: 4,
        easeFactor: 2,
        repetitions: 2,
        lapses: 1,
      },
    };

    expect(updateWordMastery(previous, "word-1", "unknown", NOW)).toEqual({
      wordId: "word-1",
      status: "learning",
      mastery: "unknown",
      studyCount: 5,
      firstStudiedAt: "2026-07-01T04:00:00.000Z",
      lastStudiedAt: NOW,
      schedule: {
        dueAt: "2026-07-20T04:10:00.000Z",
        intervalDays: 0,
        easeFactor: 1.75,
        repetitions: 0,
        lapses: 2,
      },
    });
  });
});

describe("word review queue", () => {
  it("includes weak words immediately and known words only when due", () => {
    const known = makeWordProgress("known");
    const fuzzy = { ...makeWordProgress("fuzzy"), mastery: "fuzzy" as const };
    const unknown = {
      ...makeWordProgress("unknown"),
      mastery: "unknown" as const,
    };

    expect(needsWordReview(known, new Date(NOW).getTime())).toBe(false);
    expect(
      needsWordReview(known, new Date("2026-07-24T04:00:00.000Z").getTime()),
    ).toBe(true);
    expect(needsWordReview(fuzzy, new Date(NOW).getTime())).toBe(true);
    expect(needsWordReview(unknown, new Date(NOW).getTime())).toBe(true);
  });

  it("prioritizes unknown, then fuzzy, then known due words", () => {
    const items: WordProgress[] = [
      makeWordProgress("known"),
      { ...makeWordProgress("fuzzy"), mastery: "fuzzy" },
      { ...makeWordProgress("unknown"), mastery: "unknown" },
    ];

    expect(items.sort(compareWordReviewPriority).map((item) => item.wordId)).toEqual([
      "unknown",
      "fuzzy",
      "known",
    ]);
  });
});

describe("choice questions and mistake review", () => {
  const question = makeQuestion();

  it("judges a choice exclusively by its correct option index", () => {
    expect(isAnswerCorrect(question, 2)).toBe(true);
    expect(isAnswerCorrect(question, 0)).toBe(false);
    expect(isAnswerCorrect(question, 3)).toBe(false);
  });

  it("adds the first wrong answer to the active mistake list", () => {
    const result = requireMistake(
      updateMistakeRecord(undefined, question, 1, NOW),
    );

    expect(result).toEqual({
      id: "mistake-question-1",
      question,
      selectedIndex: 1,
      errorCount: 1,
      correctStreak: 0,
      active: true,
      priority: 1,
      firstWrongAt: NOW,
      lastWrongAt: NOW,
      lastAnsweredAt: NOW,
    });
  });

  it("raises priority on another wrong answer", () => {
    const first = requireMistake(
      updateMistakeRecord(undefined, question, 1, NOW),
    );
    const repeated = requireMistake(
      updateMistakeRecord(first, question, 0, "2026-07-20T06:00:00.000Z"),
    );

    expect(repeated.errorCount).toBe(2);
    expect(repeated.correctStreak).toBe(0);
    expect(repeated.priority).toBe(2);
    expect(repeated.firstWrongAt).toBe(NOW);
    expect(repeated.lastWrongAt).toBe("2026-07-20T06:00:00.000Z");
  });

  it("leaves the active mistake list after three consecutive correct answers", () => {
    const wrong = requireMistake(
      updateMistakeRecord(undefined, question, 1, NOW),
    );
    const firstCorrect = requireMistake(
      updateMistakeRecord(wrong, question, 2, "2026-07-20T05:00:00.000Z"),
    );
    const secondCorrect = requireMistake(
      updateMistakeRecord(firstCorrect, question, 2, "2026-07-20T06:00:00.000Z"),
    );
    const thirdCorrect = requireMistake(
      updateMistakeRecord(secondCorrect, question, 2, "2026-07-20T07:00:00.000Z"),
    );

    expect(firstCorrect).toMatchObject({ correctStreak: 1, active: true });
    expect(secondCorrect).toMatchObject({ correctStreak: 2, active: true });
    expect(thirdCorrect).toMatchObject({
      correctStreak: 3,
      active: false,
      priority: 0,
    });
  });
});

describe("study activity", () => {
  it("counts a consecutive streak starting today", () => {
    expect(
      calculateStreak(
        ["2026-07-18", "2026-07-19", "2026-07-20"],
        "2026-07-20",
      ),
    ).toBe(3);
  });

  it("starts from yesterday when there is no activity today", () => {
    expect(
      calculateStreak(
        ["2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19"],
        "2026-07-20",
      ),
    ).toBe(4);
    expect(calculateStreak(["2026-07-18"], "2026-07-20")).toBe(0);
  });

  it("accumulates today's counters without changing other dates", () => {
    const initial = [
      {
        date: "2026-07-19",
        wordsStudied: 2,
        grammarStudied: 1,
        questionsAnswered: 4,
        correctAnswers: 3,
      },
    ];
    const withToday = updateDailyRecord(initial, "2026-07-20", {
      wordsStudied: 3,
      questionsAnswered: 2,
      correctAnswers: 1,
    });
    const accumulated = updateDailyRecord(withToday, "2026-07-20", {
      wordsStudied: 2,
      grammarStudied: 1,
      questionsAnswered: 3,
      correctAnswers: 2,
    });

    expect(accumulated).toEqual([
      initial[0],
      {
        date: "2026-07-20",
        wordsStudied: 5,
        grammarStudied: 1,
        questionsAnswered: 5,
        correctAnswers: 3,
      },
    ]);
  });
});

describe("createMixedTest", () => {
  it("only creates questions whose source item has been studied", () => {
    const vocabulary = [makeWord("word-1", "一"), makeWord("word-2", "二")];
    const learnedGrammarExercise = makeQuestion(
      "grammar-question-1",
      "grammar",
      "grammar-1",
    );
    const unlearnedGrammarExercise = makeQuestion(
      "grammar-question-2",
      "grammar",
      "grammar-2",
    );
    const grammar = [
      makeGrammar("grammar-1", learnedGrammarExercise),
      makeGrammar("grammar-2", unlearnedGrammarExercise),
    ];

    const questions = createMixedTest(
      [makeWordProgress("word-1")],
      [makeGrammarProgress("grammar-1")],
      vocabulary,
      grammar,
      10,
    );

    expect(questions).toHaveLength(6);
    expect(
      questions.every((question) =>
        ["word-1", "grammar-1"].includes(question.sourceId),
      ),
    ).toBe(true);
    expect(questions).toContainEqual(learnedGrammarExercise);
    expect(questions).not.toContainEqual(unlearnedGrammarExercise);
  });
});
