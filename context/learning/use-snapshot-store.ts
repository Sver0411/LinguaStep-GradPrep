"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_NAME, APP_VERSION, DEFAULT_SETTINGS, EMPTY_SNAPSHOT } from "@/lib/constants";
import { dateKey } from "@/lib/learning";
import type { AppSettings, LearningSnapshot } from "@/lib/models";
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
  SNAPSHOT_COLLECTION_KEYS,
  applyTheme,
  changedCollections,
  cloneEmptySnapshot,
  createPlan,
  equalValue,
  isLearningSnapshot,
  isRecord,
  mergeSnapshotChange,
  pickCollections,
  restrictSnapshotToActiveVocabulary,
} from "./snapshot-utils";
import type { BackupImportResult, BackupPayload, ResetScope } from "./types";

const DATA_LOCK_NAME = "lingua-step:data-write";
const SYNC_CHANNEL_NAME = "lingua-step:data-sync";

export function useSnapshotStore() {

  async function withDataLock<T>(task: () => Promise<T>): Promise<T> {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return navigator.locks.request(DATA_LOCK_NAME, () => task());
    }
    return task();
  }

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

    /**
   * Settings changes are a persistence concern: they must write through to the
   * settings repository in the same tick, so they live with the store rather
   * than in an action hook.
   */
  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      setSettings((current) => {
        const next = { ...current, ...patch };
        settingsRef.current = next;
        settingsRepositoryRef.current?.save(next);
        return next;
      });
    },
    [],
  );

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

    /**
     * Take a word out of the rotation for good ("熟知"). This is a deliberate
     * side action rather than a fourth rating: the three ratings describe how
     * the recall went, while this one asserts the word is already known.
     */

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

  return useMemo(
    () => ({
      snapshot,
      settings,
      ready,
      storageDegraded,
      focusMode,
      setFocusMode,
      snapshotRef,
      settingsRef,
      persistSnapshot,
      rebuildTodayPlan,
      updateSettings,
      resetData,
      exportBackup,
      importBackup,
    }),
    [snapshot, settings, ready, storageDegraded, focusMode, setFocusMode, persistSnapshot, rebuildTodayPlan, updateSettings, resetData, exportBackup, importBackup],
  );
}

/** The store's public shape: what every action hook is allowed to touch. */
export type SnapshotStore = ReturnType<typeof useSnapshotStore>;
