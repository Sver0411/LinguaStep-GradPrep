"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  Languages,
  Play,
  RotateCcw,
  Timer,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLearning } from "@/context/learning";
import {
  ENGLISH_EXAM_LEVELS,
  EXAM_QUESTIONS,
  EXAM_SECTION_LABELS,
  JAPANESE_EXAM_LEVELS,
  examBankStats,
  type EnglishExamLevel,
  type ExamLanguage,
  type ExamQuestion,
  type ExamSection,
  type JapaneseExamLevel,
} from "@/data/exam-questions";
import { dateKey, isAnswerCorrect } from "@/lib/learning";
import { getNextLearningAction } from "@/lib/learning-flow";
import type { TestAnswer, TestResult } from "@/lib/models";
import { Button, PageHeader, ProgressBar } from "@/components/ui";

const LANGUAGE_LABEL: Record<ExamLanguage, string> = {
  japanese: "日语",
  english: "英语",
};

const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50] as const;

function shuffleItems<T>(items: readonly T[], random = Math.random): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export function prepareExamQuestions(
  pool: readonly ExamQuestion[],
  count: number,
  random = Math.random,
): ExamQuestion[] {
  const selected = shuffleItems(pool, random).slice(0, count);
  const offset = Math.floor(random() * 4);
  const correctPositions = shuffleItems(
    selected.map((_question, index) => (index + offset) % 4),
    random,
  );
  return selected.map((question, index) => {
    const correctOption = question.options[question.correctIndex] ?? question.options[0];
    const distractors = shuffleItems(
      question.options.filter((_option, optionIndex) => optionIndex !== question.correctIndex),
      random,
    );
    const options = [...distractors];
    const correctIndex = correctPositions[index] ?? 0;
    options.splice(correctIndex, 0, correctOption);
    return {
      ...question,
      options: options as [string, string, string, string],
      correctIndex,
    };
  });
}

function categoryLabel(category: string | undefined): string {
  if (category === "characters") return "文字";
  if (category === "grammar") return "文法";
  if (category === "reading") return "阅读";
  return "综合";
}

export function TestView() {
  const { snapshot, settings, completeTest, setFocusMode } = useLearning();
  const [language, setLanguage] = useState<ExamLanguage>("japanese");
  const [japaneseLevel, setJapaneseLevel] = useState<JapaneseExamLevel>("N3");
  const [englishLevel, setEnglishLevel] = useState<EnglishExamLevel>("CET-4");
  const [section, setSection] = useState<ExamSection>("characters");
  const [questionCount, setQuestionCount] = useState(
    () => QUESTION_COUNT_OPTIONS.find((count) => count === settings.dailyTestQuestions) ?? 10,
  );
  const [setupStage, setSetupStage] = useState<"language" | "options">("language");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [startedAt, setStartedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const submittingRef = useRef(false);
  const question = questions[index];
  const level = language === "japanese" ? japaneseLevel : englishLevel;

  const selectedPool = useMemo(
    () =>
      EXAM_QUESTIONS.filter(
        (item) =>
          item.examLanguage === language &&
          item.examLevel === level &&
          (language === "english" || item.examSection === section),
      ),
    [language, level, section],
  );

  const japaneseBank = useMemo(() => examBankStats("japanese"), []);
  const englishBank = useMemo(() => examBankStats("english"), []);
  const poolStats = useMemo(() => {
    const real = selectedPool.filter((item) => !item.id.includes("generated")).length;
    return { real, practice: selectedPool.length - real, total: selectedPool.length };
  }, [selectedPool]);
  const effectiveQuestionCount = Math.min(questionCount, selectedPool.length);
  const overallAccuracy = useMemo(() => {
    const values = snapshot.testResults.flatMap((item) => item.answers);
    if (values.length === 0) return 0;
    return Math.round(values.filter((answer) => answer.isCorrect).length / values.length * 100);
  }, [snapshot.testResults]);

  const exitTest = useCallback(() => {
    setQuestions([]);
    setIndex(0);
    setSelectedIndex(null);
    setAnswers([]);
    setResult(null);
    setStartedAt("");
    setConfirmExit(false);
    setFocusMode(false);
  }, [setFocusMode]);

  /**
   * Leaving midway discards every answer in the current round, so ask first
   * instead of silently throwing away work the user already did.
   */
  const requestExit = useCallback(() => {
    if (answers.length > 0 && !result) {
      setConfirmExit(true);
      return;
    }
    exitTest();
  }, [answers.length, exitTest, result]);

  useEffect(() => {
    window.addEventListener("linguastep:exit-session", requestExit);
    return () => {
      window.removeEventListener("linguastep:exit-session", requestExit);
      setFocusMode(false);
    };
  }, [requestExit, setFocusMode]);

  const startTest = () => {
    const generated = prepareExamQuestions(selectedPool, effectiveQuestionCount);
    if (generated.length === 0) return;
    setQuestions(generated);
    setIndex(0);
    setSelectedIndex(null);
    setAnswers([]);
    setResult(null);
    setStartedAt(new Date().toISOString());
    setFocusMode(true);
  };

  const next = useCallback(async () => {
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
          mode: language,
          sourceFilter: "all-learned",
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
  }, [answers, completeTest, index, language, question, questions.length, selectedIndex, setFocusMode, startedAt]);

  useEffect(() => {
    if (!question || result) return;
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;
      if (event.code === "Space" && selectedIndex !== null) {
        event.preventDefault();
        void next();
        return;
      }
      if (target?.matches("button")) return;
      const number = Number(event.key);
      if (number >= 1 && number <= 4) setSelectedIndex(number - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, question, result, selectedIndex]);

  if (result) {
    const percent = Math.round(result.correctCount / Math.max(1, result.answers.length) * 100);
    const nextAction = getNextLearningAction(snapshot, dateKey(new Date()));
    const wrongCount = result.answers.length - result.correctCount;
    return (
      <div className="page-stack exam-results-page">
        <section className="result-hero card">
          <span className={`result-ring ${percent >= 80 ? "good" : percent >= 60 ? "medium" : "needs-work"}`}><strong>{percent}</strong><small>分</small></span>
          <div><span className="section-kicker">PRACTICE COMPLETE</span><h1>{LANGUAGE_LABEL[language]} {level} 练习完成</h1><p>正确 {result.correctCount} 题，错误 {wrongCount} 题。</p><p className="keyboard-note"><Timer size={15} />用时 {Math.floor(result.durationSeconds / 60)} 分 {result.durationSeconds % 60} 秒</p></div>
          <div className="result-actions">
            {nextAction.step === "complete" && (
              <Link className="button button-primary" href="/"><ArrowRight size={18} />回到今日首页</Link>
            )}
            {nextAction.step === "test" && (
              <Button onClick={startTest}><RotateCcw size={18} />再练一组，补齐今日题量</Button>
            )}
            {nextAction.step !== "complete" && nextAction.step !== "test" && (
              <Link className="button button-primary" href={nextAction.href}><ArrowRight size={18} />{nextAction.label}</Link>
            )}
            {nextAction.step !== "test" && (
              <Button variant="secondary" onClick={startTest}><RotateCcw size={18} />再做一组</Button>
            )}
            <Button variant="secondary" onClick={exitTest}><ArrowLeft size={18} />返回测试首页</Button>
          </div>
        </section>
        {wrongCount > 0 && nextAction.step === "mistakes" && (
          <section className="card next-learning-card">
            <div><span className="section-kicker">NEXT STEP</span><h2>本轮错了 {wrongCount} 题</h2><p>错题已自动进入错题本，接着巩固可以立刻巩固印象。</p></div>
            <Link className="button button-primary" href="/mistakes?review=1"><ArrowRight size={18} />开始巩固错题</Link>
          </section>
        )}
        <section className="breakdown-grid" aria-label="分类正确率">
          {(["characters", "grammar", "reading"] as ExamSection[]).map((item) => {
            const values = result.answers.filter((answer) => answer.question.category === item);
            if (values.length === 0) return null;
            const correct = values.filter((answer) => answer.isCorrect).length;
            return <article className="card mini-stat-card" key={item}><span>{EXAM_SECTION_LABELS[item]}</span><strong>{Math.round(correct / values.length * 100)}<small>%</small></strong><p>{correct} / {values.length} 正确</p></article>;
          })}
        </section>
        <section className="answer-review">
          <div className="section-title-row"><div><span className="section-kicker">ANSWER REVIEW</span><h2>逐题解析</h2></div></div>
          {result.answers.map((answer, answerIndex) => (
            <article className={`answer-review-card card ${answer.isCorrect ? "correct" : "wrong"}`} key={`${answer.question.id}-${answerIndex}`}>
              <span className="review-number">{answerIndex + 1}</span>
              <div className="review-content"><div className="review-heading"><span>{categoryLabel(answer.question.category)}</span>{answer.isCorrect ? <strong className="correct-text"><CheckCircle2 size={17} />正确</strong> : <strong className="wrong-text"><XCircle size={17} />错误</strong>}</div><h3>{answer.question.prompt}</h3><p>你的答案：<b>{answer.question.options[answer.selectedIndex]}</b></p>{!answer.isCorrect && <p>正确答案：<b>{answer.question.options[answer.question.correctIndex]}</b></p>}<div className="review-explanation">{answer.question.explanation}</div></div>
            </article>
          ))}
        </section>
      </div>
    );
  }

  if (question) {
    const showFeedback = settings.immediateTestFeedback && selectedIndex !== null;
    const correct = selectedIndex !== null && isAnswerCorrect(question, selectedIndex);
    return (
      <section className="quiz-session exam-session">
        <div className="session-topline"><span>{LANGUAGE_LABEL[language]} {level} · {language === "japanese" ? EXAM_SECTION_LABELS[section] : "综合练习"}</span><div className="session-top-actions"><strong>{index + 1} / {questions.length}</strong><button className="text-button" onClick={requestExit}><ArrowLeft size={16} />退出测试</button></div></div>
        <div className="session-progress"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
        {confirmExit && (
          <div className="card exit-confirm-card" role="alertdialog" aria-label="确认退出测试">
            <div><strong>退出会丢弃本轮已答的 {answers.length} 题</strong><p>这些答案不会计入统计，也不会进入错题本。</p></div>
            <div className="exit-confirm-actions">
              <Button variant="secondary" onClick={() => setConfirmExit(false)}>继续答题</Button>
              <Button variant="danger" onClick={exitTest}>确认退出</Button>
            </div>
          </div>
        )}
        <article className="question-card card">
          <div className="question-meta"><span className="question-type">{EXAM_SECTION_LABELS[question.examSection]}</span><span>{question.examLevel}</span></div>
          {question.context && <div className="exam-passage"><span><BookOpenCheck size={17} />阅读材料</span><p>{question.context}</p></div>}
          <h1>{question.prompt}</h1>
          <div className={`option-list${showFeedback ? "" : " neutral"}`}>
            {question.options.map((option, optionIndex) => {
              const selected = selectedIndex === optionIndex;
              const showCorrect = showFeedback && optionIndex === question.correctIndex;
              const showWrong = showFeedback && selected && !correct;
              return <button className={`quiz-option${selected ? " selected" : ""}${showCorrect ? " correct" : ""}${showWrong ? " wrong" : ""}`} key={`${option}-${optionIndex}`} onClick={() => (!showFeedback || selectedIndex === null) && setSelectedIndex(optionIndex)} disabled={showFeedback}><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{showCorrect && <CheckCircle2 size={20} />}{showWrong && <XCircle size={20} />}</button>;
            })}
          </div>
          {showFeedback && <div className={`answer-explanation ${correct ? "correct" : "wrong"}`}><strong>{correct ? "回答正确" : "再留意一下"}</strong><p>{question.explanation}</p></div>}
          <div className="question-footer"><span>按 1–4 选择 · Space 下一题</span><Button aria-keyshortcuts="Space" onClick={() => void next()} disabled={selectedIndex === null || submitting}>{index >= questions.length - 1 ? "提交测试" : "下一题"}<ArrowRight size={18} /></Button></div>
        </article>
      </section>
    );
  }

  return (
    <div className="page-stack test-page exam-home-page">
      <PageHeader eyebrow="真题练习" title={setupStage === "language" ? "先选择练习语言" : `设置${LANGUAGE_LABEL[language]}练习`} description="把语言选择、难度和题型拆成两步，减少同一页面的选项堆叠。" />
      <section className="exam-setup-layout">
        <article className="card exam-config-card">
          <div className="exam-step-heading"><span>1</span><div><strong>选择语言</strong><small>日语或英语</small></div></div>
          <div className="exam-language-picker">
            {(["japanese", "english"] as ExamLanguage[]).map((item) => <button type="button" className={language === item ? "active" : ""} onClick={() => setLanguage(item)} key={item}><Languages size={23} /><span><strong>{LANGUAGE_LABEL[item]}</strong><small>{item === "japanese" ? "JLPT N3 / N2 / N1" : "四级 / 六级 / TOEIC"}</small></span></button>)}
          </div>
          {setupStage === "language" ? (
            <div className="exam-next-step"><p>下一步会选择考试等级；日语还可以继续选择文字、文法或阅读。</p><Button onClick={() => setSetupStage("options")}>下一步：选择难度<ArrowRight size={18} /></Button></div>
          ) : (
            <>
              <button className="detail-back-button exam-back-button" onClick={() => setSetupStage("language")}><ArrowLeft size={16} />返回选择语言</button>
              <div className="exam-step-heading"><span>2</span><div><strong>选择难度</strong><small>{language === "japanese" ? "仅提供 N3 至 N1" : "选择考试目标"}</small></div></div>
              <div className="segmented-control exam-level-picker">
                {language === "japanese"
                  ? JAPANESE_EXAM_LEVELS.map((item) => <button type="button" className={japaneseLevel === item ? "active" : ""} onClick={() => setJapaneseLevel(item)} key={item}>{item}</button>)
                  : ENGLISH_EXAM_LEVELS.map((item) => <button type="button" className={englishLevel === item ? "active" : ""} onClick={() => setEnglishLevel(item)} key={item}>{item === "CET-4" ? "四级" : item === "CET-6" ? "六级" : item}</button>)}
              </div>
              {language === "japanese" && <><div className="exam-step-heading"><span>3</span><div><strong>选择题型</strong><small>文字包含汉字读音与词汇运用</small></div></div><div className="exam-section-picker">{(["characters", "grammar", "reading"] as ExamSection[]).map((item) => { const Icon = item === "reading" ? FileText : item === "grammar" ? BookOpenCheck : Languages; const count = EXAM_QUESTIONS.filter((question) => question.examLanguage === "japanese" && question.examLevel === japaneseLevel && question.examSection === item).length; return <button type="button" className={section === item ? "active" : ""} onClick={() => setSection(item)} key={item}><Icon size={20} /><span><strong>{EXAM_SECTION_LABELS[item]}</strong><small>{count} 题</small></span></button>; })}</div></>}
              <div className="exam-step-heading"><span>{language === "japanese" ? 4 : 3}</span><div><strong>选择本次题量</strong><small>每次开始都会从题库重新随机抽取</small></div></div>
              <div className="question-count-control exam-question-count">
                <span>本次题数</span>
                <div className="segmented-control" aria-label="本次题数">
                  {QUESTION_COUNT_OPTIONS.map((count) => <button type="button" className={questionCount === count ? "active" : ""} aria-pressed={questionCount === count} onClick={() => setQuestionCount(count)} key={count}>{count} 题</button>)}
                </div>
              </div>
              <div className="exam-start-row"><div><span>本组内容</span><strong>{language === "japanese" ? `${japaneseLevel} · ${EXAM_SECTION_LABELS[section]}` : `${englishLevel} · 综合`}</strong><small>随机抽取 {effectiveQuestionCount} 题 · 本档共 {poolStats.total} 题（真题 {poolStats.real} · 复习题 {poolStats.practice}）{effectiveQuestionCount < questionCount ? "（本档题量不足，已按上限出题）" : ""}</small></div><Button className="button-large" onClick={startTest} disabled={selectedPool.length === 0}><Play size={18} fill="currentColor" />开始测试</Button></div>
            </>
          )}
        </article>
        <aside className="exam-info-column">
          <article className="card mini-stat-card"><span>日语题库</span><strong>{japaneseBank.real}<small>道题</small></strong><p>含 {japaneseBank.practice} 道自动生成复习题</p></article>
          <article className="card mini-stat-card"><span>英语题库</span><strong>{englishBank.real}<small>道题</small></strong><p>含 {englishBank.practice} 道自动生成复习题</p></article>
          <article className="card mini-stat-card"><span>历史正确率</span><strong>{overallAccuracy}<small>%</small></strong><ProgressBar value={overallAccuracy} label="历史测试正确率" /></article>
        </aside>
      </section>
    </div>
  );
  }
