"use client";

import { useEffect, useState } from "react";

/**
 * Switches to the dedicated phone experience below the breakpoint. Server
 * render and the first client paint assume desktop so the markup stays
 * deterministic; the media query listener flips it immediately after mount.
 */
export function useIsMobileViewport(breakpoint = 680): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
