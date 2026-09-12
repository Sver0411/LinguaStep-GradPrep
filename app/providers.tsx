"use client";

import type { ReactNode } from "react";
import { LearningProvider } from "@/context/learning";

export function Providers({ children }: { children: ReactNode }) {
  return <LearningProvider>{children}</LearningProvider>;
}
