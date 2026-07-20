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
import { WORD_PAIRS } from "@/data/words";
import { DEFAULT_SETTINGS, EMPTY_SNAPSHOT } from "@/lib/constants";
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

export type ResetScope =
  | "progress"
  | "tests"
  | "mistakes"
  | "favorites"
  | "all";
type FavoriteKind = "word" | "grammar" | "comparison";
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
  resetData: (scope: ResetScope) => Promise<void>;
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
  };
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
    grammar: GRAMMAR_POINTS,
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
        const migrated = migrateLearningSnapshot(event.data.snapshot);
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
        let stored = migrateLearningSnapshot(await repository.getSnapshot());
        const today = dateKey(new Date());
        if (!stored.dailyPlans.some((plan) => plan.date === today)) {
          stored = { ...stored, dailyPlans: [...stored.dailyPlans, createPlan(stored, storedSettings)] };
          await repository.saveSnapshot(stored);
        }
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

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const persistSnapshot = useCallback(async (next: LearningSnapshot) => {
    const previous = snapshotRef.current;
    let saved = migrateLearningSnapshot(next);
    try {
      const repository = repositoryRef.current;
      if (repository) {
        saved = await withDataLock(async () => {
          const latest = migrateLearningSnapshot(await repository.getSnapshot());
          const merged = mergeSnapshotChange(latest, previous, saved);
          await repository.saveSnapshot(merged);
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
      const point = GRAMMAR_POINTS.find((item) => item.id === grammarId);
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

  const value = useMemo<LearningContextValue>(
    () => ({
      snapshot,
      settings,
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
      resetData,
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
      resetData,
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
