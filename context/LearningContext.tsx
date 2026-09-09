"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GRAMMAR_POINTS } from "@/data/grammar";
import { GRAMMAR_COMPARISONS } from "@/data/grammar-comparisons";
import { WORD_PAIRS } from "@/data/words";
import { APP_NAME, APP_VERSION, DEFAULT_SETTINGS, EMPTY_SNAPSHOT } from "@/lib/constants";
import { generateDailyPlan } from "@/lib/daily-plan";
import {
  dateKey,
  isAnswerCorrect,
  updateDailyRecord,
  updateGrammarProgress,
  updateMistakeRecord,
  updateWordMastery,
} from "@/lib/learning";
import type {
  AppSettings,
  DailyPlan,
  GrammarProgress,
  GrammarComparison,
  GrammarPoint,
  LearningSnapshot,
  MasteryRating,
  MistakeRecord,
  MistakeState,
  QuestionSource,
  StudyMode,
  TestAnswer,
  TestMode,
  TestResult,
  TestSourceFilter,
  WordProgress,
  WordPair,
} from "@/lib/models";
import {
  IndexedDbLearningRepository,
  isIndexedDbSupported,
  LocalStorageSettingsRepository,
  MemoryLearningRepository,
  type LearningRepository,
  type SettingsRepository,
} from "@/lib/repositories";
import { migrateLearningSnapshot } from "@/lib/repositories/migrations";
import {
  appendAIArtifacts,
  type AIArtifactBatch,
} from "@/lib/ai/client/artifact-library";

export type { AIArtifactBatch } from "@/lib/ai/client/artifact-library";

export type ResetScope =
  | "progress"
  | "tests"
  | "mistakes"
  | "favorites"
  | "all";
type FavoriteKind = "word" | "grammar" | "comparison";
export type AIClearScope = "history" | "explanations" | "content" | "all";

export interface BackupPayload {
  app: string;
  version: string;
  exportedAt: string;
  settings: AppSettings;
  snapshot: LearningSnapshot;
}

export interface BackupImportResult {
  ok: boolean;
  message: string;
}

const DATA_LOCK_NAME = "lingua-step:data-write";
const SYNC_CHANNEL_NAME = "lingua-step:data-sync";

interface CompleteTestOptions {
  mode: TestMode;
  sourceFilter: TestSourceFilter;
  startedAt: string;
}

interface LearningContextValue {
  snapshot: LearningSnapshot;
  settings: AppSettings;
  allWords: WordPair[];
  allGrammar: GrammarPoint[];
  allComparisons: GrammarComparison[];
  ready: boolean;
  storageDegraded: boolean;
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
  studyWord: (
    wordId: string,
    rating: MasteryRating,
    mode?: StudyMode,
  ) => Promise<WordProgress>;
  completeGrammar: (
    grammarId: string,
    answers: TestAnswer[],
  ) => Promise<GrammarProgress>;
  completeTest: (
    answers: TestAnswer[],
    options?: Partial<CompleteTestOptions>,
  ) => Promise<TestResult>;
  answerMistake: (
    mistakeId: string,
    selectedIndex: number,
  ) => Promise<MistakeRecord | null>;
  setMistakeState: (mistakeId: string, state: MistakeState) => Promise<void>;
  removeMistake: (mistakeId: string) => Promise<void>;
  toggleMistakeFavorite: (mistakeId: string) => Promise<void>;
  toggleFavorite: (kind: FavoriteKind, id: string) => Promise<void>;
  removeFavorites: (keys: readonly string[]) => Promise<void>;
  isFavorite: (kind: FavoriteKind, id: string) => boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  rebuildTodayPlan: () => Promise<DailyPlan>;
  saveAIArtifacts: (batch: AIArtifactBatch) => Promise<void>;
  removeAIContent: (keys: readonly string[]) => Promise<void>;
  undoAIGeneration: (generationId: string) => Promise<void>;
  removeAIGeneration: (generationId: string, removeContent?: boolean) => Promise<void>;
  clearAIData: (scope: AIClearScope) => Promise<void>;
  resetData: (scope: ResetScope) => Promise<void>;
  exportBackup: () => string;
  importBackup: (raw: string) => Promise<BackupImportResult>;
}

const LearningContext = createContext<LearningContextValue | null>(null);

function cloneEmptySnapshot(): LearningSnapshot {
  return migrateLearningSnapshot(EMPTY_SNAPSHOT);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLearningSnapshot(value: unknown): boolean {
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

function equalValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeKeyedChanges<T>(
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

function mergeDailyChanges(
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

function mergeSnapshotChange(
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

function removeAIContentFromSnapshot(
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

function restrictSnapshotToActiveVocabulary(
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

type SnapshotCollection = keyof LearningSnapshot;

const SNAPSHOT_COLLECTION_KEYS = [
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
function changedCollections(
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

function pickCollections(
  snapshot: LearningSnapshot,
  keys: readonly SnapshotCollection[],
): Partial<LearningSnapshot> {
  const patch: Partial<LearningSnapshot> = {};
  keys.forEach((key) => {
    (patch as Record<string, unknown>)[key] = snapshot[key];
  });
  return patch;
}

async function withDataLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(DATA_LOCK_NAME, () => task());
  }
  return task();
}

function applyTheme(settings: AppSettings): () => void {
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

function createPlan(
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

export function LearningProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<LearningSnapshot>(EMPTY_SNAPSHOT);
  const snapshotRef = useRef<LearningSnapshot>(EMPTY_SNAPSHOT);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [storageDegraded, setStorageDegraded] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const repositoryRef = useRef<LearningRepository | null>(null);
  const settingsRepositoryRef = useRef<SettingsRepository | null>(null);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    syncChannelRef.current = channel;
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (
        isRecord(event.data) &&
        event.data.type === "snapshot" &&
        isLearningSnapshot(event.data.snapshot)
      ) {
        const migrated = restrictSnapshotToActiveVocabulary(
          migrateLearningSnapshot(event.data.snapshot),
        );
        snapshotRef.current = migrated;
        setSnapshot(migrated);
        if (repositoryRef.current instanceof MemoryLearningRepository) {
          void repositoryRef.current.saveSnapshot(migrated);
        }
      }
    };
    return () => {
      channel.close();
      syncChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      const settingsRepository = new LocalStorageSettingsRepository();
      settingsRepositoryRef.current = settingsRepository;
      const storedSettings = settingsRepository.get();
      settingsRef.current = storedSettings;
      if (!cancelled) setSettings(storedSettings);
      let repository: LearningRepository;
      try {
        if (!isIndexedDbSupported()) throw new Error("IndexedDB unavailable");
        repository = new IndexedDbLearningRepository();
        const migrated = migrateLearningSnapshot(await repository.getSnapshot());
        let stored = restrictSnapshotToActiveVocabulary(migrated);
        const today = dateKey(new Date());
        if (!stored.dailyPlans.some((plan) => plan.date === today)) {
          stored = { ...stored, dailyPlans: [...stored.dailyPlans, createPlan(stored, storedSettings)] };
        }
        if (!equalValue(migrated, stored)) await repository.saveSnapshot(stored);
        if (cancelled) return;
        repositoryRef.current = repository;
        snapshotRef.current = stored;
        setSnapshot(stored);
      } catch {
        repository = new MemoryLearningRepository();
        if (cancelled) return;
        const empty = cloneEmptySnapshot();
        const withPlan = { ...empty, dailyPlans: [createPlan(empty, storedSettings)] };
        await repository.saveSnapshot(withPlan);
        repositoryRef.current = repository;
        snapshotRef.current = withPlan;
        setSnapshot(withPlan);
        setStorageDegraded(true);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => applyTheme(settings), [settings]);

  const persistSnapshot = useCallback(async (next: LearningSnapshot) => {
    const previous = snapshotRef.current;
    let saved = restrictSnapshotToActiveVocabulary(migrateLearningSnapshot(next));
    try {
      const repository = repositoryRef.current;
      if (repository) {
        saved = await withDataLock(async () => {
          const latest = migrateLearningSnapshot(await repository.getSnapshot());
          const merged = mergeSnapshotChange(latest, previous, saved);
          const changed = changedCollections(latest, merged);
          if (changed.length === 0) return merged;
          if (changed.length >= SNAPSHOT_COLLECTION_KEYS.length) {
            await repository.saveSnapshot(merged);
          } else {
            await repository.saveSnapshotPatch(pickCollections(merged, changed));
          }
          return merged;
        });
      }
    } catch {
      repositoryRef.current = new MemoryLearningRepository(saved);
      setStorageDegraded(true);
    }
    snapshotRef.current = saved;
    setSnapshot(saved);
    syncChannelRef.current?.postMessage({ type: "snapshot", snapshot: saved });
  }, []);

  const rebuildTodayPlan = useCallback(async () => {
    const current = snapshotRef.current;
    const plan = createPlan(current, settingsRef.current);
    await persistSnapshot({
      ...current,
      dailyPlans: [
        ...current.dailyPlans.filter((item) => item.date !== plan.date),
        plan,
      ],
    });
    return plan;
  }, [persistSnapshot]);

  useEffect(() => {
    if (!ready) return;
    const ensurePlan = () => {
      const current = snapshotRef.current;
      const today = dateKey(new Date());
      if (!current.dailyPlans.some((plan) => plan.date === today)) {
        void rebuildTodayPlan();
      }
    };
    ensurePlan();
    const timer = window.setInterval(ensurePlan, 60_000);
    return () => window.clearInterval(timer);
  }, [ready, rebuildTodayPlan]);

  const studyWord = useCallback(
    async (
      wordId: string,
      rating: MasteryRating,
      mode: StudyMode = settingsRef.current.defaultStudyMode,
    ) => {
      const nowDate = new Date();
      const now = nowDate.toISOString();
      const current = snapshotRef.current;
      const previous = current.wordProgress.find((item) => item.wordId === wordId);
      const wasNew = !previous?.modes[mode];
      const progress = updateWordMastery(previous, wordId, rating, now, mode);
      const modeField =
        mode === "japanese"
          ? { japaneseWordsStudied: 1 }
          : mode === "english"
            ? { englishWordsStudied: 1 }
            : { combinedWordsStudied: 1 };
      const next: LearningSnapshot = {
        ...current,
        wordProgress: [
          ...current.wordProgress.filter((item) => item.wordId !== wordId),
          progress,
        ],
        dailyRecords: updateDailyRecord(current.dailyRecords, dateKey(nowDate), {
          wordsStudied: 1,
          ...(wasNew ? { newWordsStudied: 1 } : { reviewWordsStudied: 1 }),
          ...modeField,
        }),
      };
      await persistSnapshot(next);
      return progress;
    },
    [persistSnapshot],
  );

  const applyAnswersToMistakes = useCallback(
    (currentMistakes: MistakeRecord[], answers: TestAnswer[], now: string) => {
      let mistakes = [...currentMistakes];
      answers.forEach((answer) => {
        const existing = mistakes.find(
          (item) => item.question.id === answer.question.id,
        );
        const updated = updateMistakeRecord(
          existing,
          answer.question,
          answer.selectedIndex,
          now,
          settingsRef.current.masteryStreak,
        );
        if (updated) {
          mistakes = [
            ...mistakes.filter((item) => item.id !== updated.id),
            updated,
          ];
        }
      });
      return mistakes;
    },
    [],
  );

  const completeGrammar = useCallback(
    async (grammarId: string, answers: TestAnswer[]) => {
      const nowDate = new Date();
      const now = nowDate.toISOString();
      const current = snapshotRef.current;
      const normalizedAnswers = answers.map((answer) => ({
        ...answer,
        isCorrect: isAnswerCorrect(answer.question, answer.selectedIndex),
      }));
      const correct = normalizedAnswers.filter((answer) => answer.isCorrect).length;
      const previous = current.grammarProgress.find(
        (item) => item.grammarId === grammarId,
      );
      const progress = updateGrammarProgress(
        previous,
        grammarId,
        correct,
        normalizedAnswers.length,
        now,
      );
      const point = [...GRAMMAR_POINTS, ...current.aiGrammar].find(
        (item) => item.id === grammarId,
      );
      const languageDelta =
        point?.language === "english"
          ? { englishGrammarStudied: 1 }
          : { japaneseGrammarStudied: 1 };
      const next: LearningSnapshot = {
        ...current,
        grammarProgress: [
          ...current.grammarProgress.filter((item) => item.grammarId !== grammarId),
          progress,
        ],
        mistakes: applyAnswersToMistakes(
          current.mistakes,
          normalizedAnswers,
          now,
        ),
        dailyRecords: updateDailyRecord(current.dailyRecords, dateKey(nowDate), {
          grammarStudied: 1,
          questionsAnswered: normalizedAnswers.length,
          correctAnswers: correct,
          ...languageDelta,
        }),
      };
      await persistSnapshot(next);
      return progress;
    },
    [applyAnswersToMistakes, persistSnapshot],
  );

  const completeTest = useCallback(
    async (answers: TestAnswer[], options: Partial<CompleteTestOptions> = {}) => {
      const completedDate = new Date();
      const completedAt = completedDate.toISOString();
      const startedAt = options.startedAt ?? completedAt;
      const normalizedAnswers = answers.map((answer) => ({
        ...answer,
        isCorrect: isAnswerCorrect(answer.question, answer.selectedIndex),
      }));
      const correctCount = normalizedAnswers.filter(
        (answer) => answer.isCorrect,
      ).length;
      const result: TestResult = {
        id: `test-${completedDate.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        mode: options.mode ?? "mixed",
        sourceFilter: options.sourceFilter ?? "all-learned",
        answers: normalizedAnswers,
        correctCount,
        startedAt,
        completedAt,
        durationSeconds: Math.max(
          0,
          Math.round(
            (completedDate.getTime() - new Date(startedAt).getTime()) / 1000,
          ),
        ),
      };
      const current = snapshotRef.current;
      const next: LearningSnapshot = {
        ...current,
        mistakes: applyAnswersToMistakes(
          current.mistakes,
          normalizedAnswers,
          completedAt,
        ),
        testResults: [...current.testResults, result],
        dailyRecords: updateDailyRecord(
          current.dailyRecords,
          dateKey(completedDate),
          {
            questionsAnswered: normalizedAnswers.length,
            correctAnswers: correctCount,
          },
        ),
      };
      await persistSnapshot(next);
      return result;
    },
    [applyAnswersToMistakes, persistSnapshot],
  );

  const answerMistake = useCallback(
    async (mistakeId: string, selectedIndex: number) => {
      const current = snapshotRef.current;
      const existing = current.mistakes.find((item) => item.id === mistakeId);
      if (!existing) return null;
      const nowDate = new Date();
      const now = nowDate.toISOString();
      const updated = updateMistakeRecord(
        existing,
        existing.question,
        selectedIndex,
        now,
        settingsRef.current.masteryStreak,
      );
      if (!updated) return null;
      const correct = isAnswerCorrect(existing.question, selectedIndex);
      await persistSnapshot({
        ...current,
        mistakes: [
          ...current.mistakes.filter((item) => item.id !== mistakeId),
          updated,
        ],
        dailyRecords: updateDailyRecord(current.dailyRecords, dateKey(nowDate), {
          questionsAnswered: 1,
          correctAnswers: correct ? 1 : 0,
        }),
      });
      return updated;
    },
    [persistSnapshot],
  );

  const setMistakeState = useCallback(
    async (mistakeId: string, state: MistakeState) => {
      const current = snapshotRef.current;
      await persistSnapshot({
        ...current,
        mistakes: current.mistakes.map((mistake) =>
          mistake.id === mistakeId
            ? {
                ...mistake,
                state,
                active: state === "active" || state === "consolidating",
                correctStreak: state === "active" ? 0 : mistake.correctStreak,
              }
            : mistake,
        ),
      });
    },
    [persistSnapshot],
  );

  const removeMistake = useCallback(
    async (mistakeId: string) => {
      const current = snapshotRef.current;
      await persistSnapshot({
        ...current,
        mistakes: current.mistakes.filter((item) => item.id !== mistakeId),
      });
    },
    [persistSnapshot],
  );

  const toggleMistakeFavorite = useCallback(
    async (mistakeId: string) => {
      const current = snapshotRef.current;
      await persistSnapshot({
        ...current,
        mistakes: current.mistakes.map((mistake) =>
          mistake.id === mistakeId
            ? { ...mistake, favorite: !mistake.favorite }
            : mistake,
        ),
      });
    },
    [persistSnapshot],
  );

  const toggleFavorite = useCallback(
    async (kind: FavoriteKind, id: string) => {
      const key = `${kind}:${id}`;
      const current = snapshotRef.current;
      const exists = current.favorites.includes(key);
      await persistSnapshot({
        ...current,
        favorites: exists
          ? current.favorites.filter((item) => item !== key)
          : [...current.favorites, key],
      });
    },
    [persistSnapshot],
  );

  const removeFavorites = useCallback(
    async (keys: readonly string[]) => {
      const remove = new Set(keys);
      const current = snapshotRef.current;
      await persistSnapshot({
        ...current,
        favorites: current.favorites.filter((item) => !remove.has(item)),
      });
    },
    [persistSnapshot],
  );

  const isFavorite = useCallback(
    (kind: FavoriteKind, id: string) =>
      snapshot.favorites.includes(`${kind}:${id}`),
    [snapshot.favorites],
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      settingsRef.current = next;
      settingsRepositoryRef.current?.save(next);
      return next;
    });
  }, []);

  const saveAIArtifacts = useCallback(
    async (batch: AIArtifactBatch) => {
      const current = snapshotRef.current;
      await persistSnapshot(appendAIArtifacts(current, batch));
    },
    [persistSnapshot],
  );

  const removeAIContent = useCallback(
    async (keys: readonly string[]) => {
      await persistSnapshot(removeAIContentFromSnapshot(snapshotRef.current, keys));
    },
    [persistSnapshot],
  );

  const undoAIGeneration = useCallback(
    async (generationId: string) => {
      const current = snapshotRef.current;
      const keys = [
        ...current.aiWords.filter((item) => item.aiMetadata?.generationId === generationId).map((item) => `word:${item.id}`),
        ...current.aiGrammar.filter((item) => item.aiMetadata?.generationId === generationId).map((item) => `grammar:${item.id}`),
        ...current.aiComparisons.filter((item) => item.aiMetadata?.generationId === generationId).map((item) => `comparison:${item.id}`),
      ];
      const withoutContent = removeAIContentFromSnapshot(current, keys);
      await persistSnapshot({
        ...withoutContent,
        aiGenerations: withoutContent.aiGenerations.map((item) =>
          item.id === generationId
            ? { ...item, saveMode: "temporary", contentIds: [] }
            : item,
        ),
      });
    },
    [persistSnapshot],
  );

  const removeAIGeneration = useCallback(
    async (generationId: string, removeContent = false) => {
      const current = snapshotRef.current;
      const generation = current.aiGenerations.find((item) => item.id === generationId);
      const keys = removeContent
        ? [
            ...current.aiWords.filter((item) => item.aiMetadata?.generationId === generationId).map((item) => `word:${item.id}`),
            ...current.aiGrammar.filter((item) => item.aiMetadata?.generationId === generationId).map((item) => `grammar:${item.id}`),
            ...current.aiComparisons.filter((item) => item.aiMetadata?.generationId === generationId).map((item) => `comparison:${item.id}`),
          ]
        : [];
      const next = removeAIContentFromSnapshot(current, keys);
      await persistSnapshot({
        ...next,
        aiGenerations: next.aiGenerations.filter((item) => item.id !== generationId),
        aiUsage: generation?.usageId
          ? next.aiUsage.filter((item) => item.id !== generation.usageId)
          : next.aiUsage,
      });
    },
    [persistSnapshot],
  );

  const clearAIData = useCallback(
    async (scope: AIClearScope) => {
      const current = snapshotRef.current;
      const contentKeys = [
        ...current.aiWords.map((item) => `word:${item.id}`),
        ...current.aiGrammar.map((item) => `grammar:${item.id}`),
        ...current.aiComparisons.map((item) => `comparison:${item.id}`),
      ];
      const base = scope === "content" || scope === "all"
        ? removeAIContentFromSnapshot(current, contentKeys)
        : current;
      await persistSnapshot({
        ...base,
        aiGenerations:
          scope === "history" || scope === "all" ? [] : base.aiGenerations,
        aiUsage: scope === "history" || scope === "all" ? [] : base.aiUsage,
        aiExplanations:
          scope === "explanations" || scope === "all" ? [] : base.aiExplanations,
        aiCollections: scope === "content" || scope === "all" ? [] : base.aiCollections,
        aiContentReports: scope === "content" || scope === "all" ? [] : base.aiContentReports,
      });
    },
    [persistSnapshot],
  );

  const resetData = useCallback(
    async (scope: ResetScope) => {
      let next = cloneEmptySnapshot();
      try {
        const repository = repositoryRef.current;
        if (repository) {
          next = await withDataLock(async () => {
            if (scope === "progress") await repository.resetLearningProgress();
            else if (scope === "tests") await repository.resetTests();
            else if (scope === "mistakes") await repository.resetMistakes();
            else if (scope === "favorites") await repository.resetFavorites();
            else await repository.resetAllData();
            return migrateLearningSnapshot(await repository.getSnapshot());
          });
        }
      } catch {
        const current = snapshotRef.current;
        next =
          scope === "progress"
            ? {
                ...current,
                wordProgress: [],
                grammarProgress: [],
                testResults: [],
                dailyRecords: [],
                dailyPlans: [],
              }
            : scope === "tests"
              ? { ...current, testResults: [] }
              : scope === "mistakes"
                ? { ...current, mistakes: [] }
                : scope === "favorites"
                  ? { ...current, favorites: [] }
                  : cloneEmptySnapshot();
        repositoryRef.current = new MemoryLearningRepository(next);
        setStorageDegraded(true);
      }
      if (scope === "all") {
        settingsRepositoryRef.current?.reset();
        settingsRef.current = DEFAULT_SETTINGS;
        setSettings(DEFAULT_SETTINGS);
      }
      if (!next.dailyPlans.some((plan) => plan.date === dateKey(new Date()))) {
        next = { ...next, dailyPlans: [...next.dailyPlans, createPlan(next, settingsRef.current)] };
        await repositoryRef.current?.saveSnapshot(next);
      }
      snapshotRef.current = next;
      setSnapshot(next);
      syncChannelRef.current?.postMessage({ type: "snapshot", snapshot: next });
    },
    [],
  );

  /**
   * Restoring a backup must replace, not merge: the user is asking to go back
   * to a known state, so persistSnapshot's merge semantics would resurrect
   * records the backup deliberately no longer contains.
   */
  const restoreSnapshot = useCallback(async (next: LearningSnapshot) => {
    const saved = restrictSnapshotToActiveVocabulary(
      migrateLearningSnapshot(next),
    );
    try {
      const repository = repositoryRef.current;
      if (repository) {
        await withDataLock(async () => {
          await repository.saveSnapshot(saved);
        });
      }
    } catch {
      repositoryRef.current = new MemoryLearningRepository(saved);
      setStorageDegraded(true);
    }
    snapshotRef.current = saved;
    setSnapshot(saved);
    syncChannelRef.current?.postMessage({ type: "snapshot", snapshot: saved });
  }, []);

  const exportBackup = useCallback(() => {
    const payload: BackupPayload = {
      app: APP_NAME,
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      settings: settingsRef.current,
      snapshot: snapshotRef.current,
    };
    return JSON.stringify(payload, null, 2);
  }, []);

  const importBackup = useCallback(async (raw: string): Promise<BackupImportResult> => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, message: "文件不是有效的 JSON。" };
    }
    if (
      !isRecord(parsed) ||
      !isLearningSnapshot(parsed.snapshot) ||
      !isRecord(parsed.settings)
    ) {
      return { ok: false, message: "文件结构不符合 LinguaStep 备份格式。" };
    }
    const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings as Partial<AppSettings>) };
    settingsRef.current = settings;
    settingsRepositoryRef.current?.save(settings);
    setSettings(settings);
    await restoreSnapshot(parsed.snapshot as LearningSnapshot);
    return {
      ok: true,
      message: "备份已恢复，学习进度和设置已替换为文件中的内容。",
    };
  }, [restoreSnapshot]);

  const value = useMemo<LearningContextValue>(
    () => ({
      snapshot,
      settings,
      allWords: WORD_PAIRS,
      allGrammar: [...GRAMMAR_POINTS, ...snapshot.aiGrammar],
      allComparisons: [...GRAMMAR_COMPARISONS, ...snapshot.aiComparisons],
      ready,
      storageDegraded,
      focusMode,
      setFocusMode,
      studyWord,
      completeGrammar,
      completeTest,
      answerMistake,
      setMistakeState,
      removeMistake,
      toggleMistakeFavorite,
      toggleFavorite,
      removeFavorites,
      isFavorite,
      updateSettings,
      rebuildTodayPlan,
      saveAIArtifacts,
      removeAIContent,
      undoAIGeneration,
      removeAIGeneration,
      clearAIData,
      resetData,
      exportBackup,
      importBackup,
    }),
    [
      snapshot,
      settings,
      ready,
      storageDegraded,
      focusMode,
      studyWord,
      completeGrammar,
      completeTest,
      answerMistake,
      setMistakeState,
      removeMistake,
      toggleMistakeFavorite,
      toggleFavorite,
      removeFavorites,
      isFavorite,
      updateSettings,
      rebuildTodayPlan,
      saveAIArtifacts,
      removeAIContent,
      undoAIGeneration,
      removeAIGeneration,
      clearAIData,
      resetData,
      exportBackup,
      importBackup,
    ],
  );

  return (
    <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
  );
}

export function useLearning(): LearningContextValue {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error("useLearning must be used within LearningProvider");
  }
  return context;
}

export function mistakeCategory(source: QuestionSource): string {
  if (source === "comparison") return "日英对比";
  return source === "grammar" ? "语法" : "单词";
}
