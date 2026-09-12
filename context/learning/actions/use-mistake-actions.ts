"use client";

import { useCallback, useMemo } from "react";
import { dateKey, isAnswerCorrect, updateDailyRecord, updateMistakeRecord } from "@/lib/learning";
import type { MistakeState } from "@/lib/models";

type Deps = Pick<SnapshotStore, "persistSnapshot" | "snapshotRef" | "settingsRef">;

export function useMistakeActions(deps: Deps) {
  const { persistSnapshot, snapshotRef, settingsRef } = deps;

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

  return useMemo(() => ({ answerMistake, setMistakeState, removeMistake, toggleMistakeFavorite }), [answerMistake, setMistakeState, removeMistake, toggleMistakeFavorite]);
}

import type { SnapshotStore } from "../use-snapshot-store";
