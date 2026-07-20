"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Languages,
  Play,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { WORD_PAIRS } from "@/data/words";
import { GRAMMAR_POINTS } from "@/data/grammar";
import { useLearning } from "@/context/LearningContext";
import { createMixedTest, isAnswerCorrect } from "@/lib/learning";
import type { ChoiceQuestion, TestAnswer, TestResult } from "@/lib/models";
import { Button, EmptyState, PageHeader, ProgressBar } from "@/components/ui";

export function TestView() {
  const { snapshot, completeTest, setFocusMode } = useLearning();
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState<ChoiceQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const question = questions[index];

  const availableCount =
    snapshot.wordProgress.length + snapshot.grammarProgress.length;
  const activeMistakes = snapshot.mistakes.filter((item) => item.active).length;
  const overallAccuracy = useMemo(() => {
    const allAnswers = snapshot.testResults.flatMap((item) => item.answers);
    if (allAnswers.length === 0) return 0;
    return Math.round(
      (allAnswers.filter((answer) => answer.isCorrect).length / allAnswers.length) * 100,
    );
  }, [snapshot.testResults]);

  useEffect(() => {
    if (questions.length === 0 || result) return;
    const handleKey = (event: KeyboardEvent) => {
      if (selectedIndex !== null) return;
      const number = Number(event.key);
      if (number >= 1 && number <= 4) setSelectedIndex(number - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [questions.length, result, selectedIndex]);

  const start = () => {
    const generated = createMixedTest(
      snapshot.wordProgress,
      snapshot.grammarProgress,
      WORD_PAIRS,
      GRAMMAR_POINTS,
      questionCount,
    );
    setQuestions(generated);
    setIndex(0);
    setSelectedIndex(null);
    setAnswers([]);
    setResult(null);
    if (generated.length > 0) setFocusMode(true);
  };

  const next = async () => {
    if (!question || selectedIndex === null || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const answer: TestAnswer = {
      question,
      selectedIndex,
      isCorrect: isAnswerCorrect(question, selectedIndex),
    };
    const nextAnswers = [...answers, answer];
    try {
      if (index >= questions.length - 1) {
        const completed = await completeTest(nextAnswers);
        setAnswers(nextAnswers);
        setResult(completed);
        setFocusMode(false);
      } else {
        setAnswers(nextAnswers);
        setIndex((value) => value + 1);
        setSelectedIndex(null);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (result) {
    const percent = Math.round((result.correctCount / Math.max(1, result.answers.length)) * 100);
    return (
      <div className="page-stack test-results-page">
        <section className="result-hero card">
          <span className={`result-ring ${percent >= 80 ? "good" : percent >= 60 ? "medium" : "needs-work"}`}>
            <strong>{percent}</strong><small>分</small>
          </span>
          <div>
            <span className="section-kicker">TEST COMPLETE</span>
            <h1>{percent >= 80 ? "掌握得很稳" : percent >= 60 ? "基础不错，再巩固一下" : "已经找到下一步重点"}</h1>
            <p>正确 {result.correctCount} 题，错误 {result.answers.length - result.correctCount} 题。错误内容已加入错题本。</p>
          </div>
          <div className="result-actions">
            <Button onClick={start}><RotateCcw size={18} />再测一次</Button>
            <Link className="button button-secondary" href="/mistakes">查看错题本</Link>
          </div>
        </section>

        <section className="answer-review">
          <div className="section-title-row"><div><span className="section-kicker">ANSWER REVIEW</span><h2>逐题解析</h2></div></div>
          {result.answers.map((answer, answerIndex) => (
            <article className={`answer-review-card card ${answer.isCorrect ? "correct" : "wrong"}`} key={`${answer.question.id}-${answerIndex}`}>
              <span className="review-number">{answerIndex + 1}</span>
              <div className="review-content">
                <div className="review-heading">
                  <span>{answer.question.source === "word" ? "单词" : "语法"}</span>
                  {answer.isCorrect ? <strong className="correct-text"><CheckCircle2 size={17} />正确</strong> : <strong className="wrong-text"><XCircle size={17} />错误</strong>}
                </div>
                <h3>{answer.question.prompt}</h3>
                <p>你的答案：<b>{answer.question.options[answer.selectedIndex]}</b></p>
                {!answer.isCorrect && <p>正确答案：<b>{answer.question.options[answer.question.correctIndex]}</b></p>}
                <div className="review-explanation">{answer.question.explanation}</div>
              </div>
            </article>
          ))}
        </section>
      </div>
    );
  }

  if (questions.length > 0 && question) {
    return (
      <section className="quiz-session test-session">
        <div className="session-topline">
          <span>日英混合测试</span>
          <strong>{index + 1} / {questions.length}</strong>
        </div>
        <div className="session-progress"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
        <article className="question-card card">
          <div className="question-meta">
            <span className="question-type">{question.source === "word" ? "日英互译" : "语法判断"}</span>
            <span>选择一个最合适的答案</span>
          </div>
          {question.context && <p className="question-context">{question.context}</p>}
          <h1>{question.prompt}</h1>
          <div className="option-list neutral">
            {question.options.map((option, optionIndex) => (
              <button
                className={`quiz-option${selectedIndex === optionIndex ? " selected" : ""}`}
                key={`${option}-${optionIndex}`}
                onClick={() => setSelectedIndex(optionIndex)}
              >
                <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                <span>{option}</span>
              </button>
            ))}
          </div>
          <div className="question-footer">
            <span>按 1–4 快速选择</span>
            <Button onClick={() => void next()} disabled={selectedIndex === null || submitting}>
              {index >= questions.length - 1 ? "提交测试" : "下一题"}<ArrowRight size={18} />
            </Button>
          </div>
        </article>
      </section>
    );
  }

  return (
    <div className="page-stack test-page">
      <PageHeader
        eyebrow="选择题测试"
        title="只检验你已经学过的内容"
        description="第一阶段以日英混合选择题为主。答错的题会自动进入错题本。"
      />

      <section className="test-overview-grid">
        <article className="card test-config-card">
          <span className="test-icon"><Languages size={28} /></span>
          <span className="section-kicker">MIXED TEST</span>
          <h2>日英混合测试</h2>
          <p>包含中日英互译、语境表达和已学习语法。每题 4 个选项。</p>
          <div className="test-features">
            <span><ShieldCheck size={17} />仅使用已学习内容</span>
            <span><ClipboardCheck size={17} />完成后提供中文解析</span>
          </div>
          <label className="question-count-control">
            <span>本次题数</span>
            <div className="segmented-control">
              {[5, 10, 20].map((count) => (
                <button className={questionCount === count ? "active" : ""} onClick={() => setQuestionCount(count)} type="button" key={count}>{count} 题</button>
              ))}
            </div>
          </label>
          {availableCount > 0 ? (
            <Button className="button-large" onClick={start}><Play size={18} fill="currentColor" />开始测试</Button>
          ) : (
            <EmptyState
              title="还没有可测试内容"
              description="先完成至少一张单词卡或一个语法练习，测试才会从已学内容中出题。"
              action={<Link className="button button-primary" href="/words?study=1">先学单词</Link>}
            />
          )}
        </article>

        <aside className="test-stats-column">
          <article className="card mini-stat-card"><span>已学习内容</span><strong>{availableCount}<small>项</small></strong><p>单词 {snapshot.wordProgress.length} · 语法 {snapshot.grammarProgress.length}</p></article>
          <article className="card mini-stat-card"><span>历史正确率</span><strong>{overallAccuracy}<small>%</small></strong><ProgressBar value={overallAccuracy} label="历史测试正确率" /></article>
          <article className="card mini-stat-card"><span>活跃错题</span><strong>{activeMistakes}<small>道</small></strong><Link href="/mistakes">前往集中复习 <ArrowRight size={16} /></Link></article>
        </aside>
      </section>
    </div>
  );
}
