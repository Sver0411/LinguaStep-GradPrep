"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Heart,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLearning } from "@/context/LearningContext";
import type { MasteryRating, StudyMode, WordPair } from "@/lib/models";
import { Button, ProgressBar } from "@/components/ui";

type RatingCounts = Record<MasteryRating, number>;

const initialCounts: RatingCounts = { known: 0, fuzzy: 0, unknown: 0 };

export function WordStudySession({
  items,
  mode,
  onFinish,
  onRestart,
  onReviewWeak,
}: {
  items: WordPair[];
  mode: StudyMode;
  onFinish: () => void;
  onRestart: () => void;
  onReviewWeak: () => void;
}) {
  const {
    settings,
    studyWord,
    isFavorite,
    toggleFavorite,
    setFocusMode,
  } = useLearning();
  const [index, setIndex] = useState(0);
  const [revealStage, setRevealStage] = useState(0);
  const [ratings, setRatings] = useState<Partial<Record<string, MasteryRating>>>({});
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const current = items[index];
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
        Math.max(0, Math.min(items.length - 1, currentIndex + direction)),
      );
      setRevealStage(0);
    },
    [items.length],
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
        if (Object.keys(nextRatings).length >= items.length) {
          setFinished(true);
          setFocusMode(false);
        } else {
          let nextIndex = index;
          for (let offset = 1; offset <= items.length; offset += 1) {
            const candidate = (index + offset) % items.length;
            if (!nextRatings[items[candidate].id]) {
              nextIndex = candidate;
              break;
            }
          }
          setIndex(nextIndex);
          setRevealStage(0);
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [answerVisible, current, index, items, mode, ratings, setFocusMode, studyWord],
  );

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

  if (finished) {
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
          {(counts.fuzzy > 0 || counts.unknown > 0) && (
            <Button variant="secondary" onClick={onReviewWeak}>
              <RotateCcw size={18} />复习错词
            </Button>
          )}
          <Button onClick={() => {
            setIndex(0);
            setRevealStage(0);
            setRatings({});
            setFinished(false);
            onRestart();
          }}><RotateCcw size={18} />再学一轮</Button>
          <Button variant="secondary" onClick={onFinish}>返回单词页</Button>
          <Link className="button button-ghost" href="/">返回首页</Link>
        </div>
      </section>
    );
  }

  if (!current) return null;

  return (
    <section className="study-session" aria-live="polite">
      <div className="session-topline">
        <span>{mode === "combined" ? "日英对照" : mode === "japanese" ? "日语" : "英语"}学习</span>
        <strong>{index + 1} / {items.length}</strong>
      </div>
      <div className="session-progress"><span style={{ width: `${((index + 1) / items.length) * 100}%` }} /></div>

      <article className="flashcard">
        <button
          className={`favorite-button floating${isFavorite("word", current.id) ? " active" : ""}`}
          onClick={() => void toggleFavorite("word", current.id)}
          aria-label={isFavorite("word", current.id) ? "取消收藏" : "收藏单词"}
        >
          <Heart size={20} fill={isFavorite("word", current.id) ? "currentColor" : "none"} />
        </button>
        <div className="prompt-side">
          <span className="card-side-label">中文提示</span>
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
            </div>
            <strong>{current.japanese.term}</strong>
            <span className="reading">{current.japanese.reading} · {current.japanese.romanization}</span>
            {settings.displayDensity === "full" && (
              <div className="example-block">
                <p>{current.japanese.example}</p>
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
            </div>
            <strong>{current.english.term}</strong>
            <span className="reading">{current.english.phonetic}</span>
            {settings.displayDensity === "full" && (
              <div className="example-block">
                <p>{current.english.example}</p>
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

      <div className="session-navigation">
        <button onClick={() => move(-1)} disabled={index === 0 || busy} type="button"><ArrowLeft size={17} />上一张</button>
        <button onClick={() => move(1)} disabled={index >= items.length - 1 || busy} type="button">下一张<ArrowRight size={17} /></button>
      </div>
    </section>
  );
}
