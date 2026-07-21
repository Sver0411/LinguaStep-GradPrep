"use client";

import Link from "next/link";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Heart,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLearning } from "@/context/LearningContext";
import { isAnswerCorrect } from "@/lib/learning";
import type { MistakeRecord, MistakeState, QuestionSource } from "@/lib/models";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { AIExplanationPanel } from "@/components/ai/AIExplanationPanel";

type MistakeLanguage = "all" | "japanese" | "english" | "mixed";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function sourceLabel(mistake: MistakeRecord, grammar: ReturnType<typeof useLearning>["allGrammar"]): string {
  if (mistake.contentRef.source === "comparison") return "日英对比";
  if (mistake.contentRef.source === "word") return "单词";
  const point = grammar.find(
    (point) => point.id === mistake.contentRef.sourceId,
  );
  return point?.language === "english" ? "英语语法" : "日语语法";
}

function mistakeLanguage(mistake: MistakeRecord, grammar: ReturnType<typeof useLearning>["allGrammar"]): Exclude<MistakeLanguage, "all"> {
  if (mistake.contentRef.source === "comparison") return "mixed";
  if (mistake.contentRef.source === "word") {
    return mistake.question.language === "english"
      ? "english"
      : mistake.question.language === "japanese"
        ? "japanese"
        : "mixed";
  }
  return grammar.find(
    (point) => point.id === mistake.contentRef.sourceId,
  )?.language ?? "japanese";
}

const STATE_LABEL: Record<MistakeState, string> = {
  active: "活跃错题",
  consolidating: "巩固中",
  mastered: "已掌握",
  archived: "已归档",
};

export function MistakesView() {
  const {
    snapshot,
    allGrammar,
    answerMistake,
    setMistakeState,
    removeMistake,
    toggleMistakeFavorite,
    setFocusMode,
  } = useLearning();
  const [stateFilter, setStateFilter] = useState<MistakeState | "all">("active");
  const [sourceFilter, setSourceFilter] = useState<QuestionSource | "all">("all");
  const [languageFilter, setLanguageFilter] = useState<MistakeLanguage>("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "errors" | "streak">("recent");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [reviewing, setReviewing] = useState<MistakeRecord | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [reviewResult, setReviewResult] = useState<MistakeRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const autoStarted = useRef(false);
  const activeQueue = useMemo(
    () => [...snapshot.mistakes].filter((item) => item.active).sort((left, right) => right.priority - left.priority || right.lastWrongAt.localeCompare(left.lastWrongAt)),
    [snapshot.mistakes],
  );
  const visible = useMemo(() => {
    const values = snapshot.mistakes.filter((item) => {
      if (stateFilter !== "all" && item.state !== stateFilter) return false;
      if (sourceFilter !== "all" && item.contentRef.source !== sourceFilter) return false;
      if (languageFilter !== "all" && mistakeLanguage(item, allGrammar) !== languageFilter) return false;
      if (difficultyFilter !== "all" && item.question.difficulty !== difficultyFilter) return false;
      if (favoriteOnly && !item.favorite) return false;
      return true;
    });
    return values.sort((left, right) => {
      if (sortBy === "errors") return right.errorCount - left.errorCount;
      if (sortBy === "streak") return right.correctStreak - left.correctStreak;
      return right.lastAnsweredAt.localeCompare(left.lastAnsweredAt);
    });
  }, [allGrammar, difficultyFilter, favoriteOnly, languageFilter, snapshot.mistakes, sortBy, sourceFilter, stateFilter]);
  const difficultyOptions = useMemo(
    () => [...new Set(snapshot.mistakes.map((item) => item.question.difficulty).filter((item): item is string => Boolean(item)))],
    [snapshot.mistakes],
  );
  const counts = useMemo(
    () =>
      snapshot.mistakes.reduce<Record<MistakeState, number>>(
        (result, item) => ({ ...result, [item.state]: result[item.state] + 1 }),
        { active: 0, consolidating: 0, mastered: 0, archived: 0 },
      ),
    [snapshot.mistakes],
  );

  useEffect(() => {
    if (!reviewing || reviewResult) return;
    const handleKey = (event: KeyboardEvent) => {
      const number = Number(event.key);
      if (number >= 1 && number <= 4) setSelectedIndex(number - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [reviewResult, reviewing]);

  const startReview = useCallback((mistake: MistakeRecord) => {
    setReviewing(mistake);
    setSelectedIndex(null);
    setReviewResult(null);
    setFocusMode(true);
  }, [setFocusMode]);

  useEffect(() => {
    if (autoStarted.current || activeQueue.length === 0 || reviewing) return;
    if (new URLSearchParams(window.location.search).get("review") !== "1") return;
    autoStarted.current = true;
    const timer = window.setTimeout(() => startReview(activeQueue[0]), 0);
    return () => window.clearTimeout(timer);
  }, [activeQueue, reviewing, startReview]);

  const continueReview = () => {
    if (!reviewing) return;
    const latestCurrent = snapshot.mistakes.find((item) => item.id === reviewing.id);
    const nextMistake = activeQueue.find((item) => item.id !== reviewing.id) ?? (latestCurrent?.active ? latestCurrent : undefined);
    if (nextMistake) startReview(nextMistake);
    else {
      setReviewing(null);
      setReviewResult(null);
      setFocusMode(false);
    }
  };

  const submitReview = async () => {
    if (!reviewing || selectedIndex === null || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const updated = await answerMistake(reviewing.id, selectedIndex);
      setReviewResult(updated);
      setFocusMode(false);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (reviewing) {
    const question = reviewing.question;
    const correct =
      selectedIndex !== null && isAnswerCorrect(question, selectedIndex);
    return (
      <section className="quiz-session mistake-review-session">
        <div className="session-topline"><span>{sourceLabel(reviewing, allGrammar)}再次练习</span><strong>连续答对 {reviewing.correctStreak} 次</strong></div>
        <article className="question-card card">
          <span className="question-type">{sourceLabel(reviewing, allGrammar)}</span>
          {question.context && <p className="question-context">{question.context}</p>}
          <h1>{question.prompt}</h1>
          <div className="option-list">
            {question.options.map((option, optionIndex) => {
              const selected = selectedIndex === optionIndex;
              const submitted = reviewResult !== null;
              const showCorrect = submitted && optionIndex === question.correctIndex;
              const showWrong = submitted && selected && !correct;
              return (
                <button className={`quiz-option${selected ? " selected" : ""}${showCorrect ? " correct" : ""}${showWrong ? " wrong" : ""}`} key={`${option}-${optionIndex}`} onClick={() => !submitted && setSelectedIndex(optionIndex)} disabled={submitted}>
                  <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{showCorrect && <CheckCircle2 size={20} />}{showWrong && <XCircle size={20} />}
                </button>
              );
            })}
          </div>
          {reviewResult && (
            <div className={`answer-explanation ${correct ? "correct" : "wrong"}`}>
              <strong>{correct ? (reviewResult.active ? `答对了，当前状态：${STATE_LABEL[reviewResult.state]}` : "已掌握，这道题已移出活跃列表") : "再次答错，复习优先级已提高"}</strong>
              <p>{question.explanation}</p>
            </div>
          )}
          {reviewResult && !correct && selectedIndex !== null && <AIExplanationPanel question={question} selectedIndex={selectedIndex} />}
          <div className="question-footer">
            <button className="text-button" onClick={() => { setReviewing(null); setFocusMode(false); }}>退出练习</button>
            {!reviewResult ? <Button onClick={() => void submitReview()} disabled={selectedIndex === null || submitting}>提交答案</Button> : <Button onClick={continueReview}>{activeQueue.some((item) => item.id !== reviewing.id) ? "下一道错题" : "完成本轮巩固"}<ArrowRight size={18} /></Button>}
          </div>
        </article>
      </section>
    );
  }

  return (
    <div className="page-stack mistakes-page">
      <PageHeader
        eyebrow="错题巩固"
        title={activeQueue.length > 0 ? `${activeQueue.length} 道活跃错题待处理` : "活跃错题已清空"}
        description="直接开始一轮巩固；筛选、归档和删除等管理操作按需展开。"
        actions={<div className="page-actions">{activeQueue.length > 0 && <Button onClick={() => startReview(activeQueue[0])}><RotateCcw size={17} />开始复习活跃错题</Button>}<Link className="button button-secondary" href="/test?source=mistakes&start=1">错题专项测试</Link></div>}
      />

      <details className="advanced-panel compact-details">
      <summary><span><strong>筛选与管理错题</strong><small>状态、来源、语言、难度和排序</small></span></summary>
      <FilterPanel ariaLabel="错题筛选" className="mistake-filter-panel">
        <div className="segmented-control wrap-control">
          {(["active","consolidating","mastered","archived","all"] as const).map((state) => (
            <button className={stateFilter === state ? "active" : ""} onClick={() => setStateFilter(state)} key={state}>{state === "all" ? `全部 · ${snapshot.mistakes.length}` : `${STATE_LABEL[state]} · ${counts[state]}`}</button>
          ))}
        </div>
        <div className="filter-grid compact-filters">
          <label><span>来源</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as QuestionSource | "all")}><option value="all">全部来源</option><option value="word">单词</option><option value="grammar">语法</option><option value="comparison">日英对比</option></select></label>
          <label><span>排序</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="recent">最近答错</option><option value="errors">错误次数</option><option value="streak">连续答对</option></select></label>
          <label><span>语言</span><select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value as MistakeLanguage)}><option value="all">全部语言</option><option value="japanese">日语</option><option value="english">英语</option><option value="mixed">日英对比</option></select></label>
          <label><span>难度</span><select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}><option value="all">全部难度</option>{difficultyOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="checkbox-filter"><input type="checkbox" checked={favoriteOnly} onChange={(event) => setFavoriteOnly(event.target.checked)} />仅收藏错题</label>
        </div>
      </FilterPanel>
      </details>

      {visible.length === 0 ? (
        <EmptyState title="这个分类暂时没有错题" description="继续学习或切换筛选条件，新的薄弱点会自动整理到这里。" action={<Link className="button button-primary" href="/test">去做测试</Link>} />
      ) : (
        <div className="mistake-list">
          {visible.map((mistake) => (
            <article className={`mistake-card card${mistake.active ? "" : " mastered"}`} key={mistake.id}>
              <div className="mistake-status-column">
                <span className={`source-icon ${mistake.question.source}`}>{mistake.active ? <AlertCircle size={21} /> : <CheckCircle2 size={21} />}</span>
                <span className="priority-bars" aria-label={`优先级 ${mistake.priority}`}>{[1,2,3,4,5].map((level) => <i className={level <= Math.min(5, mistake.priority) ? "active" : ""} key={level} />)}</span>
              </div>
              <div className="mistake-main">
                <div className="mistake-meta"><span>{sourceLabel(mistake, allGrammar)} · {STATE_LABEL[mistake.state]}</span><span><Clock3 size={14} />{formatDate(mistake.lastWrongAt)}</span></div>
                <h2>{mistake.question.prompt}</h2>
                <p>正确答案：<strong>{mistake.question.options[mistake.question.correctIndex]}</strong></p>
                <div className="mistake-explanation">{mistake.question.explanation}</div>
                <AIExplanationPanel question={mistake.question} selectedIndex={mistake.selectedIndex} />
                <div className="mistake-stats"><span>错误 <b>{mistake.errorCount}</b> 次</span><span>连续答对 <b>{mistake.correctStreak}</b></span><span>历史记录 <b>{mistake.history.length}</b> 条</span></div>
                <details className="history-details"><summary>查看错误历史</summary><ul>{[...mistake.history].reverse().slice(0, 8).map((item, index) => <li key={`${item.answeredAt}-${index}`}>{formatDate(item.answeredAt)} · {item.correct ? "答对" : "答错"} · 选择 {String.fromCharCode(65 + item.selectedIndex)}</li>)}</ul></details>
              </div>
              <div className="mistake-actions-column">
                <Button variant="secondary" onClick={() => startReview(mistake)}><RotateCcw size={17} />再次练习</Button>
                <button className={`icon-button${mistake.favorite ? " active" : ""}`} onClick={() => void toggleMistakeFavorite(mistake.id)} aria-label={mistake.favorite ? "取消收藏错题" : "收藏错题"}><Heart size={17} fill={mistake.favorite ? "currentColor" : "none"} /></button>
                <details className="item-more-actions"><summary>更多操作</summary><div>
                {mistake.state !== "mastered" && <button className="text-button" onClick={() => void setMistakeState(mistake.id, "mastered")}><CheckCircle2 size={15} />标记掌握</button>}
                {!mistake.active && <button className="text-button" onClick={() => void setMistakeState(mistake.id, "active")}><RotateCcw size={15} />重新加入</button>}
                {mistake.state !== "archived" && <button className="text-button" onClick={() => void setMistakeState(mistake.id, "archived")}><Archive size={15} />归档</button>}
                <button className="text-button danger-text" onClick={() => void removeMistake(mistake.id)}><Trash2 size={15} />移出错题本</button>
                </div></details>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
