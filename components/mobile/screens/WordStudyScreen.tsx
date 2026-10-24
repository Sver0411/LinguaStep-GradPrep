"use client";

import { useMemo, useState } from "react";
import { useLearning } from "@/context/learning";
import { WordStudySession } from "@/components/words/WordStudySession";
import { getNextLearningAction } from "@/lib/learning-flow";
import { dateKey, getWordModeState, needsWordReview } from "@/lib/learning";
import type { StudyMode, WordPair } from "@/lib/models";
import { NavParams, mobileHref, mobileHrefForStep, navigateTo } from "../navigation";

function selectedStudyWords(allWords: WordPair[], snapshot: ReturnType<typeof useLearning>["snapshot"], mode: StudyMode, source: string | null, wordId: string | null, roundSize: number) {
  if (wordId) return allWords.filter((word) => word.id === wordId);
  const plan = snapshot.dailyPlans.find((item) => item.date === dateKey(new Date()));
  const progressOf = (word: WordPair) =>
    snapshot.wordProgress.find((item) => item.wordId === word.id);
  /**
   * The plan lists every new word for the day, so slicing its first `roundSize`
   * entries handed back the same ten cards after a round was finished: the phone
   * repeated round one forever and words 11-20 were unreachable, which also
   * pinned today's progress at 10/20. Pick whatever is still outstanding, and
   * only fall back to the whole list when a round would otherwise be empty.
   */
  const outstanding = (list: WordPair[]) =>
    list.filter((word) => getWordModeState(progressOf(word), mode) === undefined);

  if (source === "review") {
    const ids = plan?.reviewWordIds;
    const candidates = ids
      ? allWords.filter((word) => ids.includes(word.id))
      : allWords.filter((word) => {
          const state = getWordModeState(progressOf(word), mode);
          return state !== undefined && state.status !== "mastered";
        });
    const now = Date.now();
    const due = candidates.filter((word) => {
      const progress = progressOf(word);
      return progress ? needsWordReview(progress, now, mode) : false;
    });
    return (due.length > 0 ? due : candidates).slice(0, roundSize);
  }
  if (source === "favorites") {
    return allWords.filter((word) => snapshot.favorites.includes(`word:${word.id}`)).slice(0, roundSize);
  }
  const ids = plan?.newWordIds;
  const candidates = ids
    ? allWords.filter((word) => ids.includes(word.id))
    : allWords.filter((word) => !getWordModeState(progressOf(word), mode));
  const fresh = outstanding(candidates);
  return (fresh.length > 0 ? fresh : candidates).slice(0, roundSize);
}


export function MobileWordStudy({ params }: { params: NavParams }) {
  return <MobileWordStudyRound key={`${params.get("mode")}:${params.get("source")}:${params.get("word")}`} params={params} />;
}
function MobileWordStudyRound({ params }: { params: NavParams }) {
  const { allWords, snapshot, settings } = useLearning();
  const rawMode = params.get("mode");
  const mode: StudyMode = rawMode === "japanese" || rawMode === "english" ? rawMode : "combined";
  const candidates = useMemo(() => selectedStudyWords(allWords, snapshot, mode, params.get("source"), params.get("word"), settings.studyRoundSize), [allWords, mode, params, settings.studyRoundSize, snapshot]);
  const [items, setItems] = useState(candidates);
  const [round, setRound] = useState(0);
  const restart = () => { setItems(candidates); setRound((value) => value + 1); };
  return <WordStudySession key={round} items={items} mode={mode} mobile
    onFinish={() => navigateTo(mobileHref("/words", { mobile: "library" }))}
    onRestart={restart}
    onContinuePlan={() => {
      const next = getNextLearningAction(snapshot, dateKey(new Date()));
      const source = next.step === "review" ? "review" : "new";
      if ((next.step === "review" || next.step === "new-words") && !params.get("word") && (params.get("source") ?? "new") === source) restart();
      else navigateTo(mobileHrefForStep(next, mode));
    }}
    onReviewUnknown={(words) => { setItems(words); setRound((value) => value + 1); }} />;
}
