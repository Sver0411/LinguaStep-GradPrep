"use client";

import { useCallback, useMemo } from "react";
import { GRAMMAR_POINTS } from "@/data/grammar";
import { dateKey, isAnswerCorrect, updateDailyRecord, updateGrammarProgress, updateMistakeRecord } from "@/lib/learning";
import type { LearningSnapshot, MistakeRecord, TestAnswer, TestResult } from "@/lib/models";
import { CompleteTestOptions } from "../types";

type Deps = Pick<SnapshotStore, "persistSnapshot" | "snapshotRef" | "settingsRef">;

export function usePracticeActions(deps: Deps) {
  const { persistSnapshot, snapshotRef, settingsRef } = deps;

    const applyAnswersToMistakes = useCallback(
      (currentMistakes: MistakeRecord[], answers: TestAnswer[], now: string) => {
        let mistakes = [...currentMistakes];
        answers.forEach((answer) => {
          const existing = mistakes.find(
            (item) => item.question.id === answer.question.id,
          );
          const updated = updateMistakeRecord(
            existing,
            answer.question,
            answer.selectedIndex,
            now,
            settingsRef.current.masteryStreak,
          );
          if (updated) {
            mistakes = [
              ...mistakes.filter((item) => item.id !== updated.id),
              updated,
            ];
          }
        });
        return mistakes;
      },
      [],
    );

    const completeGrammar = useCallback(
      async (grammarId: string, answers: TestAnswer[]) => {
        const nowDate = new Date();
        const now = nowDate.toISOString();
        const current = snapshotRef.current;
        const normalizedAnswers = answers.map((answer) => ({
          ...answer,
          isCorrect: isAnswerCorrect(answer.question, answer.selectedIndex),
        }));
        const correct = normalizedAnswers.filter((answer) => answer.isCorrect).length;
        const previous = current.grammarProgress.find(
          (item) => item.grammarId === grammarId,
        );
        const progress = updateGrammarProgress(
          previous,
          grammarId,
          correct,
          normalizedAnswers.length,
          now,
        );
        const point = [...GRAMMAR_POINTS, ...current.aiGrammar].find(
          (item) => item.id === grammarId,
        );
        const languageDelta =
          point?.language === "english"
            ? { englishGrammarStudied: 1 }
            : { japaneseGrammarStudied: 1 };
        const next: LearningSnapshot = {
          ...current,
          grammarProgress: [
            ...current.grammarProgress.filter((item) => item.grammarId !== grammarId),
            progress,
          ],
          mistakes: applyAnswersToMistakes(
            current.mistakes,
            normalizedAnswers,
            now,
          ),
          dailyRecords: updateDailyRecord(current.dailyRecords, dateKey(nowDate), {
            grammarStudied: 1,
            questionsAnswered: normalizedAnswers.length,
            correctAnswers: correct,
            ...languageDelta,
          }),
        };
        await persistSnapshot(next);
        return progress;
      },
      [applyAnswersToMistakes, persistSnapshot],
    );

    const completeTest = useCallback(
      async (answers: TestAnswer[], options: Partial<CompleteTestOptions> = {}) => {
        const completedDate = new Date();
        const completedAt = completedDate.toISOString();
        const startedAt = options.startedAt ?? completedAt;
        const normalizedAnswers = answers.map((answer) => ({
          ...answer,
          isCorrect: isAnswerCorrect(answer.question, answer.selectedIndex),
        }));
        const correctCount = normalizedAnswers.filter(
          (answer) => answer.isCorrect,
        ).length;
        const result: TestResult = {
          id: `test-${completedDate.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
          mode: options.mode ?? "mixed",
          sourceFilter: options.sourceFilter ?? "all-learned",
          answers: normalizedAnswers,
          correctCount,
          startedAt,
          completedAt,
          durationSeconds: Math.max(
            0,
            Math.round(
              (completedDate.getTime() - new Date(startedAt).getTime()) / 1000,
            ),
          ),
        };
        const current = snapshotRef.current;
        const next: LearningSnapshot = {
          ...current,
          mistakes: applyAnswersToMistakes(
            current.mistakes,
            normalizedAnswers,
            completedAt,
          ),
          testResults: [...current.testResults, result],
          dailyRecords: updateDailyRecord(
            current.dailyRecords,
            dateKey(completedDate),
            {
              questionsAnswered: normalizedAnswers.length,
              correctAnswers: correctCount,
            },
          ),
        };
        await persistSnapshot(next);
        return result;
      },
      [applyAnswersToMistakes, persistSnapshot],
    );

  return useMemo(() => ({ completeGrammar, completeTest }), [completeGrammar, completeTest]);
}

import type { SnapshotStore } from "../use-snapshot-store";
