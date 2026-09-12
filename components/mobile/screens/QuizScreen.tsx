"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, X } from "lucide-react";
import { useLearning } from "@/context/learning";
import { EXAM_QUESTIONS, EXAM_SECTION_LABELS, type ExamLanguage, ExamSection } from "@/data/exam-questions";
import { isAnswerCorrect } from "@/lib/learning";
import type { TestAnswer } from "@/lib/models";
import { NavParams, mobileHref, navigateTo } from "../navigation";
import { MobileSubHeader } from "../ui/MobileSubHeader";
import { shuffledQuestions } from "./TestSetupScreen";

export function MobileQuiz({ params }: { params: NavParams }) {
  const { completeTest } = useLearning();
  const language: ExamLanguage = params.get("lang") === "english" ? "english" : "japanese";
  const level = params.get("level") ?? (language === "japanese" ? "N3" : "CET-4");
  const rawSection = params.get("section");
  const section: ExamSection = rawSection === "grammar" || rawSection === "reading" ? rawSection : "characters";
  const requested = Number(params.get("count")) || 10;
  const pool = useMemo(() => EXAM_QUESTIONS.filter((item) => item.examLanguage === language && item.examLevel === level && (language === "english" || item.examSection === section)), [language, level, section]);
  const [questions] = useState(() => shuffledQuestions(pool, requested));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());
  const question = questions[index];
  const submit = async () => {
    if (!question || selected === null) return;
    const nextAnswers = [...answers, { question, selectedIndex: selected, isCorrect: isAnswerCorrect(question, selected) }];
    if (index >= questions.length - 1) { const stored = await completeTest(nextAnswers, { mode: language, sourceFilter: "all-learned", startedAt }); setResult({ correct: stored.correctCount, total: stored.answers.length }); return; }
    setAnswers(nextAnswers); setIndex((value) => value + 1); setSelected(null);
  };
  if (questions.length === 0) return <main className="m3-page"><MobileSubHeader detail="PRACTICE" onBack={() => navigateTo(mobileHref("/test", { mobile: "setup" }))} title="当前条件没有题目" /><div className="m3-empty-card"><CircleAlert size={28} /><p>请更换练习等级或题型。</p></div></main>;
  if (result) return <main className="m3-page"><MobileSubHeader detail="PRACTICE RESULT" onBack={() => navigateTo("/test")} title="练习完成" /><div className="m3-complete"><CheckCircle2 size={36} /><h2>{Math.round(result.correct / Math.max(1, result.total) * 100)}% 正确率</h2><p>答对 {result.correct} / {result.total} 题；错误题目已进入错题本。</p><button className="m3-primary" onClick={() => navigateTo("/test")} type="button">回到练习</button><button className="m3-secondary" onClick={() => navigateTo(mobileHref("/mistakes", { mobile: "list" }))} type="button">查看错题</button></div></main>;
  return <main className="m3-page m3-question-page"><header className="m3-session-header"><button onClick={() => navigateTo("/test")} type="button"><X size={19} />退出</button><span>{index + 1} / {questions.length}</span></header><div className="m3-session-progress"><span style={{ width: `${(index + 1) / questions.length * 100}%` }} /></div><article className="m3-question-card"><span>{language === "japanese" ? `${level} · ${EXAM_SECTION_LABELS[question.examSection]}` : level}</span>{question.context && <p className="m3-context">{question.context}</p>}<h1>{question.prompt}</h1><div className="m3-options">{question.options.map((option, optionIndex) => <button className={selected === optionIndex ? "selected" : ""} key={`${option}-${optionIndex}`} onClick={() => setSelected(optionIndex)} type="button"><i>{String.fromCharCode(65 + optionIndex)}</i>{option}</button>)}</div></article><button className="m3-primary" disabled={selected === null} onClick={() => void submit()} type="button">{index >= questions.length - 1 ? "提交练习" : "下一题"}<ArrowRight size={17} /></button></main>;
}
