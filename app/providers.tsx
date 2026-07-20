"use client";

import type { ReactNode } from "react";
import { LearningProvider } from "@/context/LearningContext";
import { AIProvider } from "@/context/AIContext";

export function Providers({ children }: { children: ReactNode }) {
  return <LearningProvider><AIProvider>{children}</AIProvider></LearningProvider>;
}
