"use client";

import {
  AlertCircle,
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
import { useMemo, useState } from "react";
import { GRAMMAR_POINTS } from "@/data/grammar";
import { GRAMMAR_COMPARISONS } from "@/data/grammar-comparisons";
import { useLearning } from "@/context/LearningContext";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { searchGrammar, type GrammarSearchFilters } from "@/lib/search";
import type {
  GrammarComparison,
  GrammarViewMode,
  LearningStatus,
} from "@/lib/models";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { ComparisonPractice } from "@/components/grammar/ComparisonPractice";
import { GrammarPractice } from "@/components/grammar/GrammarPractice";
import { FilterPanel } from "@/components/filters/FilterPanel";

const STATUS_LABEL: Record<LearningStatus, string> = {
  new: "未学习",
  learning: "学习中",
  review: "待复习",
  mastered: "已掌握",
};

export function GrammarView() {
  const { snapshot, isFavorite, toggleFavorite } = useLearning();
  const now = useCurrentTime();
  const [viewMode, setViewMode] = useState<GrammarViewMode>("japanese");
  const [selectedId, setSelectedId] = useState("");
  const [practicing, setPracticing] = useState(false);
  const [comparisonPractice, setComparisonPractice] =
    useState<GrammarComparison | null>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState<GrammarSearchFilters["status"]>("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [mistakeOnly, setMistakeOnly] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const nowTimestamp = now ?? Number.NEGATIVE_INFINITY;
  const filtered = useMemo(
    () =>
      viewMode === "comparison"
        ? []
        : searchGrammar(
            GRAMMAR_POINTS,
            {
              query: debouncedQuery,
              language: viewMode,
              level,
              status,
              favorite: favoriteOnly,
              mistake: mistakeOnly,
              due: dueOnly,
            },
            {
              progress: snapshot.grammarProgress,
              favorites: snapshot.favorites,
              mistakes: snapshot.mistakes,
              nowTimestamp,
            },
          ),
    [
      debouncedQuery,
      dueOnly,
      favoriteOnly,
      level,
      mistakeOnly,
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
    return GRAMMAR_COMPARISONS.filter((item) => {
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
      if (level !== "all" && item.level !== level) return false;
      if (favoriteOnly && !snapshot.favorites.includes(`comparison:${item.id}`)) return false;
      if (
        mistakeOnly &&
        !snapshot.mistakes.some(
          (mistake) =>
            mistake.active &&
            mistake.contentRef.source === "comparison" &&
            mistake.contentRef.sourceId === item.id,
        )
      ) return false;
      return true;
    });
  }, [debouncedQuery, favoriteOnly, level, mistakeOnly, snapshot.favorites, snapshot.mistakes]);
  const selected = filtered.find((point) => point.id === selectedId) ?? filtered[0];
  const progressMap = useMemo(
    () => new Map(snapshot.grammarProgress.map((item) => [item.grammarId, item])),
    [snapshot.grammarProgress],
  );
  const levels = useMemo(
    () =>
      viewMode === "comparison"
        ? [...new Set(GRAMMAR_COMPARISONS.map((item) => item.level))]
        : [
            ...new Set(
              GRAMMAR_POINTS.filter((point) => point.language === viewMode).map(
                (point) => point.level,
              ),
            ),
          ],
    [viewMode],
  );

  const changeMode = (next: GrammarViewMode) => {
    setViewMode(next);
    setSelectedId("");
    setPracticing(false);
    setComparisonPractice(null);
    setLevel("all");
    setStatus("all");
    setDueOnly(false);
  };

  if (practicing && selected) {
    return <GrammarPractice point={selected} onClose={() => setPracticing(false)} />;
  }
  if (comparisonPractice) {
    return (
      <ComparisonPractice
        comparison={comparisonPractice}
        onClose={() => setComparisonPractice(null)}
      />
    );
  }

  return (
    <div className="page-stack grammar-page">
      <PageHeader
        eyebrow="第二阶段 · 语法系统"
        title="分别学习，也按相似语义进行比较"
        description="日语 35 项、英语 15 项，并提供 15 组非逐字对应的日英语法对比。"
        actions={
          <div className="segmented-control" aria-label="语法学习模式">
            <button className={viewMode === "japanese" ? "active" : ""} onClick={() => changeMode("japanese")}>日语 · 35</button>
            <button className={viewMode === "english" ? "active" : ""} onClick={() => changeMode("english")}>英语 · 15</button>
            <button className={viewMode === "comparison" ? "active" : ""} onClick={() => changeMode("comparison")}>日英对比 · 15</button>
          </div>
        }
      />

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
          <label><input type="checkbox" checked={favoriteOnly} onChange={(event) => setFavoriteOnly(event.target.checked)} />仅收藏</label>
          <label><input type="checkbox" checked={mistakeOnly} onChange={(event) => setMistakeOnly(event.target.checked)} />仅错题</label>
          {viewMode !== "comparison" && <label><input type="checkbox" checked={dueOnly} onChange={(event) => setDueOnly(event.target.checked)} />仅到期</label>}
          <button className="text-button" onClick={() => { setQuery(""); setLevel("all"); setStatus("all"); setFavoriteOnly(false); setMistakeOnly(false); setDueOnly(false); }}><RotateCcw size={15} />清空筛选</button>
          <strong>{viewMode === "comparison" ? filteredComparisons.length : filtered.length} 个结果</strong>
        </div>
      </FilterPanel>

      {viewMode === "comparison" ? (
        filteredComparisons.length === 0 ? (
          <EmptyState title="没有符合条件的语法对比" description="调整关键词或筛选条件后再试。" />
        ) : (
          <section className="comparison-grid">
            {filteredComparisons.map((item) => (
              <article className="comparison-card card" key={item.id}>
                <div className="grammar-title-row">
                  <div><span className="section-kicker">{item.level}</span><h2>{item.semantic}</h2></div>
                  <button className={`favorite-button${isFavorite("comparison", item.id) ? " active" : ""}`} onClick={() => void toggleFavorite("comparison", item.id)} aria-label={isFavorite("comparison", item.id) ? "取消收藏对比" : "收藏对比"}><Heart size={18} fill={isFavorite("comparison", item.id) ? "currentColor" : "none"} /></button>
                </div>
                <div className="comparison-language-grid">
                  <div><span className="language-label jp">日</span><strong>{item.japanese}</strong><p>{item.japaneseExample}</p></div>
                  <div><span className="language-label en">英</span><strong>{item.english}</strong><p>{item.englishExample}</p></div>
                </div>
                <p>{item.translationZh}</p>
                <div className="review-explanation">{item.difference}</div>
                <ul className="plain-list">{item.pitfalls.map((pitfall) => <li key={pitfall}>{pitfall}</li>)}</ul>
                <Button variant="secondary" onClick={() => setComparisonPractice(item)}><Play size={17} />练习这组对比</Button>
              </article>
            ))}
          </section>
        )
      ) : filtered.length === 0 ? (
        <EmptyState title="没有符合条件的语法" description="调整关键词或筛选条件后再试。" />
      ) : (
        <section className="grammar-layout">
          <aside className="grammar-list card" aria-label="语法知识点列表">
            <div className="grammar-list-heading"><span>{viewMode === "japanese" ? "日语语法" : "英语语法"}</span><strong>{filtered.length} 个知识点</strong></div>
            <div className="grammar-list-scroll">
              {filtered.map((point, index) => {
                const progress = progressMap.get(point.id);
                return (
                  <button className={`grammar-list-item${selected?.id === point.id ? " active" : ""}`} onClick={() => setSelectedId(point.id)} key={point.id}>
                    <span className="grammar-index">{String(index + 1).padStart(2, "0")}</span>
                    <span><strong>{point.title}</strong><small>{point.level} · {progress ? STATUS_LABEL[progress.status] : "未学习"}</small></span>
                    {progress?.status === "mastered" && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </aside>

          {selected && (
            <article className="grammar-detail card">
              <div className="grammar-title-row">
                <div><div className="tag-row"><span>{selected.level}</span><span>{selected.language === "japanese" ? "日语" : "英语"}</span>{progressMap.get(selected.id) && <span>{STATUS_LABEL[progressMap.get(selected.id)!.status]}</span>}</div><h2>{selected.title}</h2></div>
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
                <section className="warning-panel confusion"><h3><Languages size={18} />易混淆语法</h3><ul>{selected.confusables.map((item) => <li key={item}>{item}</li>)}</ul></section>
              </div>
              <div className="grammar-cta"><div><strong>准备好了吗？</strong><span>完成练习后会立即计算下次复习时间</span></div><Button onClick={() => setPracticing(true)}><Play size={18} fill="currentColor" />开始练习</Button></div>
            </article>
          )}
        </section>
      )}
    </div>
  );
}
