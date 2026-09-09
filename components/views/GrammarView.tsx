"use client";

import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  Check,
  Heart,
  Languages,
  Play,
  Quote,
  RotateCcw,
  Route,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLearning } from "@/context/LearningContext";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { dateKey } from "@/lib/learning";
import { searchGrammar, type GrammarSearchFilters } from "@/lib/search";
import type { GrammarViewMode, LearningStatus } from "@/lib/models";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { GrammarPractice } from "@/components/grammar/GrammarPractice";
import { FilterPanel } from "@/components/filters/FilterPanel";

const STATUS_LABEL: Record<LearningStatus, string> = {
  new: "未学习",
  learning: "学习中",
  review: "待复习",
  mastered: "已掌握",
};

/**
 * 137 comparison cards each carry examples, differences and pitfalls; rendering
 * them all at once means thousands of DOM nodes and a very long first paint on
 * a phone. Reveal them in batches instead.
 */
const COMPARISON_PAGE_SIZE = 24;

function grammarLevelBucket(level: string): "N1" | "N2" | "N3" {
  if (/N1/i.test(level)) return "N1";
  if (/N2/i.test(level)) return "N2";
  return "N3";
}

export function GrammarView() {
  const {
    snapshot,
    allGrammar,
    allComparisons,
    isFavorite,
    toggleFavorite,
  } = useLearning();
  const now = useCurrentTime();
  const today = dateKey(new Date());
  const todayPlan = snapshot.dailyPlans.find((item) => item.date === today);
  const todayRecord = snapshot.dailyRecords.find((item) => item.date === today);
  const completedGrammarCount = todayRecord?.grammarStudied ?? 0;
  const todayGrammarId = todayPlan && completedGrammarCount < todayPlan.grammarIds.length
    ? todayPlan.grammarIds[completedGrammarCount]
    : undefined;
  const todayPoint = allGrammar.find((item) => item.id === todayGrammarId);
  const [viewMode, setViewMode] = useState<GrammarViewMode>(todayPoint?.language ?? "japanese");
  const [selectedId, setSelectedId] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState<GrammarSearchFilters["status"]>("all");
  const nowTimestamp = now ?? Number.NEGATIVE_INFINITY;
  const filtered = useMemo(
    () =>
      viewMode === "comparison"
        ? []
        : searchGrammar(
            allGrammar,
            {
              query: debouncedQuery,
              language: viewMode,
              level: "all",
              status,
              favorite: false,
              mistake: false,
              due: false,
            },
            {
              progress: snapshot.grammarProgress,
              favorites: snapshot.favorites,
              mistakes: snapshot.mistakes,
              nowTimestamp,
            },
          ).filter((point) => level === "all" || grammarLevelBucket(point.level) === level),
    [
      debouncedQuery,
      allGrammar,
      level,
      nowTimestamp,
      snapshot.favorites,
      snapshot.grammarProgress,
      snapshot.mistakes,
      status,
      viewMode,
    ],
  );
  const filteredComparisons = useMemo(() => {
    const normalized = debouncedQuery.trim().toLocaleLowerCase("zh-CN");
    return allComparisons.filter((item) => {
      if (
        normalized &&
        ![
          item.semantic,
          item.japanese,
          item.english,
          item.difference,
          item.japaneseExample,
          item.englishExample,
        ].some((value) => value.toLocaleLowerCase("zh-CN").includes(normalized))
      ) return false;
      if (level !== "all" && grammarLevelBucket(item.level) !== level) return false;
      return true;
    });
  }, [allComparisons, debouncedQuery, level]);
  const comparisonItems = useMemo(
    () => detailOpen && selectedId
      ? filteredComparisons.filter((item) => item.id === selectedId)
      : filteredComparisons,
    [detailOpen, filteredComparisons, selectedId],
  );
  const [visibleCount, setVisibleCount] = useState(COMPARISON_PAGE_SIZE);
  const visibleComparisons = detailOpen
    ? comparisonItems
    : comparisonItems.slice(0, visibleCount);
  const selected = filtered.find((point) => point.id === selectedId) ?? filtered.find((point) => point.id === todayGrammarId) ?? filtered[0];
  const progressMap = useMemo(
    () => new Map(snapshot.grammarProgress.map((item) => [item.grammarId, item])),
    [snapshot.grammarProgress],
  );
  const levels = ["N1", "N2", "N3"];

  const changeMode = (next: GrammarViewMode) => {
    setViewMode(next);
    setSelectedId("");
    setDetailOpen(false);
    setPracticing(false);
    setLevel("all");
    setStatus("all");
  };

  useEffect(() => {
    const exitSession = () => setPracticing(false);
    window.addEventListener("linguastep:exit-session", exitSession);
    return () => window.removeEventListener("linguastep:exit-session", exitSession);
  }, []);

  // A new search or filter means the user is looking at a different list;
  // keeping the old batch size would drop them mid-list or hide results.
  useEffect(() => {
    setVisibleCount(COMPARISON_PAGE_SIZE);
  }, [debouncedQuery, level, viewMode]);

  if (practicing && selected) {
    return <GrammarPractice point={selected} onClose={() => setPracticing(false)} />;
  }
  return (
    <div className="page-stack grammar-page">
      <PageHeader
        eyebrow="语法"
        title={todayPoint ? "先完成今日语法" : "学习与比较语法"}
        description={todayPoint ? `今日计划的下一项是“${todayPoint.title}”，完成练习后自动进入下一步。` : `日语 ${allGrammar.filter((item) => item.language === "japanese").length} 项、英语 ${allGrammar.filter((item) => item.language === "english").length} 项。`}
        actions={
          <div className="page-actions">
            <div className="segmented-control" aria-label="语法学习模式">
              <button className={viewMode === "japanese" ? "active" : ""} onClick={() => changeMode("japanese")}>日语 · {allGrammar.filter((item) => item.language === "japanese").length}</button>
              <button className={viewMode === "english" ? "active" : ""} onClick={() => changeMode("english")}>英语 · {allGrammar.filter((item) => item.language === "english").length}</button>
              <button className={viewMode === "comparison" ? "active" : ""} onClick={() => changeMode("comparison")}>日英对比 · {allComparisons.length}</button>
            </div>
          </div>
        }
      />

      {todayPoint && (
        <section className="card next-learning-card">
          <div><span className="section-kicker">TODAY</span><h2>{todayPoint.title}</h2><p>{todayPoint.language === "japanese" ? "日语" : "英语"} · {todayPoint.level} · 今日计划</p></div>
          <Button onClick={() => { setViewMode(todayPoint.language); setSelectedId(todayPoint.id); setPracticing(true); }}><Play size={18} fill="currentColor" />学习并练习当前项</Button>
        </section>
      )}

      <details className="advanced-panel compact-details" open>
        <summary><span><strong>查找其他语法</strong><small>按关键词、难度和掌握状态筛选</small></span></summary>
      <FilterPanel ariaLabel="语法搜索与筛选">
        <div className="search-field">
          <Search size={18} />
          <label className="sr-only" htmlFor="grammar-search">搜索语法</label>
          <input id="grammar-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索语法名称、解释、结构或例句" />
        </div>
        <div className="filter-grid compact-filters">
          <label><span>难度</span><select value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">全部</option>{levels.map((item) => <option key={item}>{item}</option>)}</select></label>
          {viewMode !== "comparison" && (
            <label><span>掌握状态</span><select value={status} onChange={(event) => setStatus(event.target.value as GrammarSearchFilters["status"])}><option value="all">全部</option><option value="unlearned">未学习</option><option value="learning">学习中</option><option value="review">待复习</option><option value="mastered">已掌握</option></select></label>
          )}
        </div>
        <div className="filter-toggles">
          <button className="text-button" onClick={() => { setQuery(""); setLevel("all"); setStatus("all"); }}><RotateCcw size={15} />清空筛选</button>
          <strong>{viewMode === "comparison" ? filteredComparisons.length : filtered.length} 个结果</strong>
        </div>
      </FilterPanel>
      </details>

      {viewMode === "comparison" ? (
        comparisonItems.length === 0 ? (
          <EmptyState title="没有符合条件的语法对比" description="调整关键词或筛选条件后再试。" />
        ) : (
          <section className={`comparison-grid${detailOpen ? " detail-mode" : ""}`}>
            {detailOpen && <button className="detail-back-button comparison-back-button" onClick={() => setDetailOpen(false)}><ArrowLeft size={16} />返回对比列表</button>}
            {visibleComparisons.map((item) => (
              <article className={`comparison-card card${detailOpen ? "" : " compact"}`} key={item.id}>
                <div className="grammar-title-row">
                  <button className="comparison-card-heading" onClick={() => { setSelectedId(item.id); setDetailOpen(true); }}><span className="section-kicker">{item.level}</span><h2>{item.semantic}</h2></button>
                  <button className={`favorite-button${isFavorite("comparison", item.id) ? " active" : ""}`} onClick={() => void toggleFavorite("comparison", item.id)} aria-label={isFavorite("comparison", item.id) ? "取消收藏对比" : "收藏对比"}><Heart size={18} fill={isFavorite("comparison", item.id) ? "currentColor" : "none"} /></button>
                </div>
                <div className="comparison-language-grid">
                  <div><span className="language-label jp">日</span><strong>{item.japanese}</strong><p>{item.japaneseExample}</p></div>
                  <div><span className="language-label en">英</span><strong>{item.english}</strong><p>{item.englishExample}</p></div>
                </div>
                <p>{item.translationZh}</p>
                <div className="review-explanation">{item.difference}</div>
                <ul className="plain-list">{item.pitfalls.map((pitfall) => <li key={pitfall}>{pitfall}</li>)}</ul>
                {!detailOpen && <button className="text-button comparison-open-button" onClick={() => { setSelectedId(item.id); setDetailOpen(true); }}>查看完整对比 <ArrowLeft size={15} className="comparison-open-arrow" /></button>}
              </article>
            ))}
            {!detailOpen && visibleCount < comparisonItems.length && (
              <button className="load-more-button" onClick={() => setVisibleCount((count) => count + COMPARISON_PAGE_SIZE)}>
                显示更多对比（已显示 {visibleCount} / {comparisonItems.length}）
              </button>
            )}
          </section>
        )
      ) : filtered.length === 0 ? (
        <EmptyState title="没有符合条件的语法" description="调整关键词或筛选条件后再试。" />
      ) : (
        <section className={`grammar-layout${detailOpen ? " detail-mode" : ""}`}>
          <aside className="grammar-list card" aria-label="语法知识点列表">
            <div className="grammar-list-heading"><span>{viewMode === "japanese" ? "日语语法" : "英语语法"}</span><strong>{filtered.length} 个知识点</strong></div>
            <div className="grammar-list-scroll">
              {filtered.map((point, index) => {
                const progress = progressMap.get(point.id);
                return (
                  <button className={`grammar-list-item${selected?.id === point.id ? " active" : ""}`} onClick={() => { setSelectedId(point.id); setDetailOpen(true); }} key={point.id}>
                    <span className="grammar-index">{String(index + 1).padStart(2, "0")}</span>
                    <span><strong>{point.title}</strong><small>{grammarLevelBucket(point.level)} · {progress ? STATUS_LABEL[progress.status] : "未学习"}</small></span>
                    {progress?.status === "mastered" && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </aside>

          {selected && (
            <article className="grammar-detail card">
              <button className="detail-back-button" onClick={() => setDetailOpen(false)}><ArrowLeft size={16} />返回语法列表</button>
              <div className="grammar-title-row">
                <div><div className="tag-row"><span>{grammarLevelBucket(selected.level)}</span><span>{selected.language === "japanese" ? "日语" : "英语"}</span>{progressMap.get(selected.id) && <span>{STATUS_LABEL[progressMap.get(selected.id)!.status]}</span>}</div><h2>{selected.title}</h2></div>
                <button className={`favorite-button large${isFavorite("grammar", selected.id) ? " active" : ""}`} onClick={() => void toggleFavorite("grammar", selected.id)} aria-label={isFavorite("grammar", selected.id) ? "取消收藏语法" : "收藏语法"}><Heart size={20} fill={isFavorite("grammar", selected.id) ? "currentColor" : "none"} /></button>
              </div>
              <section className="grammar-explanation"><p>{selected.explanation}</p></section>
              <div className="grammar-core-grid">
                <section className="info-panel structure"><span className="info-icon"><Route size={19} /></span><div><small>句型结构</small><strong>{selected.structure}</strong></div></section>
                <section className="info-panel connection"><span className="info-icon"><BookOpenCheck size={19} /></span><div><small>接续方式</small><strong>{selected.connection}</strong></div></section>
              </div>
              <section className="detail-section"><h3>使用场景与语气</h3><p>{selected.nuance}</p><ul className="plain-list">{selected.scenarios.map((scenario) => <li key={scenario}>{scenario}</li>)}</ul></section>
              <section className="detail-section"><h3><Quote size={18} />例句</h3><div className="example-list">{selected.examples.map((example) => <div className="grammar-example" key={example.text}><p>{example.text}</p><span>{example.translationZh}</span></div>)}</div></section>
              <section className="comparison-box"><div className="comparison-heading"><Languages size={19} /><strong>日英表达对比</strong></div><div className="comparison-lines"><p><span className="language-label jp">日</span>{selected.comparison.japanese}</p><p><span className="language-label en">英</span>{selected.comparison.english}</p><small>{selected.comparison.translationZh}</small></div></section>
              <div className="warning-grid">
                <section className="warning-panel"><h3><AlertCircle size={18} />常见错误</h3><ul>{selected.commonErrors.map((item) => <li key={item}>{item}</li>)}</ul></section>
                <section className="warning-panel confusion"><h3><Languages size={18} />易混淆语法</h3><ul>{selected.confusables.map((item) => <li key={item}>{item}</li>)}</ul>{selected.confusableDifferences && <ul>{selected.confusableDifferences.map((item) => <li key={item}>{item}</li>)}</ul>}</section>
              </div>
              <div className="grammar-cta"><div><strong>准备好了吗？</strong><span>完成练习后会立即计算下次复习时间</span></div><Button onClick={() => setPracticing(true)}><Play size={18} fill="currentColor" />开始练习</Button></div>
            </article>
          )}
        </section>
      )}
    </div>
  );
}
