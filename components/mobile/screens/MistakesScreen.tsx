"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, X } from "lucide-react";
import { useLearning } from "@/context/learning";
import { isAnswerCorrect } from "@/lib/learning";
import { NavParams, mobileHref, navigateTo } from "../navigation";
import { MobileSubHeader } from "../ui/MobileSubHeader";

export function MobileMistakes({ params }: { params: NavParams }) {
  const { snapshot, answerMistake } = useLearning();
  const mistakes = useMemo(() => snapshot.mistakes.filter((item) => item.active).sort((left, right) => right.priority - left.priority || right.lastWrongAt.localeCompare(left.lastWrongAt)), [snapshot.mistakes]);
  const selectedId = params.get("id");
  const active = mistakes.find((item) => item.id === selectedId) ?? mistakes[0];
  const [choice, setChoice] = useState<number | null>(null);
  const [saved, setSaved] = useState<boolean | null>(null);
  const review = params.get("mobile") === "review";
  const submit = async () => {
    if (!active || choice === null || saved !== null) return;
    await answerMistake(active.id, choice);
    setSaved(isAnswerCorrect(active.question, choice));
  };
  if (!review) return <main className="m3-page"><MobileSubHeader detail="MISTAKES" onBack={() => navigateTo("/test")} title="错题本" /><p className="m3-lead">只保留仍需要巩固的题目，掌握后会自动移出。</p>{mistakes.length === 0 ? <div className="m3-empty-card"><CheckCircle2 size={28} /><h2>暂时没有活跃错题</h2><button className="m3-primary" onClick={() => navigateTo("/test")} type="button">去做练习</button></div> : <section className="m3-mistake-list">{mistakes.map((item) => <button key={item.id} onClick={() => navigateTo(mobileHref("/mistakes", { mobile: "review", id: item.id }))} type="button"><span>#{item.priority}</span><div><b>{item.question.prompt}</b><small>累计错误 {item.errorCount} 次 · 正确连击 {item.correctStreak}</small></div><ChevronRight size={18} /></button>)}</section>}</main>;
  if (!active) return <main className="m3-page"><MobileSubHeader detail="MISTAKES" onBack={() => navigateTo(mobileHref("/mistakes", { mobile: "list" }))} title="没有待复习错题" /><div className="m3-empty-card"><CheckCircle2 size={28} /><p>继续保持。</p></div></main>;
  const question = active.question;
  return <main className="m3-page m3-question-page"><header className="m3-session-header"><button onClick={() => navigateTo(mobileHref("/mistakes", { mobile: "list" }))} type="button"><X size={19} />退出</button><span>错题巩固</span></header><article className="m3-question-card"><span>已错 {active.errorCount} 次</span><h1>{question.prompt}</h1><div className="m3-options">{question.options.map((option, index) => <button className={`${choice === index ? "selected" : ""}${saved !== null && index === question.correctIndex ? " correct" : ""}`} key={option} disabled={saved !== null} onClick={() => setChoice(index)} type="button"><i>{String.fromCharCode(65 + index)}</i>{option}</button>)}</div>{saved !== null && <div className={`m3-feedback ${saved ? "good" : "wrong"}`}><b>{saved ? "回答正确" : "再复习一次"}</b><p>{question.explanation}</p></div>}</article>{saved === null ? <button className="m3-primary" disabled={choice === null} onClick={() => void submit()} type="button">确认答案</button> : <button className="m3-primary" onClick={() => navigateTo(mobileHref("/mistakes", { mobile: "list" }))} type="button">返回错题本</button>}</main>;
}
