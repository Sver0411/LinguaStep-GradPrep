"use client";

import { useState } from "react";
import type { ChoiceQuestion } from "@/lib/models";
import { matchesTypedAnswer } from "@/lib/training";
import { SpeakButton } from "./SpeakButton";

/** Retain the original listening/input task when a training item becomes a mistake. */
export function TrainingQuestionInput({ question, disabled, onChange }: {
  question: ChoiceQuestion;
  disabled: boolean;
  onChange: (index: number | null) => void;
}) {
  const [text, setText] = useState("");
  return <>
    {question.audio && <SpeakButton text={question.audio.text} language={question.audio.language} label="播放题目音频" />}
    {question.acceptedAnswers && <label>你的答案<input aria-label="输入答案" autoComplete="off" disabled={disabled} value={text} onChange={(event) => {
      const value = event.target.value;
      setText(value);
      onChange(!value.trim() ? null : matchesTypedAnswer(value, question.acceptedAnswers!) ? question.correctIndex : (question.correctIndex + 1) % 4);
    }} /></label>}
  </>;
}
