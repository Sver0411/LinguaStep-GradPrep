"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { useLearning } from "@/context/LearningContext";
import { dateKey, isAnswerCorrect } from "@/lib/learning";
import { getNextLearningAction } from "@/lib/learning-flow";
import type { GrammarComparison } from "@/lib/models";
import { Button } from "@/components/ui";

export function ComparisonPractice({
  comparison,
  onClose,
}: {
  comparison: GrammarComparison;
  onClose: () => void;
}) {
  const { snapshot, completeTest } = useLearning();
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const question = comparison.exercise;
  const correct = selected !== null && isAnswerCorrect(question, selected);
  const nextAction = getNextLearningAction(snapshot, dateKey(new Date()));

  const submit = async () => {
    if (selected === null) return;
    await completeTest(
      [{ question, selectedIndex: selected, isCorrect: correct }],
      {
        mode: "mixed",
        sourceFilter: "all-learned",
        startedAt: new Date().toISOString(),
      },
    );
    setSubmitted(true);
  };

  return (
    <section className="quiz-session grammar-quiz comparison-quiz">
      <button className="text-button" onClick={onClose}><ArrowLeft size={16} />返回对比讲解</button>
      <article className="question-card card">
        <span className="question-type">日英语法对比</span>
        <h1>{question.prompt}</h1>
        <div className="option-list">
          {question.options.map((option, index) => {
            const isSelected = selected === index;
            const showCorrect = submitted && index === question.correctIndex;
            const showWrong = submitted && isSelected && !correct;
            return (
              <button
                key={`${option}-${index}`}
                className={`quiz-option${isSelected ? " selected" : ""}${showCorrect ? " correct" : ""}${showWrong ? " wrong" : ""}`}
                onClick={() => !submitted && setSelected(index)}
                disabled={submitted}
              >
                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                <span>{option}</span>
                {showCorrect && <CheckCircle2 size={20} />}
                {showWrong && <XCircle size={20} />}
              </button>
            );
          })}
        </div>
        {submitted && (
          <div className={`answer-explanation ${correct ? "correct" : "wrong"}`}>
            <strong>{correct ? "回答正确" : "需要再比较一次"}</strong>
            <p>{question.explanation}</p>
          </div>
        )}
        <div className="question-footer">
          <span>答错会进入“日英对比错题”</span>
          {submitted ? (
            <div className="page-actions"><Link className="button button-primary" href={nextAction.href}>{nextAction.label}<ArrowRight size={17} /></Link><Button variant="secondary" onClick={onClose}>返回讲解</Button></div>
          ) : (
            <Button onClick={() => void submit()} disabled={selected === null}>提交答案</Button>
          )}
        </div>
      </article>
    </section>
  );
}
