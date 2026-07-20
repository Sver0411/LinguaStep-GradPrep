"use client";

import {
  BookOpenText,
  Layers3,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLearning } from "@/context/LearningContext";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  compareWordReviewPriority,
  dateKey,
  getWordModeState,
  needsWordReview,
} from "@/lib/learning";
import { searchWords, type WordSearchFilters } from "@/lib/search";
import type { StudyMode, WordPair } from "@/lib/models";
import { Button, PageHeader, ProgressBar } from "@/components/ui";
import { WordLibrary } from "@/components/words/WordLibrary";
import { WordStudySession } from "@/components/words/WordStudySession";
import { FilterPanel } from "@/components/filters/FilterPanel";

type SessionSource = "all" | "review" | "new" | "favorites";

const MODE_LABELS: Record<StudyMode, string> = {
  combined: "日英对照",
  japanese: "只学日语",
  english: "只学英语",
};

export function WordsView() {
  const {
    snapshot,
    allWords,
    settings,
    updateSettings,
    isFavorite,
    toggleFavorite,
    setFocusMode,
  } = useLearning();
  const now = useCurrentTime();
  const [mode, setMode] = useState<StudyMode>(settings.defaultStudyMode);
  const [sessionItems, setSessionItems] = useState<WordPair[] | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Omit<WordSearchFilters, "query" | "mode">>({
    japaneseLevel: "all",
    englishLevel: "all",
    frequency: "all",
    status: "all",
    favorite: false,
    mistake: false,
    due: false,
  });
  const autoStarted = useRef(false);
  const debouncedQuery = useDebouncedValue(query);
  const progressMap = useMemo(
    () => new Map(snapshot.wordProgress.map((item) => [item.wordId, item])),
    [snapshot.wordProgress],
  );
  const modeProgress = useMemo(
    () =>
      snapshot.wordProgress.filter((progress) =>
        Boolean(getWordModeState(progress, mode)),
      ),
    [mode, snapshot.wordProgress],
  );
  const masteredCount = modeProgress.filter(
    (progress) => getWordModeState(progress, mode)?.status === "mastered",
  ).length;
  const nowTimestamp = now ?? Number.NEGATIVE_INFINITY;
  const needsReview = useMemo(
    () =>
      allWords.filter((word) => {
        const progress = progressMap.get(word.id);
        return Boolean(
          progress && needsWordReview(progress, nowTimestamp, mode),
        );
      }).sort((left, right) => {
        const leftProgress = progressMap.get(left.id);
        const rightProgress = progressMap.get(right.id);
        if (!leftProgress || !rightProgress) return 0;
        return compareWordReviewPriority(
          leftProgress,
          rightProgress,
          mode,
          nowTimestamp,
        );
      }),
    [allWords, mode, nowTimestamp, progressMap],
  );
  const filteredWords = useMemo(
    () =>
      searchWords(
        allWords,
        { ...filters, query: debouncedQuery, mode },
        {
          progress: snapshot.wordProgress,
          favorites: snapshot.favorites,
          mistakes: snapshot.mistakes,
          nowTimestamp,
        },
      ),
    [
      debouncedQuery,
      allWords,
      filters,
      mode,
      nowTimestamp,
      snapshot.favorites,
      snapshot.mistakes,
      snapshot.wordProgress,
    ],
  );
  const japaneseLevels = useMemo(
    () => [...new Set(allWords.map((word) => word.japanese.difficulty))],
    [allWords],
  );
  const englishLevels = useMemo(
    () => [...new Set(allWords.map((word) => word.english.difficulty))],
    [allWords],
  );

  const startSession = useCallback(
    (source: SessionSource = "all", selectedMode: StudyMode = mode) => {
      const todayPlan = snapshot.dailyPlans.find(
        (plan) => plan.date === dateKey(new Date()),
      );
      let sourceWords: WordPair[];
      if (source === "review") {
        sourceWords = needsReview;
      } else if (source === "new") {
        const ids = new Set(todayPlan?.newWordIds ?? []);
        sourceWords = allWords.filter((word) => ids.has(word.id));
      } else if (source === "favorites") {
        sourceWords = allWords.filter((word) =>
          snapshot.favorites.includes(`word:${word.id}`),
        );
      } else {
        sourceWords = [...filteredWords].sort((left, right) => {
          const leftState = getWordModeState(progressMap.get(left.id), selectedMode);
          const rightState = getWordModeState(progressMap.get(right.id), selectedMode);
          if (!leftState && rightState) return -1;
          if (leftState && !rightState) return 1;
          return (leftState?.lastStudiedAt ?? "").localeCompare(
            rightState?.lastStudiedAt ?? "",
          );
        });
      }
      const items = sourceWords.slice(0, settings.studyRoundSize);
      if (items.length === 0) return;
      setMode(selectedMode);
      setSessionItems(items);
      setFocusMode(true);
    },
    [
      filteredWords,
      allWords,
      mode,
      needsReview,
      progressMap,
      setFocusMode,
      settings.studyRoundSize,
      snapshot.dailyPlans,
      snapshot.favorites,
    ],
  );

  useEffect(() => {
    if (autoStarted.current || now === null) return;
    const search = new URLSearchParams(window.location.search);
    const requestedMode = search.get("mode");
    const selectedMode: StudyMode =
      requestedMode === "japanese" || requestedMode === "english"
        ? requestedMode
        : requestedMode === "combined"
          ? "combined"
          : mode;
    const source: SessionSource | null =
      search.get("review") === "1"
        ? "review"
        : search.get("plan") === "new"
          ? "new"
          : search.get("favorites") === "1"
            ? "favorites"
            : search.get("study") === "1"
              ? "all"
              : null;
    if (source) {
      autoStarted.current = true;
      const timer = window.setTimeout(() => startSession(source, selectedMode), 0);
      return () => window.clearTimeout(timer);
    }
  }, [mode, now, startSession]);

  if (sessionItems) {
    return (
      <WordStudySession
        items={sessionItems}
        mode={mode}
        onFinish={() => {
          setSessionItems(null);
          setFocusMode(false);
        }}
        onRestart={() => startSession("all")}
        onReviewWeak={() => startSession("review")}
      />
    );
  }

  const clearFilters = () => {
    setQuery("");
    setFilters({
      japaneseLevel: "all",
      englishLevel: "all",
      frequency: "all",
      status: "all",
      favorite: false,
      mistake: false,
      due: false,
    });
  };

  return (
    <div className="page-stack words-page">
      <PageHeader
        eyebrow="第二阶段 · 三模式词汇"
        title="同一组内容，分别建立三条记忆路径"
        description="日英对照、只学日语和只学英语拥有独立复习状态，并统一进入到期队列。"
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

      <section className="mode-picker card" aria-label="学习模式">
        <div><span className="section-kicker">STUDY MODE</span><h2>选择本轮学习模式</h2></div>
        <div className="segmented-control mode-control">
          {(Object.keys(MODE_LABELS) as StudyMode[]).map((item) => (
            <button
              key={item}
              className={mode === item ? "active" : ""}
              onClick={() => setMode(item)}
            >{MODE_LABELS[item]}</button>
          ))}
        </div>
      </section>

      <section className="word-deck-layout">
        <article className="card deck-card">
          <div className="deck-card-top">
            <span className="deck-icon"><BookOpenText size={28} /></span>
            <div className="deck-stat"><strong>{allWords.length}</strong><span>组词汇</span></div>
            <div className="deck-stat"><strong>{modeProgress.length}</strong><span>已学习</span></div>
            <div className="deck-stat"><strong>{masteredCount}</strong><span>已掌握</span></div>
            <div className="deck-stat"><strong>{needsReview.length}</strong><span>今日到期</span></div>
          </div>
          <ProgressBar
            value={(masteredCount / Math.max(1, allWords.length)) * 100}
            label={`${MODE_LABELS[mode]}掌握进度`}
          />
          <div className="deck-controls">
            <label>
              <span><SlidersHorizontal size={17} />本轮数量</span>
              <select
                value={settings.studyRoundSize}
                onChange={(event) =>
                  updateSettings({ studyRoundSize: Number(event.target.value) })
                }
              >
                {[10, 20, 30].map((count) => <option value={count} key={count}>{count} 个</option>)}
                {![10, 20, 30].includes(settings.studyRoundSize) && (
                  <option value={settings.studyRoundSize}>自定义 · {settings.studyRoundSize} 个</option>
                )}
              </select>
            </label>
            <div className="deck-actions">
              {needsReview.length > 0 && (
                <Button variant="secondary" onClick={() => startSession("review")}>
                  <Layers3 size={18} />复习到期内容
                </Button>
              )}
              <Button onClick={() => startSession("all")} disabled={filteredWords.length === 0}>
                <Play size={18} fill="currentColor" />开始一轮
              </Button>
            </div>
          </div>
        </article>

        <aside className="card method-card">
          <span className="section-kicker">SCHEDULER V2</span>
          <h2>每次反馈都会改变复习时间</h2>
          <ol className="step-list">
            <li><span>1</span><div><strong>认识</strong><small>稳定度提高，间隔逐步延长</small></div></li>
            <li><span>2</span><div><strong>模糊</strong><small>降低稳定度，次日再复习</small></div></li>
            <li><span>3</span><div><strong>不认识</strong><small>记录遗忘，约十分钟后重试</small></div></li>
          </ol>
        </aside>
      </section>

      <FilterPanel ariaLabel="单词搜索与筛选">
        <div className="search-field">
          <Search size={18} />
          <label className="sr-only" htmlFor="word-search">搜索单词</label>
          <input
            id="word-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索中文、日语、假名、罗马音、英语、例句或搭配"
          />
        </div>
        <div className="filter-grid">
          <label><span>JLPT</span><select value={filters.japaneseLevel} onChange={(event) => setFilters((current) => ({ ...current, japaneseLevel: event.target.value }))}><option value="all">全部</option>{japaneseLevels.map((level) => <option key={level}>{level}</option>)}</select></label>
          <label><span>英语等级</span><select value={filters.englishLevel} onChange={(event) => setFilters((current) => ({ ...current, englishLevel: event.target.value }))}><option value="all">全部</option>{englishLevels.map((level) => <option key={level}>{level}</option>)}</select></label>
          <label><span>频率</span><select value={filters.frequency} onChange={(event) => setFilters((current) => ({ ...current, frequency: event.target.value as WordSearchFilters["frequency"] }))}><option value="all">全部</option><option>高频</option><option>常用</option><option>普通</option><option>低频</option></select></label>
          <label><span>掌握状态</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as WordSearchFilters["status"] }))}><option value="all">全部</option><option value="unlearned">未学习</option><option value="learning">学习中</option><option value="review">待复习</option><option value="mastered">已掌握</option></select></label>
        </div>
        <div className="filter-toggles">
          <label><input type="checkbox" checked={filters.favorite} onChange={(event) => setFilters((current) => ({ ...current, favorite: event.target.checked }))} />仅收藏</label>
          <label><input type="checkbox" checked={filters.mistake} onChange={(event) => setFilters((current) => ({ ...current, mistake: event.target.checked }))} />仅错词</label>
          <label><input type="checkbox" checked={filters.due} onChange={(event) => setFilters((current) => ({ ...current, due: event.target.checked }))} />仅到期</label>
          <button className="text-button" onClick={clearFilters}><RotateCcw size={15} />清空筛选</button>
          <strong>{filteredWords.length} 个结果</strong>
        </div>
      </FilterPanel>

      <WordLibrary
        words={filteredWords}
        density={settings.displayDensity}
        mode={mode}
        isFavorite={(id) => isFavorite("word", id)}
        onToggleFavorite={(id) => void toggleFavorite("word", id)}
      />
    </div>
  );
}
