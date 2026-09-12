"use client";

import { useRouter } from "next/navigation";
import { getNextLearningAction } from "@/lib/learning-flow";
import type { StudyMode } from "@/lib/models";

export type NavParams = { get(name: string): string | null };

/**
 * The router instance lives here rather than in the shell so every screen can
 * navigate without threading a callback down. It is exposed through a setter
 * because an imported binding cannot be reassigned.
 */
let appRouter: ReturnType<typeof useRouter> | null = null;

export function setAppRouter(router: ReturnType<typeof useRouter> | null) {
  appRouter = router;
}

export function navigateTo(url: string) {
  if (appRouter) appRouter.push(url);
  else window.location.assign(url);
}

/**
 * The flow logic hands back desktop URLs ("/words?plan=new"). The phone has its
 * own routes, so map the *step* rather than reusing the href — otherwise
 * "继续：今日语法" would land on the desktop shell in a narrow viewport.
 */

export function mobileHrefForStep(action: ReturnType<typeof getNextLearningAction>, mode: StudyMode) {
  switch (action.step) {
    case "review":
      return mobileHref("/words", { mobile: "study", source: "review", mode });
    case "new-words":
      return mobileHref("/words", { mobile: "study", source: "new", mode });
    case "grammar":
      return mobileHref("/grammar", { mobile: "practice" });
    case "test":
      return mobileHref("/test", { mobile: "practice" });
    case "mistakes":
      return mobileHref("/mistakes", { mobile: "list" });
    default:
      return "/";
  }
}

export function mobileHref(path: string, values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

export function modeLabel(mode: StudyMode) {
  if (mode === "japanese") return "日语词汇";
  if (mode === "english") return "英语词汇";
  return "日英混合";
}
