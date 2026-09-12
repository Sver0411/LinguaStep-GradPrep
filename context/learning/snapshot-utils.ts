/* eslint-disable @typescript-eslint/no-unused-vars */

import { GRAMMAR_POINTS } from "@/data/grammar";
import { WORD_PAIRS } from "@/data/words";
import { EMPTY_SNAPSHOT } from "@/lib/constants";
import { generateDailyPlan } from "@/lib/daily-plan";
import { dateKey } from "@/lib/learning";
import type { AppSettings, DailyPlan, LearningSnapshot } from "@/lib/models";
import { migrateLearningSnapshot } from "@/lib/repositories/migrations";

export function cloneEmptySnapshot(): LearningSnapshot {
  return migrateLearningSnapshot(EMPTY_SNAPSHOT);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isLearningSnapshot(value: unknown): boolean {
  return (
    isRecord(value) &&
    Array.isArray(value.wordProgress) &&
    Array.isArray(value.grammarProgress) &&
    Array.isArray(value.mistakes) &&
    Array.isArray(value.favorites) &&
    Array.isArray(value.testResults) &&
    Array.isArray(value.dailyRecords)
  );
}

export function equalValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function mergeKeyedChanges<T>(
  latest: T[],
  previous: T[],
  next: T[],
  keyOf: (item: T) => string,
): T[] {
  const previousMap = new Map(previous.map((item) => [keyOf(item), item]));
  const nextMap = new Map(next.map((item) => [keyOf(item), item]));
  const changedKeys = new Set<string>();
  nextMap.forEach((item, key) => {
    if (!equalValue(item, previousMap.get(key))) changedKeys.add(key);
  });
  previousMap.forEach((_item, key) => {
    if (!nextMap.has(key)) changedKeys.add(key);
  });
  return [
    ...latest.filter((item) => !changedKeys.has(keyOf(item))),
    ...[...changedKeys]
      .map((key) => nextMap.get(key))
      .filter((item): item is T => item !== undefined),
  ];
}

export function mergeDailyChanges(
  latest: LearningSnapshot["dailyRecords"],
  previous: LearningSnapshot["dailyRecords"],
  next: LearningSnapshot["dailyRecords"],
): LearningSnapshot["dailyRecords"] {
  const previousMap = new Map(previous.map((item) => [item.date, item]));
  const nextMap = new Map(next.map((item) => [item.date, item]));
  const latestMap = new Map(latest.map((item) => [item.date, item]));
  const fields = [
    "wordsStudied",
    "newWordsStudied",
    "reviewWordsStudied",
    "japaneseWordsStudied",
    "englishWordsStudied",
    "combinedWordsStudied",
    "grammarStudied",
    "japaneseGrammarStudied",
    "englishGrammarStudied",
    "questionsAnswered",
    "correctAnswers",
  ] as const;
  previousMap.forEach((_item, date) => {
    if (!nextMap.has(date)) latestMap.delete(date);
  });
  nextMap.forEach((nextItem, date) => {
    const previousItem = previousMap.get(date);
    if (equalValue(previousItem, nextItem)) return;
    const latestItem = latestMap.get(date);
    if (!latestItem) {
      latestMap.set(date, nextItem);
      return;
    }
    const merged = { ...latestItem };
    fields.forEach((field) => {
      const delta = (nextItem[field] ?? 0) - (previousItem?.[field] ?? 0);
      merged[field] = (latestItem[field] ?? 0) + delta;
    });
    latestMap.set(date, merged);
  });
  return [...latestMap.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function mergeSnapshotChange(
  latest: LearningSnapshot,
  previous: LearningSnapshot,
  next: LearningSnapshot,
): LearningSnapshot {
  const additions = next.favorites.filter(
    (favorite) => !previous.favorites.includes(favorite),
  );
  const removals = new Set(
    previous.favorites.filter((favorite) => !next.favorites.includes(favorite)),
  );
  return {
    wordProgress: mergeKeyedChanges(
      latest.wordProgress,
      previous.wordProgress,
      next.wordProgress,
      (item) => item.wordId,
    ),
    grammarProgress: mergeKeyedChanges(
      latest.grammarProgress,
      previous.grammarProgress,
      next.grammarProgress,
      (item) => item.grammarId,
    ),
    mistakes: mergeKeyedChanges(
      latest.mistakes,
      previous.mistakes,
      next.mistakes,
      (item) => item.id,
    ),
    favorites: [
      ...latest.favorites.filter((favorite) => !removals.has(favorite)),
      ...additions.filter((favorite) => !latest.favorites.includes(favorite)),
    ],
    testResults: mergeKeyedChanges(
      latest.testResults,
      previous.testResults,
      next.testResults,
      (item) => item.id,
    ),
    dailyRecords: mergeDailyChanges(
      latest.dailyRecords,
      previous.dailyRecords,
      next.dailyRecords,
    ),
    dailyPlans: mergeKeyedChanges(
      latest.dailyPlans,
      previous.dailyPlans,
      next.dailyPlans,
      (item) => item.date,
    ),
    aiWords: mergeKeyedChanges(latest.aiWords, previous.aiWords, next.aiWords, (item) => item.id),
    aiGrammar: mergeKeyedChanges(latest.aiGrammar, previous.aiGrammar, next.aiGrammar, (item) => item.id),
    aiComparisons: mergeKeyedChanges(latest.aiComparisons, previous.aiComparisons, next.aiComparisons, (item) => item.id),
    aiGenerations: mergeKeyedChanges(latest.aiGenerations, previous.aiGenerations, next.aiGenerations, (item) => item.id),
    aiUsage: mergeKeyedChanges(latest.aiUsage, previous.aiUsage, next.aiUsage, (item) => item.id),
    aiExplanations: mergeKeyedChanges(latest.aiExplanations, previous.aiExplanations, next.aiExplanations, (item) => item.id),
    aiCollections: mergeKeyedChanges(latest.aiCollections, previous.aiCollections, next.aiCollections, (item) => item.id),
    aiContentReports: mergeKeyedChanges(latest.aiContentReports, previous.aiContentReports, next.aiContentReports, (item) => item.id),
  };
}

export function removeAIContentFromSnapshot(
  snapshot: LearningSnapshot,
  keys: readonly string[],
): LearningSnapshot {
  const removed = new Set(keys);
  const removedWordIds = new Set(
    keys.filter((key) => key.startsWith("word:")).map((key) => key.slice(5)),
  );
  const removedGrammarIds = new Set(
    keys.filter((key) => key.startsWith("grammar:")).map((key) => key.slice(8)),
  );
  const removedComparisonIds = new Set(
    keys.filter((key) => key.startsWith("comparison:")).map((key) => key.slice(11)),
  );
  const removedSourceIds = new Set([
    ...removedWordIds,
    ...removedGrammarIds,
    ...removedComparisonIds,
  ]);
  return {
    ...snapshot,
    aiWords: snapshot.aiWords.filter((item) => !removedWordIds.has(item.id)),
    aiGrammar: snapshot.aiGrammar.filter((item) => !removedGrammarIds.has(item.id)),
    aiComparisons: snapshot.aiComparisons.filter(
      (item) => !removedComparisonIds.has(item.id),
    ),
    wordProgress: snapshot.wordProgress.filter(
      (item) => !removedWordIds.has(item.wordId),
    ),
    grammarProgress: snapshot.grammarProgress.filter(
      (item) => !removedGrammarIds.has(item.grammarId),
    ),
    favorites: snapshot.favorites.filter((item) => !removed.has(item)),
    mistakes: snapshot.mistakes.filter(
      (item) => !removedSourceIds.has(item.contentRef.sourceId),
    ),
    aiCollections: snapshot.aiCollections
      .map((collection) => ({
        ...collection,
        questions: collection.questions.filter(
          (question) => !removedSourceIds.has(question.sourceId),
        ),
      }))
      .filter((collection) => collection.questions.length > 0),
    aiContentReports: snapshot.aiContentReports.filter(
      (report) => !removedSourceIds.has(report.contentId),
    ),
    aiGenerations: snapshot.aiGenerations.map((generation) => ({
      ...generation,
      contentIds: generation.contentIds.filter(
        (contentId) => !removedSourceIds.has(contentId),
      ),
    })),
  };
}

export function restrictSnapshotToActiveVocabulary(
  snapshot: LearningSnapshot,
  today = dateKey(new Date()),
): LearningSnapshot {
  const activeWordIds = new Set(WORD_PAIRS.map((word) => word.id));
  const wordProgress = snapshot.wordProgress.filter((item) =>
    activeWordIds.has(item.wordId),
  );
  const favorites = snapshot.favorites.filter(
    (item) => !item.startsWith("word:") || activeWordIds.has(item.slice(5)),
  );
  const mistakes = snapshot.mistakes.filter(
    (item) =>
      item.contentRef.source !== "word" ||
      item.contentRef.sourceId.startsWith("exam-") ||
      activeWordIds.has(item.contentRef.sourceId),
  );
  const mistakeIds = new Set(mistakes.map((item) => item.id));
  const dailyPlans = snapshot.dailyPlans
    .filter((plan) => {
      if (plan.date !== today) return true;
      return [...plan.newWordIds, ...plan.reviewWordIds, ...plan.overdueWordIds]
        .every((id) => activeWordIds.has(id));
    })
    .map((plan) => ({
      ...plan,
      newWordIds: plan.newWordIds.filter((id) => activeWordIds.has(id)),
      reviewWordIds: plan.reviewWordIds.filter((id) => activeWordIds.has(id)),
      overdueWordIds: plan.overdueWordIds.filter((id) => activeWordIds.has(id)),
      mistakeIds: plan.mistakeIds.filter((id) => mistakeIds.has(id)),
    }));
  return {
    ...snapshot,
    wordProgress,
    favorites,
    mistakes,
    dailyPlans,
  };
}

export type SnapshotCollection = keyof LearningSnapshot;

export const SNAPSHOT_COLLECTION_KEYS = [
  "wordProgress",
  "grammarProgress",
  "mistakes",
  "favorites",
  "testResults",
  "dailyRecords",
  "dailyPlans",
  "aiWords",
  "aiGrammar",
  "aiComparisons",
  "aiGenerations",
  "aiUsage",
  "aiExplanations",
  "aiCollections",
  "aiContentReports",
] as const satisfies readonly SnapshotCollection[];

/**
 * mergeKeyedChanges reuses the element references of anything it did not
 * change, so a reference walk tells us exactly which IndexedDB stores have to
 * be rewritten. Rating one card only touches wordProgress and dailyRecords;
 * rewriting all fifteen stores on every keystroke made the session slower the
 * more the user had learned.
 */
export function changedCollections(
  latest: LearningSnapshot,
  merged: LearningSnapshot,
): SnapshotCollection[] {
  return SNAPSHOT_COLLECTION_KEYS.filter((key) => {
    const before = latest[key] as readonly unknown[];
    const after = merged[key] as readonly unknown[];
    if (before === after) return false;
    if (before.length !== after.length) return true;
    return before.some((item, index) => item !== after[index]);
  }) as SnapshotCollection[];
}

export function pickCollections(
  snapshot: LearningSnapshot,
  keys: readonly SnapshotCollection[],
): Partial<LearningSnapshot> {
  const patch: Partial<LearningSnapshot> = {};
  keys.forEach((key) => {
    (patch as Record<string, unknown>)[key] = snapshot[key];
  });
  return patch;
}

export function applyTheme(settings: AppSettings): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const update = () => {
    const resolved =
      settings.theme === "system"
        ? media.matches
          ? "dark"
          : "light"
        : settings.theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.animations =
      settings.animations && !settings.reduceMotion ? "on" : "off";
    document.documentElement.dataset.fontSize = settings.fontSize;
    document.documentElement.style.colorScheme = resolved;
  };
  update();
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}

export function createPlan(
  snapshot: LearningSnapshot,
  settings: AppSettings,
  now = new Date(),
): DailyPlan {
  return generateDailyPlan({
    date: dateKey(now),
    now: now.toISOString(),
    settings,
    words: WORD_PAIRS,
    grammar: [...GRAMMAR_POINTS, ...snapshot.aiGrammar],
    wordProgress: snapshot.wordProgress,
    grammarProgress: snapshot.grammarProgress,
    mistakes: snapshot.mistakes,
    previousPlans: snapshot.dailyPlans,
  });
}
