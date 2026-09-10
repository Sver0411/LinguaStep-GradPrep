import { endOfLocalDayTimestamp, startOfLocalDayTimestamp } from "./date";
import { getWordModeState } from "./learning";
import { isReviewDue, isReviewOverdue, reviewUrgency } from "./spaced-repetition";
import type {
  AppSettings,
  DailyPlan,
  DailyRecord,
  GrammarPoint,
  GrammarProgress,
  MistakeRecord,
  WordPair,
  WordProgress,
} from "./models";

function weekendFactor(date: Date, settings: AppSettings): number {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  if (!isWeekend || settings.weekendAdjustment === "same") return 1;
  return settings.weekendAdjustment === "lighter" ? 0.7 : 1.3;
}

export interface DailyPlanInput {
  date: string;
  now: string;
  settings: AppSettings;
  words: readonly WordPair[];
  grammar: readonly GrammarPoint[];
  wordProgress: readonly WordProgress[];
  grammarProgress: readonly GrammarProgress[];
  mistakes: readonly MistakeRecord[];
  previousPlans?: readonly DailyPlan[];
}

export function generateDailyPlan(input: DailyPlanInput): DailyPlan {
  const nowDate = new Date(input.now);
  const nowTimestamp = nowDate.getTime();
  const startOfToday = startOfLocalDayTimestamp(nowDate);
  const endOfToday = endOfLocalDayTimestamp(nowDate);
  const factor = weekendFactor(nowDate, input.settings);
  const newLimit = Math.max(0, Math.round(input.settings.dailyNewWords * factor));
  const reviewLimit = Math.max(1, Math.round(input.settings.dailyReviewLimit * factor));
  const grammarLimit = Math.max(0, Math.round(input.settings.dailyGrammarCount * factor));
  const testTarget = Math.max(1, Math.round(input.settings.dailyTestQuestions * factor));
  const progressByWord = new Map(
    input.wordProgress.map((progress) => [progress.wordId, progress]),
  );
  const selectedMode = input.settings.defaultStudyMode;

  const unfinishedNewWordIds = input.settings.autoFillPlan
    ? [...(input.previousPlans ?? [])]
        .sort((left, right) => right.date.localeCompare(left.date))
        .flatMap((plan) => plan.newWordIds)
        .filter((wordId) => !getWordModeState(progressByWord.get(wordId), selectedMode))
    : [];
  const orderedWords = [
    ...new Set([
      ...unfinishedNewWordIds,
      ...input.words.map((word) => word.id),
    ]),
  ];
  const wordById = new Map(input.words.map((word) => [word.id, word]));
  const newWordIds = orderedWords
    .map((wordId) => wordById.get(wordId))
    .filter((word): word is WordPair => Boolean(word))
    .filter((word) => !getWordModeState(progressByWord.get(word.id), selectedMode))
    .slice(0, newLimit)
    .map((word) => word.id);

  const reviewCandidates = input.wordProgress
    .map((progress) => ({
      progress,
      state: getWordModeState(progress, selectedMode),
    }))
    .filter(
      (item): item is { progress: WordProgress; state: NonNullable<typeof item.state> } =>
        Boolean(item.state && isReviewDue(item.state, endOfToday)),
    )
    .sort(
      (left, right) =>
        reviewUrgency(right.state, nowTimestamp) -
          reviewUrgency(left.state, nowTimestamp) ||
        left.state.nextReviewAt.localeCompare(right.state.nextReviewAt),
    )
    .slice(0, reviewLimit);
  const reviewWordIds = reviewCandidates.map((item) => item.progress.wordId);
  const overdueWordIds = reviewCandidates
    .filter((item) => isReviewOverdue(item.state, startOfToday))
    .map((item) => item.progress.wordId);

  const mistakeIds = [...input.mistakes]
    .filter((mistake) => mistake.active)
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        right.lastWrongAt.localeCompare(left.lastWrongAt),
    )
    .map((mistake) => mistake.id);

  const learnedGrammarIds = new Set(
    input.grammarProgress.map((progress) => progress.grammarId),
  );
  const unfinishedGrammarIds = input.settings.autoFillPlan
    ? [...(input.previousPlans ?? [])]
        .sort((left, right) => right.date.localeCompare(left.date))
        .flatMap((plan) => plan.grammarIds)
        .filter((grammarId) => !learnedGrammarIds.has(grammarId))
    : [];
  const grammarById = new Map(input.grammar.map((point) => [point.id, point]));
  const grammarIds = [...new Set([
    ...unfinishedGrammarIds,
    ...input.grammar.map((point) => point.id),
  ])]
    .map((grammarId) => grammarById.get(grammarId))
    .filter((point): point is GrammarPoint => Boolean(point))
    .filter((point) => !learnedGrammarIds.has(point.id))
    .slice(0, grammarLimit)
    .map((point) => point.id);

  return {
    date: input.date,
    generatedAt: input.now,
    newWordIds,
    reviewWordIds,
    overdueWordIds,
    mistakeIds: input.settings.prioritizeMistakes ? mistakeIds : [],
    grammarIds,
    testTarget,
    studyMode: selectedMode,
  };
}

export function getOrCreateDailyPlan(
  existing: readonly DailyPlan[],
  input: DailyPlanInput,
): { plan: DailyPlan; created: boolean } {
  const plan = existing.find((item) => item.date === input.date);
  return plan
    ? { plan, created: false }
    : { plan: generateDailyPlan(input), created: true };
}

export interface DailyPlanProgress {
  total: number;
  completed: number;
  remaining: number;
  percent: number;
  newCompleted: number;
  reviewCompleted: number;
  grammarCompleted: number;
  testCompleted: number;
}

export function calculateDailyPlanProgress(
  plan: DailyPlan,
  record: DailyRecord | undefined,
): DailyPlanProgress {
  const newCompleted = Math.min(
    plan.newWordIds.length,
    record?.newWordsStudied ?? 0,
  );
  const reviewCompleted = Math.min(
    plan.reviewWordIds.length,
    record?.reviewWordsStudied ?? 0,
  );
  const grammarCompleted = Math.min(
    plan.grammarIds.length,
    record?.grammarStudied ?? 0,
  );
  const testCompleted = Math.min(
    plan.testTarget,
    record?.questionsAnswered ?? 0,
  );
  const total =
    plan.newWordIds.length +
    plan.reviewWordIds.length +
    plan.grammarIds.length +
    plan.testTarget;
  const completed =
    newCompleted + reviewCompleted + grammarCompleted + testCompleted;
  return {
    total,
    completed,
    remaining: Math.max(0, total - completed),
    percent: total > 0 ? Math.min(100, (completed / total) * 100) : 100,
    newCompleted,
    reviewCompleted,
    grammarCompleted,
    testCompleted,
  };
}
