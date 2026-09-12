"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, BookOpen, CheckCircle2, X } from "lucide-react";
import { useLearning } from "@/context/learning";
import { getNextLearningAction } from "@/lib/learning-flow";
import { SpeakButton } from "@/components/SpeakButton";
import { dateKey, getWordModeState, needsWordReview } from "@/lib/learning";
import type { MasteryRating, StudyMode, WordPair } from "@/lib/models";
import { NavParams, mobileHref, mobileHrefForStep, navigateTo } from "../navigation";
import { MobileSubHeader } from "../ui/MobileSubHeader";

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
  const { allWords, snapshot, settings, studyWord, markWordKnown } = useLearning();
  const rawMode = params.get("mode");
  const mode: StudyMode = rawMode === "japanese" || rawMode === "english" ? rawMode : "combined";
  const words = useMemo(() => selectedStudyWords(allWords, snapshot, mode, params.get("source"), params.get("word"), settings.studyRoundSize), [allWords, mode, params, settings.studyRoundSize, snapshot]);
  const [index, setIndex] = useState(0);
  const [revealStage, setRevealStage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [ratings, setRatings] = useState<Record<string, MasteryRating>>({});
  /**
   * Live queue: a word rated "unknown" goes to the back and a "fuzzy" one is
   * re-inserted a few cards later, so weak words come round again in the same
   * sitting. Each word loops at most once, keeping the round finite.
   */
  const [queue, setQueue] = useState<WordPair[]>(words);
  const requeuedRef = useRef<Set<string>>(new Set());
  /**
   * `words` is recomputed whenever the snapshot changes — and the snapshot
   * changes on every single rating. Seeding the queue off its identity threw
   * the learner back to the first card after each answer, so a round never
   * advanced past word one. The queue is seeded once per navigation instead
   * (mode + source + word), then left alone until the round is over.
   */
  const sessionId = `${mode}|${params.get("source") ?? ""}|${params.get("word") ?? ""}`;
  const seededRef = useRef<string | null>(null);
  useEffect(() => {
    if (seededRef.current === sessionId) return;
    if (words.length === 0) return;
    seededRef.current = sessionId;
    setQueue(words);
    setIndex(0);
    setRevealStage(0);
    setRatings({});
    requeuedRef.current = new Set();
  }, [sessionId, words]);
  const word = queue[index];
  const rate = async (rating: MasteryRating) => {
    if (!word || saving) return;
    setSaving(true);
    try {
      await studyWord(word.id, rating, mode);
      setRatings((value) => ({ ...value, [word.id]: rating }));

      let nextQueue = queue;
      const shouldLoop =
        (rating === "unknown" || rating === "fuzzy") && !requeuedRef.current.has(word.id);
      if (shouldLoop) {
        requeuedRef.current.add(word.id);
        const gap = rating === "unknown" ? 6 : 3;
        const at = Math.min(index + gap, queue.length);
        nextQueue = [...queue.slice(0, at), word, ...queue.slice(at)];
        setQueue(nextQueue);
      }

      setIndex(index + 1);
      setRevealStage(0);
    } finally { setSaving(false); }
  };
  /** Retire the current word: it leaves the queue and never comes back. */
  const markKnown = async () => {
    if (!word || saving) return;
    setSaving(true);
    try {
      await markWordKnown(word.id, mode);
      const nextQueue = queue.filter((_, position) => position !== index);
      setQueue(nextQueue);
      setRevealStage(0);
    } finally { setSaving(false); }
  };
  const weakWords = words.filter((item) => ratings[item.id] === "unknown");
  /**
   * The summary used to dead-end on "回到首页": on the phone a finished word
   * round told you nothing about the grammar and test still sitting in today's
   * plan, so most days stopped here. Mirror the desktop summary and lead with the
   * plan's next step instead.
   */
  const nextAction = getNextLearningAction(snapshot, dateKey(new Date()));
  const hasNextStep = nextAction.step !== "complete";
  // Another word round happens on this very route, so navigating to it would be
  // a no-op — the bar never moved and the tap looked broken. Reseed in place.
  const nextIsWordRound = nextAction.step === "new-words" || nextAction.step === "review";
  const canContinueInPlace = nextIsWordRound && words.length > 0;
  const continueRound = () => {
    setQueue(words);
    setIndex(0);
    setRevealStage(0);
    setRatings({});
    requeuedRef.current = new Set();
  };
  if (words.length === 0) return <main className="m3-page"><MobileSubHeader detail="WORD STUDY" onBack={() => navigateTo(mobileHref("/words", { mobile: "library" }))} title="没有可学习的单词" /><div className="m3-empty-card"><BookOpen size={28} /><h2>先从词库选择单词</h2><button className="m3-primary" onClick={() => navigateTo(mobileHref("/words", { mobile: "library" }))} type="button">浏览词库</button></div></main>;
  if (!word) return <main className="m3-page"><MobileSubHeader detail="WORD STUDY" onBack={() => navigateTo("/")} title="本轮完成" /><div className="m3-complete"><CheckCircle2 size={36} /><h2>完成 {Object.keys(ratings).length} 个单词</h2><p>{hasNextStep ? nextAction.description : "已同步更新你的学习记录与复习安排。"}</p>{hasNextStep && <button className="m3-primary" onClick={() => { if (canContinueInPlace) continueRound(); else navigateTo(mobileHrefForStep(nextAction, mode)); }} type="button">{nextAction.label}<ArrowRight size={17} /></button>}{weakWords.length > 0 && <button className={hasNextStep ? "m3-secondary" : "m3-primary"} onClick={() => { setQueue(weakWords); setIndex(0); setRevealStage(0); setRatings({}); requeuedRef.current = new Set(); seededRef.current = `${sessionId}|retry`; }} type="button">重练不认识的 {weakWords.length} 个词</button>}<button className={hasNextStep || weakWords.length > 0 ? "m3-secondary" : "m3-primary"} onClick={() => navigateTo("/")} type="button">回到首页</button><button className="m3-secondary" onClick={() => navigateTo(mobileHref("/words", { mobile: "library" }))} type="button">继续选词</button></div></main>;
  const firstLanguage: "japanese" | "english" = settings.revealOrder === "english-first"
    ? "english"
    : settings.revealOrder === "random"
      ? [...word.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 2 === 0
        ? "japanese"
        : "english"
      : "japanese";
  const singleLanguage = mode !== "combined";
  const answerVisible = revealStage >= (singleLanguage ? 1 : 2);
  const japaneseVisible =
    mode === "japanese" ||
    (mode === "combined" && (revealStage >= 2 || (revealStage === 1 && firstLanguage === "japanese")));
  const englishVisible =
    mode === "english" ||
    (mode === "combined" && (revealStage >= 2 || (revealStage === 1 && firstLanguage === "english")));
  const reveal = () =>
    setRevealStage((stage) =>
      singleLanguage ? 1 : settings.revealMode === "together" ? 2 : Math.min(2, stage + 1),
    );
  const revealLabel = singleLanguage
    ? "揭示答案"
    : revealStage === 0
      ? "揭示第一个表达"
      : "揭示第二个表达";
  return (
    <main className="m3-page m3-study-session">
      <header className="m3-session-header">
        <button onClick={() => navigateTo("/")} type="button"><X size={19} />结束</button>
        <span>{index + 1} / {queue.length}</span>
        <button className="m3-known" disabled={saving} onClick={() => void markKnown()} title="标记为已熟知，以后不再安排复习" type="button"><BadgeCheck size={17} />熟知</button>
      </header>
      <div className="m3-session-progress"><span style={{ width: `${((index + 1) / queue.length) * 100}%` }} /></div>
      <article className="m3-flashcard">
        <span>{mode === "japanese" ? "日语词汇" : mode === "english" ? "英语词汇" : "日英对照"}</span>
        <h1>{word.meaningZh}</h1>
        <p className="m3-study-hint">
          想一想：{mode === "combined" ? "日语和英语分别" : mode === "japanese" ? "日语" : "英语"}怎么表达？
        </p>
        {japaneseVisible && (
          <div className="m3-study-lang jp">
            <span className="m3-lang-tag">日</span>
            <strong>{word.japanese.term}<SpeakButton text={word.japanese.term} language="ja-JP" label="朗读日语" size={18} /></strong>
            {word.japanese.reading !== word.japanese.term && (
              <span className="m3-study-reading">{word.japanese.reading}</span>
            )}
            {word.japanese.example && (
              <p>{word.japanese.example}<SpeakButton text={word.japanese.example} language="ja-JP" label="朗读日语例句" size={15} /></p>
            )}
            {word.japanese.exampleZh && <small>{word.japanese.exampleZh}</small>}
          </div>
        )}
        {englishVisible && (
          <div className="m3-study-lang en">
            <span className="m3-lang-tag">英</span>
            <strong>{word.english.term}<SpeakButton text={word.english.term} language="en-US" label="朗读英语" size={18} /></strong>
            {word.english.phonetic && <span className="m3-study-reading">{word.english.phonetic}</span>}
            {word.english.example && (
              <p>{word.english.example}<SpeakButton text={word.english.example} language="en-US" label="朗读英语例句" size={15} /></p>
            )}
            {word.english.exampleZh && <small>{word.english.exampleZh}</small>}
          </div>
        )}
      </article>
      {!answerVisible ? (
        <button className="m3-primary m3-reveal" onClick={reveal} type="button">{revealLabel}</button>
      ) : (
        <div className="m3-rating-row">
          <button className="unknown" disabled={saving} onClick={() => void rate("unknown")} type="button">不认识</button>
          <button className="fuzzy" disabled={saving} onClick={() => void rate("fuzzy")} type="button">模糊</button>
          <button className="known" disabled={saving} onClick={() => void rate("known")} type="button">认识</button>
        </div>
      )}
    </main>
  );
}
