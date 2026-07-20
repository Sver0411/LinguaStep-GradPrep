import { describe, expect, it } from "vitest";
import { buildOverview, buildTrend, wordMasteryDistribution } from "../lib/statistics";
import { makeDailyRecord, makeReviewState, makeSnapshot, makeWordProgress, NOW } from "./fixtures";

describe("statistics aggregation", () => {
  it("fills missing days and aggregates 7/30-day trend points", () => {
    const records = [
      { ...makeDailyRecord("2026-07-19"), newWordsStudied: 2, reviewWordsStudied: 3 },
      { ...makeDailyRecord("2026-07-20"), questionsAnswered: 10, correctAnswers: 8 },
    ];
    const trend = buildTrend(records, "2026-07-20", 7);
    expect(trend).toHaveLength(7);
    expect(trend[0].date).toBe("2026-07-14");
    expect(trend.at(-1)).toMatchObject({ date: "2026-07-20", accuracy: 80 });
  });

  it("calculates overview, current streak, longest streak and due load", () => {
    const snapshot = makeSnapshot();
    snapshot.dailyRecords = [
      makeDailyRecord("2026-07-17"),
      makeDailyRecord("2026-07-19"),
      makeDailyRecord("2026-07-20"),
    ];
    snapshot.wordProgress = [
      makeWordProgress(
        "word-1",
        "combined",
        makeReviewState("known", {
          status: "mastered",
          nextReviewAt: "2026-07-19T04:00:00.000Z",
        }),
      ),
    ];
    const overview = buildOverview(snapshot, "2026-07-20", new Date(NOW).getTime());
    expect(overview.streak).toBe(2);
    expect(overview.longestStreak).toBe(2);
    expect(overview.masteredWords).toBe(1);
    expect(overview.due).toBeGreaterThan(0);
  });

  it("keeps mastery distributions independent by study mode", () => {
    const progress = makeWordProgress("word-1", "japanese", makeReviewState("fuzzy"));
    progress.modes.english = makeReviewState("known");
    expect(
      wordMasteryDistribution([progress], 10, "japanese", new Date(NOW).getTime()),
    ).toMatchObject({ fuzzy: 1, known: 0, unlearned: 9 });
    expect(
      wordMasteryDistribution([progress], 10, "english", new Date(NOW).getTime()),
    ).toMatchObject({ fuzzy: 0, known: 1, unlearned: 9 });
  });
});
