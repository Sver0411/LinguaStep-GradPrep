"use client";

import { useCallback, useMemo } from "react";
import { dateKey, updateDailyRecord, updateWordMastery } from "@/lib/learning";
import { suspendReview } from "@/lib/spaced-repetition";
import type { LearningSnapshot, MasteryRating, StudyMode } from "@/lib/models";
import { summarizeWordProgress } from "@/lib/repositories/migrations";

type Deps = Pick<SnapshotStore, "persistSnapshot" | "snapshotRef" | "settingsRef">;

export function useWordActions(deps: Deps) {
  const { persistSnapshot, snapshotRef, settingsRef } = deps;

    const markWordKnown = useCallback(
      async (wordId: string, mode?: StudyMode) => {
        const useMode = mode ?? settingsRef.current.defaultStudyMode;
        const now = new Date().toISOString();
        const current = snapshotRef.current;
        const previous = current.wordProgress.find((item) => item.wordId === wordId);
        const rated = updateWordMastery(previous, wordId, "known", now, useMode);
        const progress = summarizeWordProgress(
          wordId,
          { ...rated.modes, [useMode]: suspendReview(rated.modes[useMode], now) },
          now,
        );
        await persistSnapshot({
          ...current,
          wordProgress: [
            ...current.wordProgress.filter((item) => item.wordId !== wordId),
            progress,
          ],
        });
      },
      [persistSnapshot],
    );

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

  return useMemo(() => ({ markWordKnown, studyWord }), [markWordKnown, studyWord]);
}

import type { SnapshotStore } from "../use-snapshot-store";
