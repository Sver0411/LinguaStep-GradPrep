"use client";

import {
  BookOpenText,
  Play,
  RotateCcw,
  Search,
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
import { shuffled } from "@/lib/shuffle";
import type { StudyMode, WordPair } from "@/lib/models";
import { Button, PageHeader, ProgressBar } from "@/components/ui";
import { WordLibrary } from "@/components/words/WordLibrary";
import { WordStudySession } from "@/components/words/WordStudySession";
import { FilterPanel } from "@/components/filters/FilterPanel";
import {
  ENGLISH_STUDY_LEVELS,
  JAPANESE_STUDY_LEVELS,
} from "@/lib/word-levels";

type SessionSource = "all" | "review" | "new" | "favorites";

const MODE_LABELS: Record<StudyMode, string> = {
  combined: "日英混合",
  japanese: "日语",
  english: "英语",
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
  const [pageMode, setPageMode] = useState<"study" | "library">("study");
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
        {
          ...filters,
          query: pageMode === "library" ? debouncedQuery : "",
          mode,
          status: pageMode === "study" ? "all" : filters.status,
          japaneseLevel:
            pageMode === "study" && mode === "english"
              ? "all"
              : filters.japaneseLevel,
          englishLevel:
            pageMode === "study" && mode === "japanese"
              ? "all"
              : filters.englishLevel,
        },
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
      pageMode,
      snapshot.favorites,
      snapshot.mistakes,
      snapshot.wordProgress,
    ],
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
        sourceWords = allWords.filter(
          (word) => ids.has(word.id) && !getWordModeState(progressMap.get(word.id), selectedMode),
        );
      } else if (source === "favorites") {
        sourceWords = allWords.filter((word) =>
          snapshot.favorites.includes(`word:${word.id}`),
        );
      } else {
        const orderedWords = [...filteredWords].sort((left, right) => {
          const leftState = getWordModeState(progressMap.get(left.id), selectedMode);
          const rightState = getWordModeState(progressMap.get(right.id), selectedMode);
          if (!leftState && rightState) return -1;
          if (leftState && !rightState) return 1;
          return (leftState?.lastStudiedAt ?? "").localeCompare(
            rightState?.lastStudiedAt ?? "",
          );
        });
        const newWords = orderedWords.filter(
          (word) => !getWordModeState(progressMap.get(word.id), selectedMode),
        );
        const studiedWords = orderedWords.filter((word) =>
          Boolean(getWordModeState(progressMap.get(word.id), selectedMode)),
        );
        sourceWords = [...shuffled(newWords), ...shuffled(studiedWords)];
      }
      const items = (source === "all" ? sourceWords : shuffled(sourceWords)).slice(
        0,
        settings.studyRoundSize,
      );
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

  const startFreshSession = useCallback(
    (source: SessionSource, selectedMode: StudyMode = mode) => {
      setSessionItems(null);
      setFocusMode(false);
      window.setTimeout(() => startSession(source, selectedMode), 0);
    },
    [mode, setFocusMode, startSession],
  );

  const continuePlan = useCallback(
    (href: string) => {
      const target = new URL(href, window.location.origin);
      const requestedMode = target.searchParams.get("mode");
      const selectedMode: StudyMode =
        requestedMode === "japanese" || requestedMode === "english" || requestedMode === "combined"
          ? requestedMode
          : mode;
      const source: SessionSource = target.searchParams.get("review") === "1"
        ? "review"
        : target.searchParams.get("plan") === "new"
          ? "new"
          : "all";
      startFreshSession(source, selectedMode);
    },
    [mode, startFreshSession],
  );

  const reviewUnknown = useCallback(
    (unknownItems: WordPair[]) => {
      if (unknownItems.length === 0) return;
      const nextItems = shuffled(unknownItems);
      setSessionItems(null);
      setFocusMode(false);
      window.setTimeout(() => {
        setSessionItems(nextItems);
        setFocusMode(true);
      }, 0);
    },
    [setFocusMode],
  );

  useEffect(() => {
    const exitSession = () => {
      setSessionItems(null);
      setFocusMode(false);
    };
    window.addEventListener("linguastep:exit-session", exitSession);
    return () => window.removeEventListener("linguastep:exit-session", exitSession);
  }, [setFocusMode]);

  if (sessionItems) {
    return (
      <WordStudySession
        items={sessionItems}
        mode={mode}
        onFinish={() => {
          setSessionItems(null);
          setFocusMode(false);
        }}
        onRestart={() => startFreshSession("all")}
        onContinuePlan={continuePlan}
        onReviewUnknown={reviewUnknown}
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

  const changeStudyMode = (nextMode: StudyMode) => {
    setMode(nextMode);
    setFilters((current) => ({
      ...current,
      japaneseLevel:
        nextMode === "english" || nextMode === "combined"
          ? "all"
          : current.japaneseLevel,
      englishLevel:
        nextMode === "japanese" || nextMode === "combined"
          ? "all"
          : current.englishLevel,
      status: "all",
    }));
  };

  return (
    <div className="page-stack words-page">
      <PageHeader
        eyebrow="单词"
        title={pageMode === "study" ? "开始一轮单词学习" : "浏览与检索词库"}
        description={pageMode === "study" ? "先选择学习语言，再按对应难度开始本轮学习。" : `词库共 ${allWords.length} 组，可按语言难度和掌握状态检索。`}
        actions={
          <div className="segmented-control" aria-label="单词页面模式">
            <button className={pageMode === "study" ? "active" : ""} onClick={() => setPageMode("study")}>开始学习</button>
            <button className={pageMode === "library" ? "active" : ""} onClick={() => setPageMode("library")}>浏览词库</button>
          </div>
        }
      />

      {pageMode === "study" && <>
      <section className="word-deck-layout single-column">
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
          <div className="study-filter-block" aria-label="本轮学习筛选">
            <div className="study-filter-heading">
              <div><strong>选择本轮内容</strong><span>先选语言，再选择对应等级和数量。</span></div>
              <strong className="study-filter-count">{filteredWords.length} 组可学习</strong>
            </div>
            <div className="study-mode-picker">
              <span>1. 学习语言</span>
              <div className="segmented-control">{(Object.keys(MODE_LABELS) as StudyMode[]).map((item) => <button type="button" className={mode === item ? "active" : ""} onClick={() => changeStudyMode(item)} key={item}>{MODE_LABELS[item]}</button>)}</div>
            </div>
            <div className="filter-grid">
              {mode !== "english" && <label><span>2. 日语难度</span><select value={filters.japaneseLevel} onChange={(event) => setFilters((current) => ({ ...current, japaneseLevel: event.target.value }))}><option value="all">全部</option>{JAPANESE_STUDY_LEVELS.map((level) => <option key={level}>{level}</option>)}</select></label>}
              {mode !== "japanese" && <label><span>2. 英语难度</span><select value={filters.englishLevel} onChange={(event) => setFilters((current) => ({ ...current, englishLevel: event.target.value }))}><option value="all">全部</option>{ENGLISH_STUDY_LEVELS.map((level) => <option value={level} key={level}>{level === "CET-4" ? "四级" : level === "CET-6" ? "六级" : level}</option>)}</select></label>}
              <label><span>本次数量</span><select value={settings.studyRoundSize} onChange={(event) => updateSettings({ studyRoundSize: Number(event.target.value) })}>{[10, 20, 30].map((count) => <option value={count} key={count}>{count} 个</option>)}{![10, 20, 30].includes(settings.studyRoundSize) && <option value={settings.studyRoundSize}>{settings.studyRoundSize} 个</option>}</select></label>
            </div>
            <div className="study-filter-actions">
              <button className="text-button" onClick={clearFilters}><RotateCcw size={15} />清空筛选</button>
            </div>
          </div>
          <div className="deck-controls">
            <div className="deck-actions">
              <Button onClick={() => startSession("all")} disabled={filteredWords.length === 0}>
                <Play size={18} fill="currentColor" />开始学习
              </Button>
            </div>
          </div>
        </article>

        <details className="card method-card compact-details">
          <summary><span><strong>复习时间如何计算</strong><small>认识、模糊和不认识会形成不同间隔</small></span></summary>
          <ol className="step-list">
            <li><span>1</span><div><strong>认识</strong><small>稳定度提高，间隔逐步延长</small></div></li>
            <li><span>2</span><div><strong>模糊</strong><small>降低稳定度，次日再复习</small></div></li>
            <li><span>3</span><div><strong>不认识</strong><small>记录遗忘，约十分钟后重试</small></div></li>
          </ol>
        </details>
      </section>

      </>}

      {pageMode === "library" && <>
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
          <label><span>日语等级</span><select value={filters.japaneseLevel} onChange={(event) => setFilters((current) => ({ ...current, japaneseLevel: event.target.value }))}><option value="all">全部</option>{JAPANESE_STUDY_LEVELS.map((level) => <option key={level}>{level}</option>)}</select></label>
          <label><span>英语等级</span><select value={filters.englishLevel} onChange={(event) => setFilters((current) => ({ ...current, englishLevel: event.target.value }))}><option value="all">全部</option>{ENGLISH_STUDY_LEVELS.map((level) => <option value={level} key={level}>{level === "CET-4" ? "四级" : level === "CET-6" ? "六级" : level}</option>)}</select></label>
          <label><span>掌握状态</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as WordSearchFilters["status"] }))}><option value="all">全部</option><option value="unlearned">未学习</option><option value="learning">学习中</option><option value="review">待复习</option><option value="mastered">已掌握</option></select></label>
        </div>
        <div className="filter-toggles">
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
      </>}
    </div>
  );
}
