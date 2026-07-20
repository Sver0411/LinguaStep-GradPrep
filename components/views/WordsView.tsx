"use client";

import { BookOpenText, Layers3, Play, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WORD_PAIRS } from "@/data/words";
import { useLearning } from "@/context/LearningContext";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import {
  compareWordReviewPriority,
  needsWordReview,
} from "@/lib/learning";
import type { WordPair } from "@/lib/models";
import { Button, PageHeader, ProgressBar } from "@/components/ui";
import { WordLibrary } from "@/components/words/WordLibrary";
import { WordStudySession } from "@/components/words/WordStudySession";

export function WordsView() {
  const {
    snapshot,
    settings,
    updateSettings,
    isFavorite,
    toggleFavorite,
    setFocusMode,
  } = useLearning();
  const [sessionItems, setSessionItems] = useState<WordPair[] | null>(null);
  const autoStarted = useRef(false);
  const progressMap = useMemo(
    () => new Map(snapshot.wordProgress.map((item) => [item.wordId, item])),
    [snapshot.wordProgress],
  );
  const learnedCount = snapshot.wordProgress.filter((item) => item.status === "learned").length;
  const now = useCurrentTime();
  const needsReview = WORD_PAIRS.filter((word) => {
    const progress = progressMap.get(word.id);
    return Boolean(progress && needsWordReview(progress, now ?? Number.NEGATIVE_INFINITY));
  }).sort((left, right) => {
    const leftProgress = progressMap.get(left.id);
    const rightProgress = progressMap.get(right.id);
    if (!leftProgress || !rightProgress) return 0;
    return compareWordReviewPriority(leftProgress, rightProgress);
  });

  const startSession = useCallback(
    (reviewOnly = false) => {
      const source = reviewOnly && needsReview.length > 0
        ? needsReview
        : [...WORD_PAIRS].sort((a, b) => {
            const aProgress = progressMap.get(a.id);
            const bProgress = progressMap.get(b.id);
            if (!aProgress && bProgress) return -1;
            if (aProgress && !bProgress) return 1;
            return (aProgress?.lastStudiedAt ?? "").localeCompare(bProgress?.lastStudiedAt ?? "");
          });
      setSessionItems(source.slice(0, settings.studyRoundSize));
      setFocusMode(true);
    },
    [needsReview, progressMap, setFocusMode, settings.studyRoundSize],
  );

  useEffect(() => {
    if (autoStarted.current) return;
    const search = new URLSearchParams(window.location.search);
    const shouldStart = search.get("study") === "1";
    const shouldReview = search.get("review") === "1";
    if (shouldStart || shouldReview) {
      autoStarted.current = true;
      const timer = window.setTimeout(() => startSession(shouldReview), 0);
      return () => window.clearTimeout(timer);
    }
  }, [startSession]);

  if (sessionItems) {
    return (
      <WordStudySession
        items={sessionItems}
        onFinish={() => {
          setSessionItems(null);
          setFocusMode(false);
        }}
        onRestart={() => startSession(false)}
        onReviewWeak={() => startSession(true)}
      />
    );
  }

  return (
    <div className="page-stack words-page">
      <PageHeader
        eyebrow="日英对应单词"
        title="从同一个意思，连接两种语言"
        description="先看中文回想答案，再揭示日语与英语。每次掌握记录都会自动保存在本机。"
        actions={
          <div className="segmented-control" aria-label="单词显示密度">
            <button
              className={settings.displayDensity === "compact" ? "active" : ""}
              onClick={() => updateSettings({ displayDensity: "compact" })}
            >简洁版</button>
            <button
              className={settings.displayDensity === "full" ? "active" : ""}
              onClick={() => updateSettings({ displayDensity: "full" })}
            >完整版</button>
          </div>
        }
      />

      <section className="word-deck-layout">
        <article className="card deck-card">
          <div className="deck-card-top">
            <span className="deck-icon"><BookOpenText size={28} /></span>
            <div className="deck-stat"><strong>{WORD_PAIRS.length}</strong><span>组词汇</span></div>
            <div className="deck-stat"><strong>{learnedCount}</strong><span>已掌握</span></div>
            <div className="deck-stat"><strong>{needsReview.length}</strong><span>需加强</span></div>
          </div>
          <ProgressBar value={(learnedCount / WORD_PAIRS.length) * 100} label="词库掌握进度" />
          <div className="deck-controls">
            <label>
              <span><SlidersHorizontal size={17} />本轮数量</span>
              <select
                value={settings.studyRoundSize}
                onChange={(event) => updateSettings({ studyRoundSize: Number(event.target.value) })}
              >
                <option value={10}>10 个</option>
                <option value={20}>20 个</option>
                <option value={30}>30 个</option>
                {![10, 20, 30].includes(settings.studyRoundSize) && (
                  <option value={settings.studyRoundSize}>自定义 · {settings.studyRoundSize} 个</option>
                )}
              </select>
            </label>
            <div className="deck-actions">
              {needsReview.length > 0 && (
                <Button variant="secondary" onClick={() => startSession(true)}>
                  <Layers3 size={18} />复习到期与薄弱词
                </Button>
              )}
              <Button onClick={() => startSession(false)}>
                <Play size={18} fill="currentColor" />开始一轮
              </Button>
            </div>
          </div>
        </article>

        <aside className="card method-card">
          <span className="section-kicker">HOW IT WORKS</span>
          <h2>四步完成一张卡</h2>
          <ol className="step-list">
            <li><span>1</span><div><strong>看中文</strong><small>主动回想日语和英语</small></div></li>
            <li><span>2</span><div><strong>揭示答案</strong><small>支持同时或分步揭示</small></div></li>
            <li><span>3</span><div><strong>判断掌握</strong><small>认识、模糊或不认识</small></div></li>
            <li><span>4</span><div><strong>进入下一张</strong><small>记录实时保存到本机</small></div></li>
          </ol>
        </aside>
      </section>

      <WordLibrary
        words={WORD_PAIRS}
        density={settings.displayDensity}
        isFavorite={(id) => isFavorite("word", id)}
        onToggleFavorite={(id) => void toggleFavorite("word", id)}
      />
    </div>
  );
}
