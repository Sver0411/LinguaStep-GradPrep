import { createEmptyCard, fsrs, Rating, State, type Card } from "ts-fsrs";
import { z } from "zod";
import type { MasteryRating, ReviewState, StudyMode, WordQuizDirection, WordQuizMemory } from "./models";

const day = 86_400_000;
const isoDate = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const count = z.number().int().nonnegative();
const direction = z.enum(["ja-en", "en-ja", "ja-zh", "en-zh"]);
const memorySchema = z.object({
  model: z.literal("FSRS-6"),
  card: z.object({
    due: isoDate, stability: z.number().min(0).max(36500), difficulty: z.number().min(0).max(10),
    elapsed_days: z.number().nonnegative(), scheduled_days: z.number().nonnegative(),
    learning_steps: count, reps: count, lapses: count, state: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), last_review: isoDate.optional(),
  }),
  attempts: count, correct: count, spacedCorrectStreak: count,
  successfulDirections: z.array(direction).max(4), lastDirection: direction,
});
export function normalizeQuizMemory(value: unknown): WordQuizMemory | undefined {
  const result = memorySchema.safeParse(value);
  return result.success ? result.data : undefined;
}

// Default FSRS-6 parameters; no optimizer is claimed without sufficient personal history.
const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: false, maximum_interval: 36500 });
export function applyWordQuizAnswer(previous: ReviewState | undefined, correct: boolean, direction: WordQuizDirection, mode: StudyMode, now: string): ReviewState {
  const prior = normalizeQuizMemory(previous?.quizMemory);
  const date = new Date(now);
  // Old self-ratings stay in history, but do not become invented objective successes.
  const card = prior?.card ?? createEmptyCard<Card>(date);
  const next = scheduler.next(card, date, correct ? Rating.Good : Rating.Again).card;
  const gapDays = prior?.card.last_review ? Math.max(0, (date.getTime() - Date.parse(prior.card.last_review)) / day) : 0;
  const spacedCorrectStreak = !correct ? 0 : (prior?.spacedCorrectStreak ?? 0) + Number(gapDays >= 1);
  const successfulDirections = correct ? [...new Set([...(prior?.successfulDirections ?? []), direction])] : [];
  const bothDirections = mode !== "combined" || (successfulDirections.includes("ja-en") && successfulDirections.includes("en-ja"));
  // Product mastery gate, separate from FSRS: repeated choices in one sitting cannot mark mastery.
  const mastered = correct && spacedCorrectStreak >= 3 && next.stability >= 21 && bothDirections;
  const quizMemory: WordQuizMemory = {
    model: "FSRS-6", card: { ...next, due: next.due.toISOString(), last_review: next.last_review?.toISOString() },
    attempts: (prior?.attempts ?? 0) + 1, correct: (prior?.correct ?? 0) + Number(correct),
    spacedCorrectStreak, successfulDirections, lastDirection: direction,
  };
  const rating: MasteryRating = correct ? "known" : "unknown";
  return {
    quizMemory,
    recallHistory: [...(previous?.recallHistory ?? []), { at: now, rating, gapDays, method: "choice" as const }].slice(-400),
    status: mastered ? "mastered" : next.state === State.Learning || next.state === State.Relearning ? "learning" : "review",
    mastery: rating, lastRating: rating, firstStudiedAt: previous?.firstStudiedAt ?? now,
    lastStudiedAt: now, nextReviewAt: next.due.toISOString(),
    intervalDays: Math.max(0, (next.due.getTime() - date.getTime()) / day),
    reviewCount: (previous?.reviewCount ?? 0) + 1, correctStreak: spacedCorrectStreak,
    lapses: (previous?.lapses ?? 0) + Number(!correct), stability: next.stability, difficulty: next.difficulty,
    isNew: false, suspended: false, algorithmVersion: 3,
  };
}
