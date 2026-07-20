"use client";

import { usePathname } from "next/navigation";
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
import { AIView } from "@/components/views/AIView";

const views = {
  words: WordsView,
  grammar: GrammarView,
  test: TestView,
  ai: AIView,
  mistakes: MistakesView,
  favorites: FavoritesView,
  stats: StatsView,
  settings: SettingsView,
} as const;

export function LinguaApp() {
  const pathname = usePathname();
  const { ready, storageDegraded, focusMode, setFocusMode } = useLearning();
  const section = pathname.split("/").filter(Boolean)[0] as keyof typeof views | undefined;
  const View = section && views[section] ? views[section] : HomeView;

  return (
    <AppShell focusMode={focusMode} onExitFocus={() => setFocusMode(false)}>
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
