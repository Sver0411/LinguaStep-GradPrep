"use client";

import { createContext, useContext } from "react";
import type { QuestionSource } from "@/lib/models";
import type { LearningContextValue } from "./types";

export const LearningContext = createContext<LearningContextValue | null>(null);

export function useLearning(): LearningContextValue {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error("useLearning must be used within LearningProvider");
  }
  return context;
}

export function mistakeCategory(source: QuestionSource): string {
  if (source === "comparison") return "日英对比";
  return source === "grammar" ? "语法" : "单词";
}
