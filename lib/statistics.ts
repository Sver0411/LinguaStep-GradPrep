import { recentLocalDateKeys } from "./date";
import { calculateLongestStreak, calculateStreak, getWordModeState } from "./learning";
import { isReviewDue } from "./spaced-repetition";
import type {
  DailyRecord,
  GrammarProgress,
  LearningSnapshot,
  MasteryRating,
  StudyMode,
  WordProgress,
} from "./models";

export interface TrendPoint {
  date: string;
  learned: number;
  reviewed: number;
  questions: number;
  correct: number;
  accuracy: number;
  japanese: number;
  english: number;
  combined: number;
}

export function buildTrend(
  records: readonly DailyRecord[],
  today: string,
  days: number,
): TrendPoint[] {
  const recordMap = new Map(records.map((item) => [item.date, item]));
  return recentLocalDateKeys(today, days).map((date) => {
    const record = recordMap.get(date);
    const questions = record?.questionsAnswered ?? 0;
    const correct = record?.correctAnswers ?? 0;
    return {
      date,
      learned: record?.newWordsStudied ?? 0,
      reviewed: record?.reviewWordsStudied ?? 0,
      questions,
      correct,
      accuracy: questions > 0 ? Math.round((correct / questions) * 100) : 0,
      japanese:
        (record?.japaneseWordsStudied ?? 0) +
        (record?.japaneseGrammarStudied ?? 0),
      english:
        (record?.englishWordsStudied ?? 0) +
        (record?.englishGrammarStudied ?? 0),
      combined: record?.combinedWordsStudied ?? 0,
    };
  });
}

export interface MasteryDistribution {
  known: number;
  fuzzy: number;
  unknown: number;
  unlearned: number;
  due: number;
}

export function wordMasteryDistribution(
  progress: readonly WordProgress[],
  total: number,
  mode: StudyMode,
  nowTimestamp: number,
): MasteryDistribution {
  const ratings: Record<MasteryRating, number> = {
    known: 0,
    fuzzy: 0,
    unknown: 0,
  };
  let studied = 0;
  let due = 0;
  progress.forEach((item) => {
    const state = getWordModeState(item, mode);
    if (!state) return;
    studied += 1;
    ratings[state.mastery] += 1;
    if (isReviewDue(state, nowTimestamp)) due += 1;
  });
  return {
    ...ratings,
    unlearned: Math.max(0, total - studied),
    due,
  };
}

export function grammarMasteryDistribution(
  progress: readonly GrammarProgress[],
  total: number,
  nowTimestamp: number,
): MasteryDistribution {
  const ratings: Record<MasteryRating, number> = {
    known: 0,
    fuzzy: 0,
    unknown: 0,
  };
  progress.forEach((item) => {
    ratings[item.review.mastery] += 1;
  });
  return {
    ...ratings,
    unlearned: Math.max(0, total - progress.length),
    due: progress.filter((item) => isReviewDue(item.review, nowTimestamp)).length,
  };
}

export function effectiveLearningDates(records: readonly DailyRecord[]): string[] {
  return records
    .filter(
      (record) =>
        record.wordsStudied + record.grammarStudied + record.questionsAnswered > 0,
    )
    .map((record) => record.date);
}

export function buildOverview(
  snapshot: LearningSnapshot,
  today: string,
  nowTimestamp: number,
): {
  today: number;
  week: number;
  total: number;
  learnedWords: number;
  masteredWords: number;
  learnedGrammar: number;
  masteredGrammar: number;
  tests: number;
  accuracy: number;
  streak: number;
  longestStreak: number;
  due: number;
  mistakes: number;
} {
  const weekDates = new Set(recentLocalDateKeys(today, 7));
  const activity = (record: DailyRecord) =>
    record.wordsStudied + record.grammarStudied + record.questionsAnswered;
  const answers = snapshot.testResults.flatMap((result) => result.answers);
  const dates = effectiveLearningDates(snapshot.dailyRecords);
  return {
    today: snapshot.dailyRecords.find((record) => record.date === today)
      ? activity(snapshot.dailyRecords.find((record) => record.date === today)!)
      : 0,
    week: snapshot.dailyRecords
      .filter((record) => weekDates.has(record.date))
      .reduce((sum, record) => sum + activity(record), 0),
    total: snapshot.dailyRecords.reduce((sum, record) => sum + activity(record), 0),
    learnedWords: snapshot.wordProgress.length,
    masteredWords: snapshot.wordProgress.filter((item) =>
      Object.values(item.modes).some((state) => state?.status === "mastered"),
    ).length,
    learnedGrammar: snapshot.grammarProgress.length,
    masteredGrammar: snapshot.grammarProgress.filter(
      (item) => item.status === "mastered",
    ).length,
    tests: snapshot.testResults.length,
    accuracy:
      answers.length > 0
        ? Math.round(
            (answers.filter((answer) => answer.isCorrect).length / answers.length) *
              100,
          )
        : 0,
    streak: calculateStreak(dates, today),
    longestStreak: calculateLongestStreak(dates),
    due:
      snapshot.wordProgress.filter((item) =>
        Object.values(item.modes).some(
          (state) => state && isReviewDue(state, nowTimestamp),
        ),
      ).length +
      snapshot.grammarProgress.filter((item) =>
        isReviewDue(item.review, nowTimestamp),
      ).length,
    mistakes: snapshot.mistakes.filter((item) => item.active).length,
  };
}
