"use client";
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLearning } from "@/context/learning";
import { isAnswerCorrect } from "@/lib/learning";
import { matchesTypedAnswer } from "@/lib/training";
import type { GrammarPoint, TestAnswer } from "@/lib/models";

export function GrammarPractice({ point, onClose, onNext, nextLabel = "返回语法" }: {
  point: GrammarPoint; onClose: () => void; onNext?: () => void; nextLabel?: string;
}) {
  const { settings, completeGrammar, setFocusMode } = useLearning();
  const questions = point.exercises.slice(0, Math.max(1, settings.grammarExerciseCount));
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const question = questions[index];
  useEffect(() => { setFocusMode(true); return () => setFocusMode(false); }, [setFocusMode]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest("input,textarea,select,[contenteditable=true]")) return;
      if (event.key === "Escape") { onClose(); return; }
      if (!question?.acceptedAnswers && !finished && choice === null && /^[1-4]$/.test(event.key)) setChoice(Number(event.key)-1);
    };
    window.addEventListener("keydown",key); return () => window.removeEventListener("keydown",key);
  }, [choice,finished,onClose,question]);
  const submit = async () => {
    if (!question || choice === null || savingRef.current) return;
    savingRef.current = true; setSaving(true); setError("");
    const next = [...answers,{question,selectedIndex:choice,isCorrect:isAnswerCorrect(question,choice),...(question.acceptedAnswers ? {typedAnswer:typed} : {})}];
    try {
      if (index === questions.length-1) {
        await completeGrammar(point.id,next); setAnswers(next); setFinished(true); setFocusMode(false);
      } else { setAnswers(next); setIndex(index+1); setChoice(null); setTyped(""); }
    } catch { setError("保存失败，请重试。"); }
    finally { savingRef.current=false; setSaving(false); }
  };
  const restart = () => { setIndex(0); setChoice(null); setTyped(""); setAnswers([]); setFinished(false); setError(""); setFocusMode(true); };
  if (!question) return <section className="grammar-workspace"><p>暂无配套练习。</p><button className="button button-secondary" onClick={onClose}>返回语法讲解</button></section>;
  if (finished) return <section className="grammar-workspace grammar-complete"><h1>练习完成</h1><p>{point.structure}</p><strong>{answers.filter((answer) => answer.isCorrect).length}<span> / {answers.length}</span></strong><div className="grammar-complete-actions"><button className="button button-primary" onClick={onNext ?? onClose}>{nextLabel}<ArrowRight size={18} /></button><button className="button button-secondary" onClick={restart}><RotateCcw size={17} />再练一次</button><button className="text-button" onClick={onClose}>返回语法讲解</button></div></section>;
  const correct = choice !== null && isAnswerCorrect(question,choice);
  return <section className="grammar-workspace grammar-practice">
    <header className="grammar-reading-header"><button className="text-button" onClick={onClose}><ArrowLeft size={17} />退出练习</button><span>{index+1} / {questions.length}</span></header>
    <div className="grammar-question-progress" role="progressbar" aria-label="语法练习进度" aria-valuenow={index} aria-valuemin={0} aria-valuemax={questions.length}><span style={{width:`${index/questions.length*100}%`}} /></div>
    <article className="grammar-reading-card"><h1>{question.prompt}</h1>{question.acceptedAnswers ? <form className="grammar-typed-answer" onSubmit={(event) => { event.preventDefault(); if (choice === null && typed.trim()) setChoice(matchesTypedAnswer(typed,question.acceptedAnswers!) ? question.correctIndex : 1); }}><label htmlFor="grammar-recall">回忆原句中的表达</label><input id="grammar-recall" autoComplete="off" value={typed} disabled={choice !== null} onChange={(event) => setTyped(event.target.value)} /><div><button className="button button-secondary" disabled={choice !== null || !typed.trim()} type="submit">核对答案</button><button type="button" className="text-button" disabled={choice !== null} onClick={() => setChoice(2)}>查看原句</button></div></form> : <div className="grammar-answer-options">{question.options.map((option,optionIndex) => <button type="button" disabled={choice !== null} key={option} className={choice === null ? "" : optionIndex === question.correctIndex ? "correct" : optionIndex === choice ? "incorrect" : ""} onClick={() => setChoice(optionIndex)}><span>{String.fromCharCode(65+optionIndex)}</span><b>{option}</b>{choice !== null && optionIndex === question.correctIndex && <Check size={18} />}{optionIndex === choice && !correct && <X size={18} />}</button>)}</div>}
    {choice !== null && <div className={`grammar-answer-feedback ${correct ? "correct" : "incorrect"}`} role="status"><strong>{question.acceptedAnswers ? correct ? "与原句一致" : "与原句不同" : correct ? "回答正确" : "回答错误"}</strong><p style={{whiteSpace:"pre-line"}}>{question.explanation}</p></div>}
    </article>
    {error && <p role="alert">{error}</p>}
    <button className="button button-primary grammar-main-action" disabled={choice === null || saving} onClick={() => void submit()}>{saving ? "保存中…" : index === questions.length-1 ? "完成练习" : "下一题"}<ArrowRight size={18} /></button>
  </section>;
}
