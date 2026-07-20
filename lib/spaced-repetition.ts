import { REVIEW_ALGORITHM_VERSION } from "./constants";
import { addDays, addMilliseconds, safeTimestamp } from "./date";
import { REVIEW_CONFIG } from "./review-config";
import type {
  LearningStatus,
  MasteryRating,
  ReviewState,
} from "./models";

const DAY_MS = 86_400_000;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function statusFor(rating: MasteryRating, correctStreak: number): LearningStatus {
  if (rating === "unknown" || rating === "fuzzy") return "learning";
  return correctStreak >= REVIEW_CONFIG.masteredCorrectStreak
    ? "mastered"
    : "review";
}

function initialState(now: string): ReviewState {
  return {
    status: "new",
    mastery: "unknown",
    firstStudiedAt: now,
    lastStudiedAt: now,
    nextReviewAt: now,
    intervalDays: 0,
    reviewCount: 0,
    correctStreak: 0,
    lapses: 0,
    stability: 0,
    difficulty: 5,
    lastRating: "unknown",
    isNew: true,
    suspended: false,
    algorithmVersion: REVIEW_ALGORITHM_VERSION,
  };
}

/**
 * An explainable SM-2-derived scheduler. Stability is the current interval
 * capacity in days; difficulty (1–10) controls how quickly it grows. Overdue
 * successful reviews receive a bounded bonus instead of being punished.
 */
export function applyReviewRating(
  previous: ReviewState | undefined,
  rating: MasteryRating,
  now: string,
): ReviewState {
  const prior = previous ?? initialState(now);
  const nowTimestamp = safeTimestamp(now);
  const dueTimestamp = safeTimestamp(prior.nextReviewAt, nowTimestamp);
  const overdueDays = Math.max(0, (nowTimestamp - dueTimestamp) / DAY_MS);
  const overdueBonus = Math.min(
    REVIEW_CONFIG.overdueBonusCap,
    overdueDays / Math.max(1, prior.intervalDays || 1) / 4,
  );
  const priorEase = clamp(
    3 - prior.difficulty * 0.17,
    REVIEW_CONFIG.minimumEase,
    REVIEW_CONFIG.maximumEase,
  );

  let stability: number;
  let difficulty: number;
  let intervalDays: number;
  let nextReviewAt: string;
  let correctStreak: number;
  let lapses = prior.lapses;

  if (rating === "known") {
    const ease = clamp(
      priorEase + REVIEW_CONFIG.knownEaseBonus,
      REVIEW_CONFIG.minimumEase,
      REVIEW_CONFIG.maximumEase,
    );
    stability =
      prior.reviewCount === 0
        ? REVIEW_CONFIG.initialKnownDays
        : Math.max(
            REVIEW_CONFIG.initialKnownDays,
            prior.stability * ease * (1 + overdueBonus),
          );
    intervalDays = Math.max(1, Math.round(stability));
    nextReviewAt = addDays(now, intervalDays);
    difficulty = clamp(
      prior.difficulty - 0.35,
      REVIEW_CONFIG.minimumDifficulty,
      REVIEW_CONFIG.maximumDifficulty,
    );
    correctStreak = prior.correctStreak + 1;
  } else if (rating === "fuzzy") {
    stability = Math.max(0.75, prior.stability * 0.72 || 0.75);
    intervalDays = REVIEW_CONFIG.fuzzyIntervalDays;
    nextReviewAt = addDays(now, intervalDays);
    difficulty = clamp(
      prior.difficulty + 0.45,
      REVIEW_CONFIG.minimumDifficulty,
      REVIEW_CONFIG.maximumDifficulty,
    );
    correctStreak = 0;
  } else {
    stability = Math.max(0.08, prior.stability * 0.2);
    intervalDays = 0;
    nextReviewAt = addMilliseconds(
      now,
      REVIEW_CONFIG.unknownRetryMinutes * 60_000,
    );
    difficulty = clamp(
      prior.difficulty + 0.9,
      REVIEW_CONFIG.minimumDifficulty,
      REVIEW_CONFIG.maximumDifficulty,
    );
    correctStreak = 0;
    lapses += 1;
  }

  return {
    status: statusFor(rating, correctStreak),
    mastery: rating,
    firstStudiedAt: previous?.firstStudiedAt ?? now,
    lastStudiedAt: now,
    nextReviewAt,
    intervalDays,
    reviewCount: prior.reviewCount + 1,
    correctStreak,
    lapses,
    stability: Number(stability.toFixed(2)),
    difficulty: Number(difficulty.toFixed(2)),
    lastRating: rating,
    isNew: false,
    suspended: prior.suspended,
    algorithmVersion: REVIEW_ALGORITHM_VERSION,
  };
}

export function isReviewDue(state: ReviewState, nowTimestamp: number): boolean {
  return !state.suspended && safeTimestamp(state.nextReviewAt) <= nowTimestamp;
}

export function isReviewOverdue(
  state: ReviewState,
  startOfTodayTimestamp: number,
): boolean {
  return !state.suspended && safeTimestamp(state.nextReviewAt) < startOfTodayTimestamp;
}

export function reviewUrgency(state: ReviewState, nowTimestamp: number): number {
  if (state.suspended) return Number.NEGATIVE_INFINITY;
  const overdueHours = Math.max(
    0,
    (nowTimestamp - safeTimestamp(state.nextReviewAt, nowTimestamp)) / 3_600_000,
  );
  const masteryWeight =
    state.mastery === "unknown" ? 300 : state.mastery === "fuzzy" ? 200 : 100;
  return masteryWeight + Math.min(500, overdueHours);
}
