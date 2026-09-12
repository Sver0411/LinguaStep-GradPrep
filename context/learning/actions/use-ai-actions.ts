"use client";

import { useCallback, useMemo } from "react";
import { appendAIArtifacts, type AIArtifactBatch } from "@/lib/ai/client/artifact-library";
import { removeAIContentFromSnapshot } from "../snapshot-utils";
import { AIClearScope } from "../types";

type Deps = Pick<SnapshotStore, "persistSnapshot" | "snapshotRef">;

export function useAIActions(deps: Deps) {
  const { persistSnapshot, snapshotRef } = deps;

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

  return useMemo(() => ({ saveAIArtifacts, removeAIContent, undoAIGeneration, removeAIGeneration, clearAIData }), [saveAIArtifacts, removeAIContent, undoAIGeneration, removeAIGeneration, clearAIData]);
}

import type { SnapshotStore } from "../use-snapshot-store";
