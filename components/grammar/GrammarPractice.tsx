"use client";

import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLearning } from "@/context/LearningContext";
import { isAnswerCorrect } from "@/lib/learning";
import type { GrammarPoint, TestAnswer } from "@/lib/models";
import { Button, ProgressBar } from "@/components/ui";

export function GrammarPractice({
  point,
  onClose,
}: {
  point: GrammarPoint;
  onClose: () => void;
}) {
  const { settings, completeGrammar, setFocusMode } = useLearning();
  const questions = useMemo(
    () => point.exercises.slice(0, settings.grammarExerciseCount),
    [point.exercises, settings.grammarExerciseCount],
  );
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const question = questions[index];

  useEffect(() => {
    setFocusMode(true);
    return () => setFocusMode(false);
  }, [setFocusMode]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (selectedIndex !== null || finished) return;
      const number = Number(event.key);
      if (number >= 1 && number <= 4) setSelectedIndex(number - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [finished, selectedIndex]);

  if (!question) return null;
  const correct =
    selectedIndex !== null && isAnswerCorrect(question, selectedIndex);

  const next = async () => {
    if (selectedIndex === null || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const answer: TestAnswer = {
      question,
      selectedIndex,
      isCorrect: correct,
    };
    const nextAnswers = [...answers, answer];
    try {
      if (index >= questions.length - 1) {
        await completeGrammar(point.id, nextAnswers);
        setAnswers(nextAnswers);
        setFinished(true);
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

  if (finished) {
    const score = answers.filter((answer) => answer.isCorrect).length;
    const percent = Math.round((score / Math.max(1, answers.length)) * 100);
    return (
      <section className="session-summary card">
        <span className="summary-icon"><CheckCircle2 size={28} /></span>
        <span className="section-kicker">PRACTICE COMPLETE</span>
        <h1>语法练习完成</h1>
        <p>“{point.title}”已记录为本次学习内容，错题也已自动整理。</p>
        <div className="big-score"><strong>{score}</strong><span>/ {answers.length} 正确</span></div>
        <ProgressBar value={percent} label="本次正确率" />
        <div className="summary-actions">
          <Button onClick={() => {
            setIndex(0);
            setSelectedIndex(null);
            setAnswers([]);
            setFinished(false);
            setFocusMode(true);
          }}><RotateCcw size={18} />再练一次</Button>
          <Button variant="secondary" onClick={onClose}>返回语法讲解</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="quiz-session grammar-quiz">
      <div className="session-topline">
        <span>{point.title} · 配套练习</span>
        <strong>{index + 1} / {questions.length}</strong>
      </div>
      <div className="session-progress"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
      <article className="question-card card">
        <span className="question-type">单项选择</span>
        {question.context && <p className="question-context">{question.context}</p>}
        <h1>{question.prompt}</h1>
        <div className="option-list">
          {question.options.map((option, optionIndex) => {
            const selected = selectedIndex === optionIndex;
            const showCorrect = selectedIndex !== null && optionIndex === question.correctIndex;
            const showWrong = selected && !correct;
            return (
              <button
                className={`quiz-option${selected ? " selected" : ""}${showCorrect ? " correct" : ""}${showWrong ? " wrong" : ""}`}
                key={option}
                onClick={() => selectedIndex === null && setSelectedIndex(optionIndex)}
                disabled={selectedIndex !== null}
              >
                <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                <span>{option}</span>
                {showCorrect && <CheckCircle2 size={20} />}
                {showWrong && <XCircle size={20} />}
              </button>
            );
          })}
        </div>
        {selectedIndex !== null && (
          <div className={`answer-explanation ${correct ? "correct" : "wrong"}`}>
            <strong>{correct ? "回答正确" : "再留意一下"}</strong>
            <p>{question.explanation}</p>
          </div>
        )}
        <div className="question-footer">
          <span>按 1–4 选择答案</span>
          <Button onClick={() => void next()} disabled={selectedIndex === null || submitting}>
            {index >= questions.length - 1 ? "完成练习" : "下一题"}<ArrowRight size={18} />
          </Button>
        </div>
      </article>
    </section>
  );
}
