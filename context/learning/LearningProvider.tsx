"use client";

import { useMemo, type ReactNode } from "react";
import { GRAMMAR_COMPARISONS } from "@/data/grammar-comparisons";
import { GRAMMAR_POINTS } from "@/data/grammar";
import { WORD_PAIRS } from "@/data/words";
import { useAIActions } from "./actions/use-ai-actions";
import { useFavoriteActions } from "./actions/use-favorite-actions";
import { useMistakeActions } from "./actions/use-mistake-actions";
import { usePracticeActions } from "./actions/use-practice-actions";
import { useWordActions } from "./actions/use-word-actions";
import { LearningContext } from "./context";
import type { LearningContextValue } from "./types";
import { useSnapshotStore } from "./use-snapshot-store";

/**
 * Learning data provider.
 *
 * This file only wires things together: it owns no state and no business rules,
 * so what a screen can do is readable from the list below.
 *
 *   useSnapshotStore      persisted state, bootstrap, plan, backup/restore
 *   useWordActions        studying and retiring words
 *   usePracticeActions    grammar and test completion
 *   useMistakeActions     the mistake notebook
 *   useFavoriteActions    saved words / grammar / comparisons
 *   useSettingsActions    settings writes
 *   useAIActions          generated-content lifecycle
 *
 * Every hook returns a memoised object, so the published value keeps the same
 * identity until something the learner can actually see has changed.
 */
export function LearningProvider({ children }: { children: ReactNode }) {
  const store = useSnapshotStore();
  const word = useWordActions(store);
  const practice = usePracticeActions(store);
  const mistake = useMistakeActions(store);
  const favorite = useFavoriteActions(store);
  const ai = useAIActions(store);

  const value = useMemo<LearningContextValue>(
    () => ({
      snapshot: store.snapshot,
      settings: store.settings,
      allWords: WORD_PAIRS,
      allGrammar: [...GRAMMAR_POINTS, ...store.snapshot.aiGrammar],
      allComparisons: [...GRAMMAR_COMPARISONS, ...store.snapshot.aiComparisons],
      ready: store.ready,
      storageDegraded: store.storageDegraded,
      focusMode: store.focusMode,
      setFocusMode: store.setFocusMode,
      studyWord: word.studyWord,
      markWordKnown: word.markWordKnown,
      completeGrammar: practice.completeGrammar,
      completeTest: practice.completeTest,
      answerMistake: mistake.answerMistake,
      setMistakeState: mistake.setMistakeState,
      removeMistake: mistake.removeMistake,
      toggleMistakeFavorite: mistake.toggleMistakeFavorite,
      toggleFavorite: favorite.toggleFavorite,
      removeFavorites: favorite.removeFavorites,
      isFavorite: favorite.isFavorite,
      updateSettings: store.updateSettings,
      rebuildTodayPlan: store.rebuildTodayPlan,
      saveAIArtifacts: ai.saveAIArtifacts,
      removeAIContent: ai.removeAIContent,
      undoAIGeneration: ai.undoAIGeneration,
      removeAIGeneration: ai.removeAIGeneration,
      clearAIData: ai.clearAIData,
      resetData: store.resetData,
      exportBackup: store.exportBackup,
      importBackup: store.importBackup,
    }),
    [ai, favorite, mistake, practice, store, word],
  );

  return (
    <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
  );
}
