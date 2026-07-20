import { REVIEW_ALGORITHM_VERSION } from "../constants";
import type {
  DailyPlan,
  DailyRecord,
  GrammarProgress,
  LearningSnapshot,
  LearningStatus,
  MasteryRating,
  MistakeRecord,
  ReviewState,
  StudyMode,
  TestResult,
  WordProgress,
} from "../models";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function masteryValue(value: unknown): MasteryRating {
  return value === "known" || value === "fuzzy" || value === "unknown"
    ? value
    : "unknown";
}

function statusValue(value: unknown, mastery: MasteryRating): LearningStatus {
  if (
    value === "new" ||
    value === "learning" ||
    value === "review" ||
    value === "mastered"
  ) {
    return value;
  }
  if (value === "learned") return mastery === "known" ? "review" : "learning";
  return "new";
}

export function migrateReviewState(
  value: unknown,
  fallbackNow: string,
): ReviewState {
  const record = isRecord(value) ? value : {};
  const schedule = isRecord(record.schedule) ? record.schedule : {};
  const mastery = masteryValue(record.mastery ?? record.lastRating);
  const firstStudiedAt = stringValue(record.firstStudiedAt, fallbackNow);
  const lastStudiedAt = stringValue(record.lastStudiedAt, firstStudiedAt);
  const nextReviewAt = stringValue(
    record.nextReviewAt ?? schedule.dueAt,
    lastStudiedAt,
  );
  const reviewCount = numberValue(
    record.reviewCount ?? record.studyCount ?? schedule.repetitions,
    0,
  );
  const correctStreak = numberValue(
    record.correctStreak ?? schedule.repetitions,
    mastery === "known" ? 1 : 0,
  );
  const lapses = numberValue(record.lapses ?? schedule.lapses, 0);
  const intervalDays = numberValue(
    record.intervalDays ?? schedule.intervalDays,
    0,
  );
  const legacyEase = numberValue(schedule.easeFactor, 2.3);
  const difficulty = numberValue(
    record.difficulty,
    Math.max(1, Math.min(10, Number(((3 - legacyEase) / 0.17).toFixed(2)))),
  );

  return {
    status: statusValue(record.status, mastery),
    mastery,
    firstStudiedAt,
    lastStudiedAt,
    nextReviewAt,
    intervalDays,
    reviewCount,
    correctStreak,
    lapses,
    stability: numberValue(record.stability, Math.max(0, intervalDays)),
    difficulty,
    lastRating: masteryValue(record.lastRating ?? mastery),
    isNew: booleanValue(record.isNew, reviewCount === 0),
    suspended: booleanValue(record.suspended, false),
    algorithmVersion: REVIEW_ALGORITHM_VERSION,
  };
}

export function summarizeWordProgress(
  wordId: string,
  modes: Partial<Record<StudyMode, ReviewState>>,
  fallbackNow: string,
): WordProgress {
  const states = Object.values(modes).filter(
    (state): state is ReviewState => state !== undefined,
  );
  const earliest = [...states].sort((left, right) =>
    left.nextReviewAt.localeCompare(right.nextReviewAt),
  )[0];
  const latest = [...states].sort((left, right) =>
    right.lastStudiedAt.localeCompare(left.lastStudiedAt),
  )[0];
  const learningStatus: LearningStatus =
    states.length === 0
      ? "new"
      : states.some((state) => state.status === "learning")
        ? "learning"
        : states.every((state) => state.status === "mastered")
          ? "mastered"
          : "review";
  const createdAt = [...states].sort((left, right) =>
    left.firstStudiedAt.localeCompare(right.firstStudiedAt),
  )[0]?.firstStudiedAt ?? fallbackNow;

  return {
    wordId,
    modes,
    nextReviewAt: earliest?.nextReviewAt ?? fallbackNow,
    lastStudiedAt: latest?.lastStudiedAt ?? fallbackNow,
    learningStatus,
    createdAt,
    updatedAt: latest?.lastStudiedAt ?? fallbackNow,
  };
}

export function migrateWordProgressRecord(
  value: unknown,
  fallbackNow = new Date(0).toISOString(),
): WordProgress {
  const record = isRecord(value) ? value : {};
  const wordId = stringValue(record.wordId, "unknown-word");
  const modesRecord = isRecord(record.modes) ? record.modes : null;
  const modes: Partial<Record<StudyMode, ReviewState>> = {};

  if (modesRecord) {
    (["combined", "japanese", "english"] as const).forEach((mode) => {
      if (modesRecord[mode] !== undefined) {
        modes[mode] = migrateReviewState(modesRecord[mode], fallbackNow);
      }
    });
  } else {
    modes.combined = migrateReviewState(record, fallbackNow);
  }

  return summarizeWordProgress(wordId, modes, fallbackNow);
}

export function migrateGrammarProgressRecord(
  value: unknown,
  fallbackNow = new Date(0).toISOString(),
): GrammarProgress {
  const record = isRecord(value) ? value : {};
  const grammarId = stringValue(record.grammarId, "unknown-grammar");
  const review = migrateReviewState(record.review ?? record, fallbackNow);
  return {
    grammarId,
    status: review.status,
    studyCount: numberValue(record.studyCount, review.reviewCount),
    correctCount: numberValue(record.correctCount, 0),
    attemptCount: numberValue(record.attemptCount, 0),
    lastStudiedAt: review.lastStudiedAt,
    firstStudiedAt: review.firstStudiedAt,
    nextReviewAt: review.nextReviewAt,
    review,
  };
}

export function migrateMistakeRecord(
  value: unknown,
  fallbackNow = new Date(0).toISOString(),
): MistakeRecord {
  const record = isRecord(value) ? value : {};
  const question = isRecord(record.question)
    ? (record.question as unknown as MistakeRecord["question"])
    : {
        id: "unknown-question",
        source: "word" as const,
        sourceId: "unknown-word",
        prompt: "无法读取的历史题目",
        options: ["", "", "", ""] as [string, string, string, string],
        correctIndex: 0,
        explanation: "此记录来自旧版本。",
      };
  const active = booleanValue(record.active, true);
  const lastAnsweredAt = stringValue(record.lastAnsweredAt, fallbackNow);
  const selectedIndex = numberValue(record.selectedIndex, 0);
  const correctStreak = numberValue(record.correctStreak, 0);
  const state =
    record.state === "active" ||
    record.state === "consolidating" ||
    record.state === "mastered" ||
    record.state === "archived"
      ? record.state
      : active
        ? correctStreak > 0
          ? "consolidating"
          : "active"
        : "mastered";
  return {
    id: stringValue(record.id, `mistake-${question.id}`),
    contentRef: isRecord(record.contentRef)
      ? (record.contentRef as unknown as MistakeRecord["contentRef"])
      : { source: question.source, sourceId: question.sourceId },
    question,
    selectedIndex,
    errorCount: numberValue(record.errorCount, 1),
    correctStreak,
    active: state === "active" || state === "consolidating",
    state,
    priority: numberValue(record.priority, 1),
    favorite: booleanValue(record.favorite, false),
    firstWrongAt: stringValue(record.firstWrongAt, lastAnsweredAt),
    lastWrongAt: stringValue(record.lastWrongAt, lastAnsweredAt),
    lastAnsweredAt,
    history: Array.isArray(record.history)
      ? (record.history as MistakeRecord["history"])
      : [{ answeredAt: lastAnsweredAt, selectedIndex, correct: false }],
  };
}

export function migrateTestResult(
  value: unknown,
  fallbackNow = new Date(0).toISOString(),
): TestResult {
  const record = isRecord(value) ? value : {};
  const completedAt = stringValue(record.completedAt, fallbackNow);
  const mode =
    record.mode === "japanese" ||
    record.mode === "english" ||
    record.mode === "mixed"
      ? record.mode
      : "mixed";
  return {
    id: stringValue(record.id, `test-${completedAt}`),
    mode,
    sourceFilter:
      record.sourceFilter === "today" ||
      record.sourceFilter === "recent-7" ||
      record.sourceFilter === "mistakes" ||
      record.sourceFilter === "favorites" ||
      record.sourceFilter === "due"
        ? record.sourceFilter
        : "all-learned",
    answers: Array.isArray(record.answers)
      ? (record.answers as TestResult["answers"])
      : [],
    correctCount: numberValue(record.correctCount, 0),
    startedAt: stringValue(record.startedAt, completedAt),
    completedAt,
    durationSeconds: numberValue(record.durationSeconds, 0),
  };
}

export function migrateDailyRecord(value: unknown): DailyRecord {
  const record = isRecord(value) ? value : {};
  return {
    date: stringValue(record.date, "1970-01-01"),
    wordsStudied: numberValue(record.wordsStudied, 0),
    newWordsStudied: numberValue(record.newWordsStudied, 0),
    reviewWordsStudied: numberValue(record.reviewWordsStudied, 0),
    japaneseWordsStudied: numberValue(record.japaneseWordsStudied, 0),
    englishWordsStudied: numberValue(record.englishWordsStudied, 0),
    combinedWordsStudied: numberValue(
      record.combinedWordsStudied,
      numberValue(record.wordsStudied, 0),
    ),
    grammarStudied: numberValue(record.grammarStudied, 0),
    japaneseGrammarStudied: numberValue(
      record.japaneseGrammarStudied,
      numberValue(record.grammarStudied, 0),
    ),
    englishGrammarStudied: numberValue(record.englishGrammarStudied, 0),
    questionsAnswered: numberValue(record.questionsAnswered, 0),
    correctAnswers: numberValue(record.correctAnswers, 0),
  };
}

export function migrateDailyPlan(value: unknown): DailyPlan {
  const record = isRecord(value) ? value : {};
  return {
    date: stringValue(record.date, "1970-01-01"),
    generatedAt: stringValue(record.generatedAt, new Date(0).toISOString()),
    newWordIds: Array.isArray(record.newWordIds)
      ? (record.newWordIds.filter((item) => typeof item === "string") as string[])
      : [],
    reviewWordIds: Array.isArray(record.reviewWordIds)
      ? (record.reviewWordIds.filter((item) => typeof item === "string") as string[])
      : [],
    overdueWordIds: Array.isArray(record.overdueWordIds)
      ? (record.overdueWordIds.filter((item) => typeof item === "string") as string[])
      : [],
    mistakeIds: Array.isArray(record.mistakeIds)
      ? (record.mistakeIds.filter((item) => typeof item === "string") as string[])
      : [],
    grammarIds: Array.isArray(record.grammarIds)
      ? (record.grammarIds.filter((item) => typeof item === "string") as string[])
      : [],
    testTarget: numberValue(record.testTarget, 10),
    studyMode:
      record.studyMode === "japanese" || record.studyMode === "english"
        ? record.studyMode
        : "combined",
  };
}

export function migrateLearningSnapshot(value: unknown): LearningSnapshot {
  const record = isRecord(value) ? value : {};
  return {
    wordProgress: Array.isArray(record.wordProgress)
      ? record.wordProgress.map((item) => migrateWordProgressRecord(item))
      : [],
    grammarProgress: Array.isArray(record.grammarProgress)
      ? record.grammarProgress.map((item) => migrateGrammarProgressRecord(item))
      : [],
    mistakes: Array.isArray(record.mistakes)
      ? record.mistakes.map((item) => migrateMistakeRecord(item))
      : [],
    favorites: Array.isArray(record.favorites)
      ? record.favorites.filter((item): item is string => typeof item === "string")
      : [],
    testResults: Array.isArray(record.testResults)
      ? record.testResults.map((item) => migrateTestResult(item))
      : [],
    dailyRecords: Array.isArray(record.dailyRecords)
      ? record.dailyRecords.map((item) => migrateDailyRecord(item))
      : [],
    dailyPlans: Array.isArray(record.dailyPlans)
      ? record.dailyPlans.map((item) => migrateDailyPlan(item))
      : [],
  };
}
