"use client";

import { useEffect, useState } from "react";

/**
 * Keeps time-dependent review counters fresh without reading the clock during
 * render. Reading Date.now() in render makes React output non-deterministic and
 * also leaves long-open pages with stale due counts.
 */
export function useCurrentTime(refreshIntervalMs = 60_000): number | null {
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => setCurrentTime(Date.now());
    refresh();
    const intervalId = window.setInterval(refresh, refreshIntervalMs);
    return () => window.clearInterval(intervalId);
  }, [refreshIntervalMs]);

  return currentTime;
}
