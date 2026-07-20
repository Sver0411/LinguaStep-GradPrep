"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useLearning } from "@/context/LearningContext";
import { isAnswerCorrect } from "@/lib/learning";
import type { MistakeRecord } from "@/lib/models";
import { Button, EmptyState, PageHeader } from "@/components/ui";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MistakesView() {
  const { snapshot, answerMistake, setFocusMode } = useLearning();
  const [showHistory, setShowHistory] = useState(false);
  const [reviewing, setReviewing] = useState<MistakeRecord | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [reviewResult, setReviewResult] = useState<MistakeRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const visible = useMemo(
    () =>
      snapshot.mistakes
        .filter((item) => showHistory || item.active)
        .sort((a, b) => b.priority - a.priority || b.lastWrongAt.localeCompare(a.lastWrongAt)),
    [showHistory, snapshot.mistakes],
  );
  const activeCount = snapshot.mistakes.filter((item) => item.active).length;

  const startReview = (mistake: MistakeRecord) => {
    setReviewing(mistake);
    setSelectedIndex(null);
    setReviewResult(null);
    setFocusMode(true);
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
        <div className="session-topline">
          <span>错题再次练习</span>
          <strong>已连续答对 {reviewing.correctStreak} / 3 次</strong>
        </div>
        <article className="question-card card">
          <span className="question-type">{question.source === "word" ? "单词错题" : "语法错题"}</span>
          {question.context && <p className="question-context">{question.context}</p>}
          <h1>{question.prompt}</h1>
          <div className="option-list">
            {question.options.map((option, optionIndex) => {
              const selected = selectedIndex === optionIndex;
              const submitted = reviewResult !== null;
              const showCorrect = submitted && optionIndex === question.correctIndex;
              const showWrong = submitted && selected && !correct;
              return (
                <button
                  className={`quiz-option${selected ? " selected" : ""}${showCorrect ? " correct" : ""}${showWrong ? " wrong" : ""}`}
                  key={`${option}-${optionIndex}`}
                  onClick={() => !submitted && setSelectedIndex(optionIndex)}
                  disabled={submitted}
                >
                  <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                  <span>{option}</span>
                  {showCorrect && <CheckCircle2 size={20} />}
                  {showWrong && <XCircle size={20} />}
                </button>
              );
            })}
          </div>
          {reviewResult && (
            <div className={`answer-explanation ${correct ? "correct" : "wrong"}`}>
              <strong>{correct ? (reviewResult.active ? `答对了，还需连续答对 ${3 - reviewResult.correctStreak} 次` : "已掌握，这道题已移出活跃错题") : "再次答错，复习优先级已提高"}</strong>
              <p>{question.explanation}</p>
            </div>
          )}
          <div className="question-footer">
            <button className="text-button" onClick={() => { setReviewing(null); setFocusMode(false); }}>退出练习</button>
            {!reviewResult ? (
              <Button onClick={() => void submitReview()} disabled={selectedIndex === null || submitting}>提交答案</Button>
            ) : (
              <Button onClick={() => {
                const latest = snapshot.mistakes.find((item) => item.id === reviewing.id);
                if (latest?.active) startReview(latest);
                else {
                  setReviewing(null);
                  setReviewResult(null);
                }
              }}>继续复习<ArrowRight size={18} /></Button>
            )}
          </div>
        </article>
      </section>
    );
  }

  return (
    <div className="page-stack mistakes-page">
      <PageHeader
        eyebrow="错题本"
        title="把错误变成下一次的把握"
        description="答错会提高复习优先级；连续答对 3 次后，题目会自动移出活跃列表。"
        actions={
          <div className="segmented-control">
            <button className={!showHistory ? "active" : ""} onClick={() => setShowHistory(false)}>活跃错题 · {activeCount}</button>
            <button className={showHistory ? "active" : ""} onClick={() => setShowHistory(true)}>全部历史</button>
          </div>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          title={showHistory ? "还没有错题记录" : "活跃错题已清空"}
          description={showHistory ? "完成测试后，答错的题会自动出现在这里。" : "做得不错。继续学习或测试，新的薄弱点会自动整理。"}
          action={<Link className="button button-primary" href="/test">去做测试</Link>}
        />
      ) : (
        <div className="mistake-list">
          {visible.map((mistake) => (
            <article className={`mistake-card card${mistake.active ? "" : " mastered"}`} key={mistake.id}>
              <div className="mistake-status-column">
                <span className={`source-icon ${mistake.question.source}`}>
                  {mistake.active ? <AlertCircle size={21} /> : <CheckCircle2 size={21} />}
                </span>
                <span className="priority-bars" aria-label={`优先级 ${mistake.priority}`}>
                  {[1, 2, 3, 4, 5].map((level) => <i className={level <= mistake.priority ? "active" : ""} key={level} />)}
                </span>
              </div>
              <div className="mistake-main">
                <div className="mistake-meta">
                  <span>{mistake.question.source === "word" ? "单词" : "语法"}</span>
                  <span><Clock3 size={14} />{formatDate(mistake.lastWrongAt)}</span>
                </div>
                <h2>{mistake.question.prompt}</h2>
                <p>正确答案：<strong>{mistake.question.options[mistake.question.correctIndex]}</strong></p>
                <div className="mistake-explanation">{mistake.question.explanation}</div>
                <div className="mistake-stats">
                  <span>错误 <b>{mistake.errorCount}</b> 次</span>
                  <span>连续答对 <b>{mistake.correctStreak}</b> / 3</span>
                  {!mistake.active && <span className="mastered-label">已掌握</span>}
                </div>
              </div>
              <Button variant="secondary" onClick={() => startReview(mistake)}>
                <RotateCcw size={17} />再次练习
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
