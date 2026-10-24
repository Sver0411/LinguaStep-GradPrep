import { endOfLocalDayTimestamp, startOfLocalDayTimestamp } from "./date";
import { wordInGoal } from "./study-goals";
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
  dailyRecords?: readonly DailyRecord[];
}

export function generateDailyPlan(input: DailyPlanInput): DailyPlan {
  const nowDate = new Date(input.now);
  const nowTimestamp = nowDate.getTime();
  const startOfToday = startOfLocalDayTimestamp(nowDate);
  const endOfToday = endOfLocalDayTimestamp(nowDate);
  const factor = weekendFactor(nowDate, input.settings);
  /**
   * Backlog-aware new-word budget. A fixed daily quota keeps piling work on
   * top of an already crowded review queue, so once reviews are overdue the
   * day's new words are trimmed: clearing what is due matters more than
   * meeting today's quota, and the quota returns as the backlog clears.
   */
  const dueBacklog = input.wordProgress.filter((progress) => {
    const state = getWordModeState(progress, input.settings.defaultStudyMode);
    if (!state?.nextReviewAt) return false;
    const due = Date.parse(state.nextReviewAt);
    return Number.isFinite(due) && due < nowTimestamp;
  }).length;
  const backlogFactor =
    dueBacklog >= 60 ? 0.2 : dueBacklog >= 30 ? 0.4 : dueBacklog >= 15 ? 0.7 : 1;
  const newLimit = Math.max(
    0,
    Math.round(input.settings.dailyNewWords * factor * backlogFactor),
  );
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
    .filter((word) => wordInGoal(word, input.settings))
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
    .filter((point) => input.settings.defaultStudyMode === "combined" || point.language === input.settings.defaultStudyMode)
    .filter((point) => !input.settings.primaryGoal || input.settings.primaryGoal === "general" || point.level.includes(input.settings.primaryGoal))
    .filter((point) => !learnedGrammarIds.has(point.id))
    .slice(0, grammarLimit)
    .map((point) => point.id);

  const plan: DailyPlan = {
    date: input.date, generatedAt: input.now, newWordIds, reviewWordIds, overdueWordIds,
    mistakeIds: input.settings.prioritizeMistakes ? mistakeIds : [], grammarIds, testTarget, studyMode: selectedMode,
  };
  const recent = [...(input.dailyRecords ?? [])].filter((record) => record.date < input.date && (record.studySeconds ?? 0) > 0).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const activities = recent.reduce((sum, record) => sum + record.wordsStudied + record.questionsAnswered, 0);
  const average = activities ? Math.min(90, Math.max(8, recent.reduce((sum, record) => sum + (record.studySeconds ?? 0), 0) / activities)) : 25;
  const wordSeconds = average, questionSeconds = activities ? average : 35, grammarSeconds = 120;
  const minutes = input.settings.dailyMinutes ?? 0;
  if (minutes > 0) {
    let remaining = minutes * 60;
    const take = (count: number, cost: number) => { const allowed = Math.min(count, Math.max(0, Math.floor(remaining / cost))); remaining -= allowed * cost; return allowed; };
    // Reviews receive priority. Remaining time is shared across new words, grammar and practice.
    const reviewCount = take(plan.reviewWordIds.length, wordSeconds);
    plan.reviewWordIds = plan.reviewWordIds.slice(0, reviewCount);
    plan.overdueWordIds = plan.overdueWordIds.filter((id) => plan.reviewWordIds.includes(id));
    const reserveGrammar = Math.min(plan.grammarIds.length, Math.floor(remaining / grammarSeconds));
    const reserveTest = Math.min(plan.testTarget, Math.floor(Math.max(0, remaining - reserveGrammar * grammarSeconds) / questionSeconds));
    const newCount = Math.min(plan.newWordIds.length, Math.floor(Math.max(0, remaining - reserveGrammar * grammarSeconds - reserveTest * questionSeconds) / wordSeconds));
    plan.newWordIds = plan.newWordIds.slice(0, newCount);
    plan.grammarIds = plan.grammarIds.slice(0, reserveGrammar);
    plan.testTarget = reserveTest;
  }
  const estimated = (plan.newWordIds.length + plan.reviewWordIds.length) * wordSeconds + plan.grammarIds.length * grammarSeconds + plan.testTarget * questionSeconds;
  plan.estimatedMinutes = Math.round(estimated / 60 * 10) / 10;
  const target = input.settings.targetExamDate;
  const days = target ? Math.ceil((new Date(`${target}T23:59:59`).getTime() - nowTimestamp) / 86400000) : null;
  plan.budgetReason = `${minutes ? `每日 ${minutes} 分钟预算，优先复习` : "按设定数量安排"}；${activities ? "参考最近 7 个有计时记录的学习日" : "暂无计时基线，使用初始耗时估算"}${backlogFactor < 1 ? "；复习积压已减少新词" : ""}${days !== null && days >= 0 ? `；距离目标日期 ${days} 天，保持当前时间预算` : ""}。`;
  return plan;
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
    Math.max(0, (record?.newWordsStudied ?? 0) - (plan.completedBeforePlan?.newWords ?? 0)),
  );
  const reviewCompleted = Math.min(
    plan.reviewWordIds.length,
    Math.max(0, (record?.reviewWordsStudied ?? 0) - (plan.completedBeforePlan?.reviewWords ?? 0)),
  );
  const grammarCompleted = Math.min(
    plan.grammarIds.length,
    Math.max(0, (record?.grammarStudied ?? 0) - (plan.completedBeforePlan?.grammar ?? 0)),
  );
  const testCompleted = Math.min(
    plan.testTarget,
    Math.max(0, (record?.questionsAnswered ?? 0) - (plan.completedBeforePlan?.test ?? 0)),
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
