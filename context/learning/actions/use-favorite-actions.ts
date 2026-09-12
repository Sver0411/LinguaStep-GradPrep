"use client";

import { useCallback, useMemo } from "react";
import type { FavoriteKind } from "../types";
import type { SnapshotStore } from "../use-snapshot-store";

type Deps = Pick<SnapshotStore, "persistSnapshot" | "snapshotRef" | "snapshot">;

export function useFavoriteActions(deps: Deps) {
  const { persistSnapshot, snapshotRef, snapshot } = deps;

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

  return useMemo(() => ({ toggleFavorite, removeFavorites, isFavorite }), [toggleFavorite, removeFavorites, isFavorite]);
}

