// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useIsMobileViewport } from "../hooks/useIsMobileViewport";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("mobile viewport on route changes", () => {
  it("starts each client mount with the actual viewport and updates on resize", () => {
    const listeners = new Set<() => void>(); let matches = true;
    vi.stubGlobal("matchMedia", () => ({ matches, addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) }));
    const first = renderHook(() => useIsMobileViewport());
    expect(first.result.current).toBe(true);
    first.unmount(); expect(listeners.size).toBe(0);
    const next = renderHook(() => useIsMobileViewport());
    expect(next.result.current).toBe(true);
    act(() => { matches = false; listeners.forEach(fn => fn()); });
    expect(next.result.current).toBe(false);
  });
});
