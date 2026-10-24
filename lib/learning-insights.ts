import { dateKey } from "./learning";
import type { LearningSnapshot } from "./models";
const DAY = 86400000;
export function learningInsights(snapshot: LearningSnapshot, now = new Date()) {
  const attempts = snapshot.wordProgress.flatMap((word) => Object.entries(word.modes).flatMap(([mode, state]) =>
    (state?.recallHistory ?? []).map((attempt) => ({ ...attempt, key: `${word.wordId}:${mode}:${dateKey(new Date(attempt.at))}` })),
  )).sort((a, b) => a.at.localeCompare(b.at));
  // Keep objective choices separate from legacy self-ratings.
  const delayedWindows = (method: "choice" | "self") => {
    const seenDays = new Set<string>();
    const delayed = attempts.filter((attempt) => {
      if ((attempt.method === "choice") !== (method === "choice") || seenDays.has(attempt.key)) return false;
      seenDays.add(attempt.key); return attempt.gapDays >= 1;
    });
    return [7, 30].map((days) => {
    const values = delayed.filter((attempt) => Date.parse(attempt.at) >= now.getTime() - days * DAY && Date.parse(attempt.at) <= now.getTime());
    const success = values.filter((attempt) => attempt.rating === "known").length;
    return { days, total: values.length, success, percent: values.length ? Math.round(success / values.length * 100) : null };
    });
  };
  const windows = delayedWindows("self");
  const recognitionWindows = delayedWindows("choice");
  const seenQuestions = new Set<string>();
  const skills = new Map<string, { total: number; correct: number }>();
  const firstAttempts = [...snapshot.testResults].sort((a, b) => a.completedAt.localeCompare(b.completedAt)).flatMap((result) => result.answers.filter((answer) => {
    if (seenQuestions.has(answer.question.id)) return false;
    seenQuestions.add(answer.question.id); return true;
  }));
  firstAttempts.forEach((answer) => {
    const skill = answer.question.category ?? "grammar";
    const value = skills.get(skill) ?? { total: 0, correct: 0 };
    skills.set(skill, { total: value.total + 1, correct: value.correct + Number(answer.isCorrect) });
  });
  return { windows, recognitionWindows, firstTotal: firstAttempts.length, firstCorrect: firstAttempts.filter((answer) => answer.isCorrect).length,
    skills: [...skills.entries()].map(([skill, values]) => ({ skill, ...values, percent: Math.round(values.correct / values.total * 100) })),
    repeatedMistakes: [...snapshot.mistakes].filter((item) => item.errorCount >= 2).sort((a, b) => b.errorCount - a.errorCount).slice(0, 5),
  };
}
