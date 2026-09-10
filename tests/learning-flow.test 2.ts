import { describe, expect, it } from "vitest";
import { EMPTY_SNAPSHOT } from "@/lib/constants";
import { getNextLearningAction } from "@/lib/learning-flow";
import type { DailyPlan, DailyRecord, LearningSnapshot } from "@/lib/models";

const date = "2026-07-21";
const plan: DailyPlan = {
  date,
  generatedAt: `${date}T08:00:00.000Z`,
  reviewWordIds: ["review-1"],
  overdueWordIds: ["review-1"],
  newWordIds: ["new-1"],
  grammarIds: ["grammar-1"],
  mistakeIds: [],
  testTarget: 2,
  studyMode: "combined",
};
const emptyRecord: DailyRecord = {
  date,
  wordsStudied: 0,
  newWordsStudied: 0,
  reviewWordsStudied: 0,
  japaneseWordsStudied: 0,
  englishWordsStudied: 0,
  combinedWordsStudied: 0,
  grammarStudied: 0,
  japaneseGrammarStudied: 0,
  englishGrammarStudied: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
};

function snapshot(record: Partial<DailyRecord> = {}): LearningSnapshot {
  return {
    ...EMPTY_SNAPSHOT,
    dailyPlans: [plan],
    dailyRecords: [{ ...emptyRecord, ...record }],
  };
}

describe("today learning flow", () => {
  it("follows review, new words, grammar, test, then mistakes", () => {
    expect(getNextLearningAction(snapshot(), date).step).toBe("review");
    expect(getNextLearningAction(snapshot({ reviewWordsStudied: 1 }), date).step).toBe("new-words");
    expect(getNextLearningAction(snapshot({ reviewWordsStudied: 1, newWordsStudied: 1 }), date).step).toBe("grammar");
    expect(getNextLearningAction(snapshot({ reviewWordsStudied: 1, newWordsStudied: 1, grammarStudied: 1 }), date).step).toBe("test");

    const withMistake = snapshot({ reviewWordsStudied: 1, newWordsStudied: 1, grammarStudied: 1, questionsAnswered: 2 });
    withMistake.mistakes = [{ active: true } as LearningSnapshot["mistakes"][number]];
    expect(getNextLearningAction(withMistake, date).step).toBe("mistakes");
  });

  it("finishes only after the plan and active mistakes are clear", () => {
    expect(getNextLearningAction(snapshot({ reviewWordsStudied: 1, newWordsStudied: 1, grammarStudied: 1, questionsAnswered: 2 }), date).step).toBe("complete");
  });
});
