"use client";

import type { ReactNode } from "react";
import { LearningProvider } from "@/context/LearningContext";

export function Providers({ children }: { children: ReactNode }) {
  return <LearningProvider>{children}</LearningProvider>;
}
