"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { LoadingState, StorageWarning } from "@/components/ui";
import { useLearning } from "@/context/LearningContext";
import { FavoritesView } from "@/components/views/FavoritesView";
import { GrammarView } from "@/components/views/GrammarView";
import { HomeView } from "@/components/views/HomeView";
import { MistakesView } from "@/components/views/MistakesView";
import { SettingsView } from "@/components/views/SettingsView";
import { StatsView } from "@/components/views/StatsView";
import { TestView } from "@/components/views/TestView";
import { WordsView } from "@/components/views/WordsView";

const views = {
  words: WordsView,
  grammar: GrammarView,
  test: TestView,
  mistakes: MistakesView,
  favorites: FavoritesView,
  stats: StatsView,
  settings: SettingsView,
} as const;

export function LinguaApp() {
  const pathname = usePathname();
  const { ready, storageDegraded, focusMode, setFocusMode, settings } = useLearning();
  const section = pathname.split("/").filter(Boolean)[0] as keyof typeof views | undefined;
  const View = section && views[section] ? views[section] : HomeView;
  const focusEligible = section === "words" || section === "grammar" || section === "test" || section === "mistakes";

  useEffect(() => {
    if (!focusEligible && focusMode) setFocusMode(false);
  }, [focusEligible, focusMode, setFocusMode]);

  const exitFocusSession = () => {
    window.dispatchEvent(new Event("linguastep:exit-session"));
    setFocusMode(false);
  };

  return (
    <AppShell focusMode={focusEligible && focusMode && settings.focusModeEnabled} onExitFocus={exitFocusSession}>
      {!ready ? (
        <LoadingState />
      ) : (
        <>
          {storageDegraded && <StorageWarning />}
          <View />
        </>
      )}
    </AppShell>
  );
}
