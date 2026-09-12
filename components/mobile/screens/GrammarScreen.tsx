"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, ChevronRight, NotebookPen, X } from "lucide-react";
import { useLearning } from "@/context/learning";
import { dateKey, isAnswerCorrect } from "@/lib/learning";
import type { GrammarPoint, TestAnswer } from "@/lib/models";
import { NavParams, mobileHref, navigateTo } from "../navigation";
import { MobileSubHeader } from "../ui/MobileSubHeader";

export function MobileGrammarHub({ params }: { params: NavParams }) {
  const { allGrammar, snapshot } = useLearning();
  const plan = snapshot.dailyPlans.find((item) => item.date === dateKey(new Date()));
  const planned = plan?.grammarIds.map((id) => allGrammar.find((item) => item.id === id)).filter((item): item is GrammarPoint => Boolean(item)) ?? [];
  const points = planned.length > 0 ? planned : allGrammar.slice(0, 16);
  if (params.get("mobile") === "practice") return <MobileGrammarPractice params={params} points={points} />;
  return <main className="m3-page"><MobileSubHeader detail="GRAMMAR" onBack={() => navigateTo("/")} title="语法练习" /><p className="m3-lead">从今天的语法计划开始，也可以任选一个知识点练习。</p><section className="m3-grammar-list">{points.map((point) => <button key={point.id} onClick={() => navigateTo(mobileHref("/grammar", { mobile: "practice", id: point.id }))} type="button"><span>{point.level}</span><div><b>{point.title}</b><small>{point.structure}</small></div><ChevronRight size={18} /></button>)}</section></main>;
}

function MobileGrammarPractice({ params, points }: { params: NavParams; points: GrammarPoint[] }) {
  const { completeGrammar } = useLearning();
  const point = points.find((item) => item.id === params.get("id")) ?? points[0];
  const questions = point?.exercises ?? [];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [complete, setComplete] = useState(false);
  const question = questions[index];
  const submit = async () => {
    if (!point || !question || selected === null) return;
    const nextAnswers = [...answers, { question, selectedIndex: selected, isCorrect: isAnswerCorrect(question, selected) }];
    if (index >= questions.length - 1) { await completeGrammar(point.id, nextAnswers); setAnswers(nextAnswers); setComplete(true); return; }
    setAnswers(nextAnswers); setIndex((value) => value + 1); setSelected(null);
  };
  if (!point || questions.length === 0) return <main className="m3-page"><MobileSubHeader detail="GRAMMAR" onBack={() => navigateTo("/grammar")} title="暂时没有练习题" /><div className="m3-empty-card"><NotebookPen size={28} /><p>换一个语法知识点再试试。</p></div></main>;
  if (complete) return <main className="m3-page"><MobileSubHeader detail="GRAMMAR" onBack={() => navigateTo("/grammar")} title="语法练习完成" /><div className="m3-complete"><CheckCircle2 size={36} /><h2>{point.title}</h2><p>答对 {answers.filter((item) => item.isCorrect).length} / {answers.length} 题，学习进度已保存。</p><button className="m3-primary" onClick={() => navigateTo("/grammar")} type="button">返回语法</button></div></main>;
  return <main className="m3-page m3-question-page"><header className="m3-session-header"><button onClick={() => navigateTo("/grammar")} type="button"><X size={19} />退出</button><span>{index + 1} / {questions.length}</span></header><div className="m3-session-progress"><span style={{ width: `${(index + 1) / questions.length * 100}%` }} /></div><article className="m3-question-card"><span>{point.title}</span><h1>{question.prompt}</h1><div className="m3-options">{question.options.map((option, optionIndex) => <button className={selected === optionIndex ? "selected" : ""} key={option} onClick={() => setSelected(optionIndex)} type="button"><i>{String.fromCharCode(65 + optionIndex)}</i>{option}</button>)}</div></article><button className="m3-primary" disabled={selected === null} onClick={() => void submit()} type="button">{index >= questions.length - 1 ? "完成练习" : "下一题"}<ArrowRight size={17} /></button></main>;
}
