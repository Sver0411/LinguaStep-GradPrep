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
  Timer,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLearning } from "@/context/LearningContext";
import { createTestQuestions, isAnswerCorrect } from "@/lib/learning";
import type {
  ChoiceQuestion,
  TestAnswer,
  TestMode,
  TestResult,
  TestSourceFilter,
} from "@/lib/models";
import { Button, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { AIExplanationPanel } from "@/components/ai/AIExplanationPanel";

const MODE_LABEL: Record<TestMode, string> = {
  mixed: "日英混合",
  japanese: "日语",
  english: "英语",
};

const SOURCE_LABEL: Record<TestSourceFilter, string> = {
  "all-learned": "所有已学内容",
  today: "今日学过",
  "recent-7": "最近 7 天",
  mistakes: "错题专项",
  favorites: "收藏专项",
  due: "到期复习",
};

function initialSourceFilter(): TestSourceFilter {
  if (typeof window === "undefined") return "all-learned";
  const source = new URLSearchParams(window.location.search).get("source");
  return source === "favorites" ||
    source === "mistakes" ||
    source === "due" ||
    source === "today" ||
    source === "recent-7"
    ? source
    : "all-learned";
}

function resultBreakdown(result: TestResult) {
  const group = (predicate: (answer: TestAnswer) => boolean) => {
    const values = result.answers.filter(predicate);
    return {
      total: values.length,
      correct: values.filter((answer) => answer.isCorrect).length,
      percent:
        values.length > 0
          ? Math.round(
              (values.filter((answer) => answer.isCorrect).length / values.length) *
                100,
            )
          : 0,
    };
  };
  const difficulties = [
    ...new Set(
      result.answers.map((answer) => answer.question.difficulty ?? "未标注"),
    ),
  ].map((label) => ({
    label,
    data: group(
      (answer) => (answer.question.difficulty ?? "未标注") === label,
    ),
  }));
  return {
    word: group((answer) => answer.question.source === "word"),
    grammar: group((answer) => answer.question.source !== "word"),
    japanese: group((answer) => answer.question.language === "japanese"),
    english: group((answer) => answer.question.language === "english"),
    mixed: group((answer) => answer.question.language === "mixed"),
    difficulties,
  };
}

export function TestView() {
  const { snapshot, settings, allWords, allGrammar, completeTest, setFocusMode } = useLearning();
  const [mode, setMode] = useState<TestMode>("mixed");
  const [sourceFilter, setSourceFilter] =
    useState<TestSourceFilter>(initialSourceFilter);
  const [questionCount, setQuestionCount] = useState(settings.dailyTestQuestions);
  const [difficulty, setDifficulty] = useState("all");
  const [immediateFeedback, setImmediateFeedback] = useState(
    settings.immediateTestFeedback,
  );
  const [prioritizeMistakes, setPrioritizeMistakes] = useState(
    settings.prioritizeMistakes,
  );
  const [questions, setQuestions] = useState<ChoiceQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState("");
  const [generationEmpty, setGenerationEmpty] = useState(false);
  const [collectionTitle, setCollectionTitle] = useState("");
  const collectionStarted = useRef(false);
  const submittingRef = useRef(false);
  const question = questions[index];
  const selectionCorrect =
    question && selectedIndex !== null
      ? isAnswerCorrect(question, selectedIndex)
      : false;

  const availableCount =
    snapshot.wordProgress.length + snapshot.grammarProgress.length;
  const activeMistakes = snapshot.mistakes.filter((item) => item.active).length;
  const overallAccuracy = useMemo(() => {
    const allAnswers = snapshot.testResults.flatMap((item) => item.answers);
    if (allAnswers.length === 0) return 0;
    return Math.round(
      (allAnswers.filter((answer) => answer.isCorrect).length /
        allAnswers.length) *
        100,
    );
  }, [snapshot.testResults]);
  const difficultyOptions = useMemo(() => {
    const wordLevels = allWords.flatMap((word) =>
      mode === "english"
        ? [word.english.difficulty]
        : mode === "japanese"
          ? [word.japanese.difficulty]
          : [word.japanese.difficulty, word.english.difficulty],
    );
    const grammarLevels = allGrammar.filter(
      (point) => mode === "mixed" || point.language === mode,
    ).map((point) => point.level);
    return [...new Set([...wordLevels, ...grammarLevels])];
  }, [allGrammar, allWords, mode]);

  useEffect(() => {
    if (questions.length === 0 || result) return;
    const handleKey = (event: KeyboardEvent) => {
      if (immediateFeedback && selectedIndex !== null) return;
      const number = Number(event.key);
      if (number >= 1 && number <= 4) setSelectedIndex(number - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [immediateFeedback, questions.length, result, selectedIndex]);

  useEffect(() => {
    if (collectionStarted.current || questions.length > 0) return;
    const collectionId = new URLSearchParams(window.location.search).get("collection");
    if (!collectionId) return;
    const collection = snapshot.aiCollections.find((item) => item.id === collectionId);
    if (!collection || collection.questions.length === 0) return;
    collectionStarted.current = true;
    const timer = window.setTimeout(() => {
      setQuestions(collection.questions);
      setCollectionTitle(collection.title);
      setStartedAt(new Date().toISOString());
      setFocusMode(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [questions.length, setFocusMode, snapshot.aiCollections]);

  const start = () => {
    const now = new Date().toISOString();
    const generated = createTestQuestions(
      snapshot.wordProgress,
      snapshot.grammarProgress,
      allWords,
      allGrammar,
      {
        mode,
        sourceFilter,
        count: questionCount,
        now,
        favorites: snapshot.favorites,
        mistakes: snapshot.mistakes.filter((item) => item.active),
        difficulty: difficulty === "all" ? undefined : difficulty,
        prioritizeMistakes,
      },
    );
    setQuestions(generated);
    setIndex(0);
    setSelectedIndex(null);
    setAnswers([]);
    setResult(null);
    setStartedAt(now);
    setGenerationEmpty(generated.length === 0);
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
        const completed = await completeTest(nextAnswers, {
          mode,
          sourceFilter,
          startedAt,
        });
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
    const percent = Math.round(
      (result.correctCount / Math.max(1, result.answers.length)) * 100,
    );
    const breakdown = resultBreakdown(result);
    return (
      <div className="page-stack test-results-page">
        <section className="result-hero card">
          <span className={`result-ring ${percent >= 80 ? "good" : percent >= 60 ? "medium" : "needs-work"}`}><strong>{percent}</strong><small>分</small></span>
          <div><span className="section-kicker">TEST COMPLETE</span><h1>{percent >= 80 ? "掌握得很稳" : percent >= 60 ? "基础不错，再巩固一下" : "已经找到下一步重点"}</h1><p>{MODE_LABEL[result.mode]} · {SOURCE_LABEL[result.sourceFilter]} · 正确 {result.correctCount} 题，错误 {result.answers.length - result.correctCount} 题。</p><p className="keyboard-note"><Timer size={15} />用时 {Math.floor(result.durationSeconds / 60)} 分 {result.durationSeconds % 60} 秒</p></div>
          <div className="result-actions"><Button onClick={start}><RotateCcw size={18} />再测一次</Button><Link className="button button-secondary" href="/mistakes">查看错题本</Link></div>
        </section>

        <section className="breakdown-grid" aria-label="测试分项正确率">
          {[{ label:"单词", data:breakdown.word }, { label:"语法与对比", data:breakdown.grammar }, { label:"日语", data:breakdown.japanese }, { label:"英语", data:breakdown.english }, { label:"日英对照", data:breakdown.mixed }, ...breakdown.difficulties.map((item) => ({ ...item, label:`难度 · ${item.label}` }))].filter((item) => item.data.total > 0).map((item) => (
            <article className="card mini-stat-card" key={item.label}><span>{item.label}</span><strong>{item.data.percent}<small>%</small></strong><p>{item.data.correct} / {item.data.total} 正确</p></article>
          ))}
        </section>

        <section className="answer-review">
          <div className="section-title-row"><div><span className="section-kicker">ANSWER REVIEW</span><h2>逐题解析</h2></div></div>
          {result.answers.map((answer, answerIndex) => (
            <article className={`answer-review-card card ${answer.isCorrect ? "correct" : "wrong"}`} key={`${answer.question.id}-${answerIndex}`}>
              <span className="review-number">{answerIndex + 1}</span>
              <div className="review-content">
                <div className="review-heading"><span>{answer.question.source === "word" ? "单词" : answer.question.source === "comparison" ? "日英对比" : "语法"}</span>{answer.isCorrect ? <strong className="correct-text"><CheckCircle2 size={17} />正确</strong> : <strong className="wrong-text"><XCircle size={17} />错误</strong>}</div>
                <h3>{answer.question.prompt}</h3>
                <p>你的答案：<b>{answer.question.options[answer.selectedIndex]}</b></p>
                {!answer.isCorrect && <p>正确答案：<b>{answer.question.options[answer.question.correctIndex]}</b></p>}
                <div className="review-explanation">{answer.question.explanation}</div>
                {!answer.isCorrect && <AIExplanationPanel question={answer.question} selectedIndex={answer.selectedIndex} />}
              </div>
            </article>
          ))}
        </section>
      </div>
    );
  }

  if (questions.length > 0 && question) {
    const showFeedback = immediateFeedback && selectedIndex !== null;
    return (
      <section className="quiz-session test-session">
        <div className="session-topline"><span>{collectionTitle || `${MODE_LABEL[mode]}测试 · ${SOURCE_LABEL[sourceFilter]}`}</span><strong>{index + 1} / {questions.length}</strong></div>
        <div className="session-progress"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
        <article className="question-card card">
          <div className="question-meta"><span className="question-type">{question.source === "word" ? "词汇选择" : question.source === "comparison" ? "语法对比" : "语法判断"}</span><span>{question.difficulty}</span></div>
          {question.context && <p className="question-context">{question.context}</p>}
          <h1>{question.prompt}</h1>
          <div className={`option-list${showFeedback ? "" : " neutral"}`}>
            {question.options.map((option, optionIndex) => {
              const selected = selectedIndex === optionIndex;
              const showCorrect = showFeedback && optionIndex === question.correctIndex;
              const showWrong = showFeedback && selected && !selectionCorrect;
              return (
                <button className={`quiz-option${selected ? " selected" : ""}${showCorrect ? " correct" : ""}${showWrong ? " wrong" : ""}`} key={`${option}-${optionIndex}`} onClick={() => (!showFeedback || selectedIndex === null) && setSelectedIndex(optionIndex)} disabled={showFeedback}>
                  <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{showCorrect && <CheckCircle2 size={20} />}{showWrong && <XCircle size={20} />}
                </button>
              );
            })}
          </div>
          {showFeedback && <div className={`answer-explanation ${selectionCorrect ? "correct" : "wrong"}`}><strong>{selectionCorrect ? "回答正确" : "再留意一下"}</strong><p>{question.explanation}</p></div>}
          <div className="question-footer"><span>按 1–4 快速选择</span><Button onClick={() => void next()} disabled={selectedIndex === null || submitting}>{index >= questions.length - 1 ? "提交测试" : "下一题"}<ArrowRight size={18} /></Button></div>
        </article>
      </section>
    );
  }

  return (
    <div className="page-stack test-page">
      <PageHeader eyebrow="第二阶段 · 测试系统" title="按语言、来源和难度生成测试" description="仍采用可靠的四选一题型；可立即反馈，也可完成后统一查看解析。" />
      <section className="test-overview-grid">
        <article className="card test-config-card">
          <span className="test-icon"><Languages size={28} /></span>
          <span className="section-kicker">CUSTOM TEST</span>
          <h2>测试设置</h2>
          <div className="setting-stack compact-setting-stack">
            <label><span>语言模式</span><div className="segmented-control">{(["japanese","english","mixed"] as TestMode[]).map((item) => <button type="button" className={mode === item ? "active" : ""} onClick={() => { setMode(item); setDifficulty("all"); }} key={item}>{MODE_LABEL[item]}</button>)}</div></label>
            <label><span>内容来源</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as TestSourceFilter)}>{Object.entries(SOURCE_LABEL).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label><span>指定难度</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="all">全部难度</option>{difficultyOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="question-count-control"><span>本次题数</span><div className="segmented-control">{[10,20,30].map((count) => <button className={questionCount === count ? "active" : ""} onClick={() => setQuestionCount(count)} type="button" key={count}>{count}</button>)}</div><input aria-label="自定义测试题数" type="number" min={1} max={100} value={questionCount} onChange={(event) => setQuestionCount(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} /></label>
            <label className="switch-setting"><span><strong>立即显示答案</strong><small>关闭后在测试完成时统一解析</small></span><button className={`switch${immediateFeedback ? " active" : ""}`} role="switch" aria-checked={immediateFeedback} onClick={() => setImmediateFeedback((value) => !value)}><span /></button></label>
            <label className="switch-setting"><span><strong>优先出错题</strong><small>在当前来源范围内把活跃错题对应内容排在前面</small></span><button className={`switch${prioritizeMistakes ? " active" : ""}`} role="switch" aria-checked={prioritizeMistakes} onClick={() => setPrioritizeMistakes((value) => !value)}><span /></button></label>
          </div>
          <div className="test-features"><span><ShieldCheck size={17} />只测试符合来源条件的已学内容</span><span><ClipboardCheck size={17} />保存用时与分项正确率</span></div>
          {availableCount > 0 ? <Button className="button-large" onClick={start}><Play size={18} fill="currentColor" />开始测试</Button> : <EmptyState title="还没有可测试内容" description="先完成至少一张单词卡或一个语法练习。" action={<Link className="button button-primary" href="/words?study=1">先学单词</Link>} />}
          {generationEmpty && <div className="inline-alert" role="status">当前筛选条件下没有可生成的题目。请更换内容来源、难度或语言模式。</div>}
        </article>
        <aside className="test-stats-column">
          <article className="card mini-stat-card"><span>已学习内容</span><strong>{availableCount}<small>项</small></strong><p>单词 {snapshot.wordProgress.length} · 语法 {snapshot.grammarProgress.length}</p></article>
          <article className="card mini-stat-card"><span>历史正确率</span><strong>{overallAccuracy}<small>%</small></strong><ProgressBar value={overallAccuracy} label="历史测试正确率" /></article>
          <article className="card mini-stat-card"><span>活跃错题</span><strong>{activeMistakes}<small>道</small></strong><Link href="/mistakes">前往专项练习 <ArrowRight size={16} /></Link></article>
        </aside>
      </section>
    </div>
  );
}
