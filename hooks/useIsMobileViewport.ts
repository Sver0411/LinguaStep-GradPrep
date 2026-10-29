"use client";
import { useCallback, useSyncExternalStore } from "react";

// Client-side route changes read the existing viewport before painting. Starting
// every mount at desktop caused the mobile shell and tab bar to visibly jump.
export function useIsMobileViewport(breakpoint = 680): boolean {
  const subscribe = useCallback((notify: () => void) => {
    const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
    query.addEventListener("change", notify);
    return () => query.removeEventListener("change", notify);
  }, [breakpoint]);
  const snapshot = useCallback(() => window.matchMedia(`(max-width: ${breakpoint}px)`).matches, [breakpoint]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
