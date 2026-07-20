import { describe, expect, it } from "vitest";
import { WORD_PAIRS } from "../data/words";
import { GRAMMAR_POINTS } from "../data/grammar";
import { DEFAULT_SETTINGS, EMPTY_SNAPSHOT } from "../lib/constants";
import { generateDailyPlan } from "../lib/daily-plan";
import {
  createTestQuestions,
  updateDailyRecord,
  updateMistakeRecord,
  updateWordMastery,
} from "../lib/learning";
import { MemoryLearningRepository } from "../lib/repositories/memory";

describe("critical learning workflow", () => {
  it("plans, studies, reloads, tests, creates a mistake and reviews it", async () => {
    const repository = new MemoryLearningRepository();
    const now = "2026-07-20T04:00:00.000Z";
    const plan = generateDailyPlan({
      date: "2026-07-20",
      now,
      settings: { ...DEFAULT_SETTINGS, dailyNewWords: 2 },
      words: WORD_PAIRS,
      grammar: GRAMMAR_POINTS,
      wordProgress: [],
      grammarProgress: [],
      mistakes: [],
    });
    expect(plan.newWordIds).toHaveLength(2);

    const firstWord = plan.newWordIds[0];
    const progress = updateWordMastery(
      undefined,
      firstWord,
      "known",
      now,
      "japanese",
    );
    const studied = {
      ...structuredClone(EMPTY_SNAPSHOT),
      wordProgress: [progress],
      dailyPlans: [plan],
      dailyRecords: updateDailyRecord([], "2026-07-20", {
        wordsStudied: 1,
        newWordsStudied: 1,
        japaneseWordsStudied: 1,
      }),
    };
    await repository.saveSnapshot(studied);

    const reloaded = await repository.getSnapshot();
    expect(reloaded.wordProgress[0].modes.japanese?.mastery).toBe("known");
    const questions = createTestQuestions(
      reloaded.wordProgress,
      [],
      WORD_PAIRS,
      GRAMMAR_POINTS,
      {
        mode: "japanese",
        sourceFilter: "all-learned",
        count: 1,
        now,
      },
    );
    expect(questions).toHaveLength(1);
    const wrongIndex = questions[0].correctIndex === 0 ? 1 : 0;
    const mistake = updateMistakeRecord(
      undefined,
      questions[0],
      wrongIndex,
      now,
    );
    expect(mistake?.state).toBe("active");
    const reviewed = updateMistakeRecord(
      mistake ?? undefined,
      questions[0],
      questions[0].correctIndex,
      "2026-07-20T05:00:00.000Z",
    );
    expect(reviewed?.state).toBe("consolidating");
    expect(reviewed?.history).toHaveLength(2);
  });
});
