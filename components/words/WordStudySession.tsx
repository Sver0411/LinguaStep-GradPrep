"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Eye,
  Heart,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLearning } from "@/context/LearningContext";
import { dateKey } from "@/lib/learning";
import { getNextLearningAction } from "@/lib/learning-flow";
import type { MasteryRating, StudyMode, WordPair } from "@/lib/models";
import { speak } from "@/lib/speech";
import { SpeakButton } from "@/components/SpeakButton";
import { Button, ProgressBar } from "@/components/ui";

type RatingCounts = Record<MasteryRating, number>;

const initialCounts: RatingCounts = { known: 0, fuzzy: 0, unknown: 0 };

export function WordStudySession({
  items,
  mode,
  onFinish,
  onRestart,
  onContinuePlan,
  onReviewUnknown,
}: {
  items: WordPair[];
  mode: StudyMode;
  onFinish: () => void;
  onRestart: () => void;
  onContinuePlan: (href: string) => void;
  onReviewUnknown: (items: WordPair[]) => void;
}) {
  const {
    snapshot,
    settings,
    studyWord,
    markWordKnown,
    isFavorite,
    toggleFavorite,
    setFocusMode,
  } = useLearning();
  const [index, setIndex] = useState(0);
  const [revealStage, setRevealStage] = useState(0);
  /**
   * The running queue. A word rated "unknown" is pushed to the back and a
   * "fuzzy" one is re-inserted a few cards later, so a weak word is met again
   * within the same sitting instead of waiting for its next due date. Each
   * word can loop at most once, which keeps the round finite.
   */
  const [queue, setQueue] = useState<WordPair[]>(items);
  const requeuedRef = useRef<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Partial<Record<string, MasteryRating>>>({});
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => {
    setQueue(items);
    setIndex(0);
    setRevealStage(0);
    requeuedRef.current = new Set();
  }, [items]);
  const current = queue[index];
  const firstLanguage = useMemo(() => {
    if (settings.revealOrder === "english-first") return "english";
    if (settings.revealOrder === "random" && current) {
      const value = [...current.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
      return value % 2 === 0 ? "japanese" : "english";
    }
    return "japanese";
  }, [current, settings.revealOrder]);
  const singleLanguage = mode !== "combined";
  const answerVisible = revealStage >= (singleLanguage ? 1 : 2);
  const japaneseVisible =
    mode === "japanese" ||
    (mode === "combined" &&
      (revealStage >= 2 || (revealStage === 1 && firstLanguage === "japanese")));
  const englishVisible =
    mode === "english" ||
    (mode === "combined" &&
      (revealStage >= 2 || (revealStage === 1 && firstLanguage === "english")));
  const alreadyRated = current ? ratings[current.id] : undefined;

  const reveal = useCallback(() => {
    setRevealStage((stage) =>
      singleLanguage
        ? 1
        : settings.revealMode === "together"
          ? 2
          : Math.min(2, stage + 1),
    );
  }, [settings.revealMode, singleLanguage]);

  const move = useCallback(
    (direction: -1 | 1) => {
      if (busyRef.current) return;
      setIndex((currentIndex) =>
        Math.max(0, Math.min(queue.length - 1, currentIndex + direction)),
      );
      setRevealStage(0);
    },
    [queue.length],
  );

  const rate = useCallback(
    async (rating: MasteryRating) => {
      if (!answerVisible || busyRef.current || !current || ratings[current.id]) return;
      busyRef.current = true;
      setBusy(true);
      try {
        await studyWord(current.id, rating, mode);
        const nextRatings = { ...ratings, [current.id]: rating };
        setRatings(nextRatings);

        let nextQueue = queue;
        const shouldLoop =
          (rating === "unknown" || rating === "fuzzy") &&
          !requeuedRef.current.has(current.id);
        if (shouldLoop) {
          requeuedRef.current.add(current.id);
          const gap = rating === "unknown" ? 6 : 3;
          const at = Math.min(index + gap, queue.length);
          nextQueue = [...queue.slice(0, at), current, ...queue.slice(at)];
          setQueue(nextQueue);
        }

        if (index + 1 >= nextQueue.length) {
          setFinished(true);
          setFocusMode(false);
        } else {
          setIndex(index + 1);
          setRevealStage(0);
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [answerVisible, current, index, mode, queue, ratings, setFocusMode, studyWord],
  );

  /** Retire the current word: it leaves the queue and never comes back. */
  const markKnown = useCallback(async () => {
    if (!current || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await markWordKnown(current.id, mode);
      const nextQueue = queue.filter((_, position) => position !== index);
      setQueue(nextQueue);
      if (index >= nextQueue.length) {
        setFinished(true);
        setFocusMode(false);
      } else {
        setRevealStage(0);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [current, index, markWordKnown, mode, queue, setFocusMode]);

  useEffect(() => {
    return () => setFocusMode(false);
  }, [setFocusMode]);

  /**
   * Optional read-aloud after the answer appears. In 日英对照 mode the two
   * languages are queued with a gap because starting a second utterance
   * cancels the first one.
   */
  useEffect(() => {
    if (!settings.autoSpeak || !answerVisible || !current) return;
    const timers: number[] = [];
    if (mode !== "english") speak(current.japanese.term, "ja-JP");
    if (mode !== "japanese") {
      timers.push(
        window.setTimeout(
          () => speak(current.english.term, "en-US"),
          mode === "combined" ? 1400 : 0,
        ),
      );
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [answerVisible, current, mode, settings.autoSpeak]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, button")) return;
      if (event.code === "Space") {
        event.preventDefault();
        reveal();
      } else if (event.key === "ArrowLeft") {
        move(-1);
      } else if (event.key === "ArrowRight") {
        move(1);
      } else if (event.key === "1") {
        void rate("known");
      } else if (event.key === "2") {
        void rate("fuzzy");
      } else if (event.key === "3") {
        void rate("unknown");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [move, rate, reveal]);

  const counts = useMemo<RatingCounts>(() => {
    const next = { ...initialCounts };
    Object.values(ratings).forEach((rating) => {
      if (rating) next[rating] += 1;
    });
    return next;
  }, [ratings]);
  const masteryPercent = Math.round(
    (counts.known / Math.max(1, items.length)) * 100,
  );
  const nextAction = getNextLearningAction(snapshot, dateKey(new Date()));

  if (finished) {
    const unknownItems = items.filter((item) => ratings[item.id] === "unknown");
    return (
      <section className="session-summary card">
        <span className="summary-icon"><Sparkles size={28} /></span>
        <span className="section-kicker">ROUND COMPLETE</span>
        <h1>这一轮完成了</h1>
        <p>你已经完成 {items.length} 组{mode === "combined" ? "日英对照" : mode === "japanese" ? "日语" : "英语"}单词，独立复习记录已保存。</p>
        <div className="summary-metrics">
          <div><span>本轮数量</span><strong>{items.length}</strong></div>
          <div className="known"><span>认识</span><strong>{counts.known}</strong></div>
          <div className="fuzzy"><span>模糊</span><strong>{counts.fuzzy}</strong></div>
          <div className="unknown"><span>不认识</span><strong>{counts.unknown}</strong></div>
        </div>
        <ProgressBar value={masteryPercent} label="基础掌握比例" />
        <div className="summary-actions">
          {nextAction.href.startsWith("/words")
            ? <Button onClick={() => onContinuePlan(nextAction.href)}><ArrowRight size={18} />{nextAction.label}</Button>
            : <Link className="button button-primary" href={nextAction.href}><ArrowRight size={18} />{nextAction.label}</Link>}
          {unknownItems.length > 0 && (
            <Button variant="secondary" onClick={() => onReviewUnknown(unknownItems)}>
              <RotateCcw size={18} />重练生词
            </Button>
          )}
          <Button variant="secondary" onClick={onRestart}><RotateCcw size={18} />再学一轮</Button>
          <Button variant="secondary" onClick={onFinish}>返回单词页</Button>
        </div>
      </section>
    );
  }

  if (!current) return null;

  return (
    <section className={`study-session${answerVisible ? " rating-visible" : ""}`} aria-live="polite">
      <div className="session-topline">
        <span>{mode === "combined" ? "日英对照" : mode === "japanese" ? "日语" : "英语"}学习</span>
        <div className="session-top-actions"><strong>{index + 1} / {queue.length}</strong><button className="text-button" onClick={() => void markKnown()} disabled={busy} title="标记为已熟知，以后不再安排复习"><BadgeCheck size={16} />已熟知</button><button className="text-button" onClick={onFinish}><ArrowLeft size={16} />退出学习</button></div>
      </div>
      <div className="session-progress"><span style={{ width: `${((index + 1) / queue.length) * 100}%` }} /></div>

      <article className="flashcard">
        <button
          className={`favorite-button floating${isFavorite("word", current.id) ? " active" : ""}`}
          onClick={() => void toggleFavorite("word", current.id)}
          aria-label={isFavorite("word", current.id) ? "取消收藏" : "收藏单词"}
        >
          <Heart size={20} fill={isFavorite("word", current.id) ? "currentColor" : "none"} />
        </button>
        <div className="prompt-side">
          <h1>{current.meaningZh}</h1>
          <p>想一想：{mode === "combined" ? "日语和英语分别" : mode === "japanese" ? "日语" : "英语"}怎么表达？</p>
        </div>

        {revealStage === 0 && (
          <button className="reveal-area" onClick={reveal} type="button">
            <Eye size={22} />
            <strong>揭示答案</strong>
            <span>点击或按 <kbd>Space</kbd></span>
          </button>
        )}

        {japaneseVisible && revealStage >= 1 && (
          <div className="answer-panel japanese-answer">
            <div className="answer-heading">
              <span className="language-label jp">日</span>
              <span>{current.japanese.partOfSpeech} · {current.japanese.difficulty}</span>
              <SpeakButton text={current.japanese.term} language="ja-JP" label="朗读日语" />
            </div>
            <strong>{current.japanese.term}</strong>
            {current.japanese.reading !== current.japanese.term && (
              <span className="reading">{current.japanese.reading}</span>
            )}
            {settings.displayDensity === "full" && (
              <div className="example-block">
                <p>{current.japanese.example}<SpeakButton text={current.japanese.example} language="ja-JP" label="朗读日语例句" size={15} /></p>
                <span>{current.japanese.exampleZh}</span>
                <small>搭配：{current.japanese.collocations.join(" · ")}</small>
              </div>
            )}
          </div>
        )}

        {mode === "combined" && settings.revealMode === "step-by-step" && revealStage === 1 && (
          <button className="reveal-next-language" onClick={reveal} type="button">
            再次点击或按 Space 揭示{firstLanguage === "japanese" ? "英语" : "日语"} <ArrowRight size={17} />
          </button>
        )}

        {englishVisible && revealStage >= 1 && (
          <div className="answer-panel english-answer">
            <div className="answer-heading">
              <span className="language-label en">英</span>
              <span>{current.english.partOfSpeech} · {current.english.difficulty}</span>
              <SpeakButton text={current.english.term} language="en-US" label="朗读英语" />
            </div>
            <strong>{current.english.term}</strong>
            <span className="reading">{current.english.phonetic}</span>
            {settings.displayDensity === "full" && (
              <div className="example-block">
                <p>{current.english.example}<SpeakButton text={current.english.example} language="en-US" label="朗读英语例句" size={15} /></p>
                <span>{current.english.exampleZh}</span>
                <small>搭配：{current.english.collocations.join(" · ")}</small>
              </div>
            )}
          </div>
        )}

        {answerVisible && <p className="word-note">{current.note}</p>}
      </article>

      {answerVisible && (
        <div className="rating-panel">
          <p>{alreadyRated ? "这张卡已在本轮记录，可继续查看前后卡片。" : "这组词你掌握得怎么样？"}</p>
          <div className="rating-buttons">
            <button className="rating known" onClick={() => void rate("known")} disabled={busy || Boolean(alreadyRated)}>
              <Check size={18} /><span><strong>认识</strong><small>快捷键 1</small></span>
            </button>
            <button className="rating fuzzy" onClick={() => void rate("fuzzy")} disabled={busy || Boolean(alreadyRated)}>
              <span className="rating-dot" /><span><strong>模糊</strong><small>快捷键 2</small></span>
            </button>
            <button className="rating unknown" onClick={() => void rate("unknown")} disabled={busy || Boolean(alreadyRated)}>
              <span className="rating-cross">×</span><span><strong>不认识</strong><small>快捷键 3</small></span>
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
