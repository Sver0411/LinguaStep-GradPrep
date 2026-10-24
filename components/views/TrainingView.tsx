"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useLearning } from "@/context/learning";
import { SpeakButton } from "@/components/SpeakButton";
import { buildTrainingItems, matchesTypedAnswer, TRAINING_LABELS, type TrainingItem, type TrainingKind } from "@/lib/training";
import { prepareExamQuestions } from "./TestView";
import { type ExamQuestion } from "@/data/exam-questions";
import type { TestAnswer } from "@/lib/models";

export function TrainingView() {
  const { allWords, allGrammar, snapshot, settings, completeTest } = useLearning();
  const [kind, setKind] = useState<TrainingKind>("listening");
  const [language, setLanguage] = useState<"japanese" | "english">(settings.defaultStudyMode === "english" ? "english" : "japanese");
  const [items, setItems] = useState<TrainingItem[]>([]); const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null); const [typed, setTyped] = useState("");
  const [answers, setAnswers] = useState<TestAnswer[]>([]); const [checked, setChecked] = useState<TestAnswer | null>(null);
  const [finished, setFinished] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const started = useRef(""); const saving = useRef(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const requestedSkill = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("skill") : null;
  const activeKind: TrainingKind = items.length ? kind : requestedSkill && requestedSkill in TRAINING_LABELS ? requestedSkill as TrainingKind : kind;
  const current = items[index];
  const start = () => {
    const requestedGoal = settings.primaryGoal ?? "general";
    const goal = requestedGoal === "general" || (language === "japanese" ? /^N[123]$/.test(requestedGoal) : !/^N/.test(requestedGoal)) ? requestedGoal : "general";
    const available = buildTrainingItems(activeKind, language, allWords, allGrammar, snapshot.testResults, goal);
    const chosen = available.slice(0, 5).map((item) => {
      if (item.expected) return item;
      // Reuse the tested option shuffler; stable question IDs retain first-attempt tracking.
      const question = prepareExamQuestions([item.question as ExamQuestion], 1)[0];
      return { ...item, question };
    });
    setKind(activeKind); setError(chosen.length ? "" : "当前目标没有对应材料，请调整目标或练习语言。"); setItems(chosen); setIndex(0); setAnswers([]); setChecked(null); setSelected(null); setTyped(""); setFinished(false); started.current = new Date().toISOString();
  };
  const check = () => {
    if (!current || checked) return;
    const correct = current.expected ? matchesTypedAnswer(typed, current.expected) : selected === current.question.correctIndex;
    setChecked({ question: current.question, selectedIndex: current.expected ? correct ? current.question.correctIndex : (current.question.correctIndex + 1) % 4 : selected!, isCorrect: correct, ...(current.expected ? { typedAnswer: typed } : {}) });
  };
  const next = async () => {
    if (!checked || saving.current) return;
    const nextAnswers = [...answers, checked];
    if (index + 1 === items.length) {
      saving.current = true; setBusy(true);
      try { await completeTest(nextAnswers, { mode: language, sourceFilter: "all-learned", startedAt: started.current }); setAnswers(nextAnswers); setFinished(true); }
      catch { setError("保存失败，请重试。"); } finally { saving.current = false; setBusy(false); }
    } else { setAnswers(nextAnswers); setIndex(index + 1); setChecked(null); setSelected(null); setTyped(""); }
  };
  const seen = current && snapshot.testResults.some((result) => result.answers.some((answer) => answer.question.id === current.question.id));
  return <main className="page-stack m3-page training-page">
    <header><p>听懂、写出、迁移</p><h1>能力训练</h1><Link href="/test">返回练习</Link></header>
    {!items.length ? <section className="card m3-card"><h2>选择训练</h2><div className="training-options">{(Object.keys(TRAINING_LABELS) as TrainingKind[]).map((value) => <button type="button" className={activeKind === value ? "active" : ""} key={value} onClick={() => { if (requestedSkill) window.history.replaceState(null, "", "/training"); setKind(value); }}>{TRAINING_LABELS[value]}</button>)}</div><label>训练语言<select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}><option value="japanese">日语</option><option value="english">英语</option></select></label><p>每轮最多 5 题，优先未做过的题目。材料来自已有词汇例句、语法练习与原创阅读；练习结果不等同于考试成绩。</p><button type="button" className="button button-primary" onClick={start}>开始训练</button></section>
    : finished ? <section className="card m3-card"><h2>本轮完成</h2><p>{answers.filter((item) => item.isCorrect).length} / {answers.length} 正确；错误已进入错题本。</p><button type="button" className="button" onClick={() => setItems([])}>选择其他训练</button><button type="button" className="button" onClick={start}>继续下一组</button><Link href="/mistakes">巩固错题</Link><Link href="/stats">查看能力统计</Link></section>
    : current && <section className="card m3-card"><div className="section-title-row"><span>{TRAINING_LABELS[kind]} · {index + 1} / {items.length} · {seen ? "复练" : "首次练习"}</span><button type="button" onClick={() => setExitConfirm(true)}>退出本轮</button></div>
      {exitConfirm && <div role="alertdialog" aria-label="确认退出训练"><p>退出将丢弃本轮尚未提交的答案。</p><button type="button" onClick={() => setExitConfirm(false)}>继续训练</button><button type="button" onClick={() => { setExitConfirm(false); setItems([]); }}>确认退出</button></div>}
      <h2>{current.question.prompt}</h2>{current.question.context && <p className="exam-passage">{current.question.context}</p>}
      {current.audio && <div className="training-listen"><SpeakButton text={current.audio.text} language={current.audio.language} label="播放题目音频" size={26} /><span>可反复播放，答案提交后揭示</span></div>}
      {current.expected ? <label>你的答案<input autoComplete="off" aria-label="输入答案" value={typed} disabled={Boolean(checked)} onChange={(event) => setTyped(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && typed.trim() && !checked) check(); }} /></label>
      : <div className="option-list">{current.question.options.map((option, position) => <button type="button" key={position} className={`quiz-option${selected === position ? " selected" : ""}`} disabled={Boolean(checked)} onClick={() => setSelected(position)}>{String.fromCharCode(65 + position)} · {option}</button>)}</div>}
      {checked ? <><div className={`answer-explanation ${checked.isCorrect ? "correct" : "wrong"}`}><strong>{checked.isCorrect ? "回答正确" : "再巩固一下"}</strong>{!checked.isCorrect && <p>参考答案：{current.question.options[current.question.correctIndex]}</p>}<p style={{ whiteSpace: "pre-line" }}>{current.question.explanation}</p></div><button type="button" className="button button-primary" disabled={busy} onClick={() => void next()}>{index + 1 === items.length ? "保存本轮" : "下一题"}</button></>
      : <button type="button" className="button button-primary" disabled={current.expected ? !typed.trim() : selected === null} onClick={check}>检查答案</button>}
    </section>}
    {error && <p role="status">{error}</p>}
  </main>;
}
