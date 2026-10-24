"use client";
import { useCallback, useMemo } from "react";
import { WORD_PAIRS } from "@/data/words";
import { BOOK_VOCAB_WORDS } from "@/data/book-vocab-data";
import { bookToStudyWord, findBookStudyWord } from "@/lib/book-learning";
import { dateKey, isAnswerCorrect, updateDailyRecord, updateMistakeRecord, updateWordMastery } from "@/lib/learning";
import { applyWordQuizAnswer } from "@/lib/word-quiz-scheduler";
import { quizExpressions, type WordQuizQuestion } from "@/lib/word-quiz";
import { suspendReview } from "@/lib/spaced-repetition";
import type { MasteryRating, StudyMode, WordStudyOptions } from "@/lib/models";
import { summarizeWordProgress } from "@/lib/repositories/migrations";
import { createPlan } from "../snapshot-utils";
import type { SnapshotStore } from "../use-snapshot-store";
type Deps = Pick<SnapshotStore, "persistSnapshot" | "snapshotRef" | "settingsRef">;
export function useWordActions({ persistSnapshot, snapshotRef, settingsRef }: Deps) {
  const answerWordQuiz = useCallback(async (question: WordQuizQuestion, selectedIndex: number, options: WordStudyOptions = {}) => {
    const current = snapshotRef.current;
    const word = [...WORD_PAIRS, ...current.aiWords].find((item) => item.id === question.sourceId);
    if (!word || !Number.isInteger(selectedIndex) || selectedIndex < -1 || selectedIndex >= question.options.length || question.options[question.correctIndex] !== quizExpressions(word, question.wordQuiz.direction).answer) throw new Error("词汇题目无效，请重新进入学习。");
    const mode = question.wordQuiz.mode;
    const nowDate = new Date(); const now = nowDate.toISOString(); const today = dateKey(nowDate);
    const correct = isAnswerCorrect(question, selectedIndex);
    const previous = current.wordProgress.find((item) => item.wordId === word.id);
    const priorMode = previous?.modes[mode];
    const review = applyWordQuizAnswer(priorMode, correct, question.wordQuiz.direction, mode, now);
    const progress = summarizeWordProgress(word.id, { ...previous?.modes, [mode]: review }, now);
    const mistake = current.mistakes.find((item) => item.question.id === question.id);
    // One correct objective answer clears this active exercise; FSRS handles long-term retention.
    const updatedMistake = updateMistakeRecord(mistake, question, selectedIndex, now, 1);
    const elapsed = Math.max(0, Math.min(300, Number.isFinite(options.elapsedSeconds) ? options.elapsedSeconds! : 0));
    const firstToday = !(priorMode?.recallHistory ?? []).some((attempt) => attempt.method === "choice" && dateKey(new Date(attempt.at)) === today);
    const countWord = firstToday ? 1 : 0;
    await persistSnapshot({ ...current,
      wordProgress: [...current.wordProgress.filter((item) => item.wordId !== word.id), progress],
      mistakes: updatedMistake ? [...current.mistakes.filter((item) => item.id !== updatedMistake.id), updatedMistake] : current.mistakes,
      testResults: [...current.testResults, { id: `word-quiz-${nowDate.getTime()}-${Math.random().toString(36).slice(2, 8)}`, mode: mode === "combined" ? "mixed" : mode,
        sourceFilter: "all-learned", answers: [{ question, selectedIndex, isCorrect: correct }], correctCount: Number(correct),
        startedAt: new Date(nowDate.getTime() - elapsed * 1000).toISOString(), completedAt: now, durationSeconds: elapsed }],
      dailyRecords: updateDailyRecord(current.dailyRecords, today, {
        wordsStudied: countWord, ...(priorMode ? { reviewWordsStudied: countWord } : { newWordsStudied: countWord }),
        ...(mode === "japanese" ? { japaneseWordsStudied: countWord } : mode === "english" ? { englishWordsStudied: countWord } : { combinedWordsStudied: countWord }),
        studySeconds: elapsed, questionsAnswered: 1, correctAnswers: Number(correct),
      }),
    });
    return progress;
  }, [persistSnapshot, snapshotRef]);
  const markWordKnown = useCallback(async (wordId: string, mode?: StudyMode) => {
    const useMode = mode ?? settingsRef.current.defaultStudyMode;
    const now = new Date().toISOString();
    const current = snapshotRef.current;
    const previous = current.wordProgress.find((item) => item.wordId === wordId);
    const wasNew = !previous?.modes[useMode];
    const modes = { ...previous?.modes, [useMode]: suspendReview(previous?.modes[useMode], now) };
    const alreadyRetired = previous?.modes[useMode]?.suspended;
    await persistSnapshot({ ...current,
      wordProgress: [...current.wordProgress.filter((item) => item.wordId !== wordId), summarizeWordProgress(wordId, modes, now)],
      dailyRecords: alreadyRetired ? current.dailyRecords : updateDailyRecord(current.dailyRecords, dateKey(new Date(now)), { wordsStudied: 1, ...(wasNew ? { newWordsStudied: 1 } : { reviewWordsStudied: 1 }) }),
    });
  }, [persistSnapshot, settingsRef, snapshotRef]);
  const studyWord = useCallback(async (wordId: string, rating: MasteryRating, mode: StudyMode = settingsRef.current.defaultStudyMode, options: WordStudyOptions = {}) => {
    const nowDate = new Date(); const now = nowDate.toISOString(); const current = snapshotRef.current;
    const previous = current.wordProgress.find((item) => item.wordId === wordId);
    const wasNew = !previous?.modes[mode];
    const progress = updateWordMastery(previous, wordId, rating, now, mode);
    await persistSnapshot({ ...current,
      wordProgress: [...current.wordProgress.filter((item) => item.wordId !== wordId), progress],
      dailyRecords: updateDailyRecord(current.dailyRecords, dateKey(nowDate), {
        wordsStudied: 1, ...(wasNew ? { newWordsStudied: 1 } : { reviewWordsStudied: 1 }),
        ...(mode === "japanese" ? { japaneseWordsStudied: 1 } : mode === "english" ? { englishWordsStudied: 1 } : { combinedWordsStudied: 1 }),
        studySeconds: Math.max(0, Math.min(300, options.elapsedSeconds ?? 0)),
      }),
    });
    return progress;
  }, [persistSnapshot, settingsRef, snapshotRef]);
  const addBookWord = useCallback(async (bookId: string) => {
    const book = BOOK_VOCAB_WORDS.find((item) => item.id === bookId);
    if (!book) throw new Error("找不到词书词条");
    const current = snapshotRef.current;
    const existing = findBookStudyWord(book, [...WORD_PAIRS, ...current.aiWords]);
    const word = existing ?? bookToStudyWord(book);
    const next = { ...current, aiWords: existing ? current.aiWords : [...current.aiWords, word], favorites: [...new Set([...current.favorites, `word:${word.id}`])] };
    const today = dateKey(new Date());
    const plan = current.dailyPlans.find((item) => item.date === today) ?? createPlan(next, settingsRef.current);
    // Japanese-only entries remain available via the direct Japanese study link.
    const canAddToPlan = plan.studyMode === "japanese" || Boolean(word.english.term);
    const learned = current.wordProgress.find((item) => item.wordId === word.id)?.modes[plan.studyMode];
    const updated = { ...plan, newWordIds: canAddToPlan && !learned ? [...new Set([...plan.newWordIds, word.id])] : plan.newWordIds };
    await persistSnapshot({ ...next, dailyPlans: [...current.dailyPlans.filter((item) => item.date !== today), updated] });
    return word.id;
  }, [persistSnapshot, settingsRef, snapshotRef]);
  return useMemo(() => ({ markWordKnown, studyWord, addBookWord, answerWordQuiz }), [markWordKnown, studyWord, addBookWord, answerWordQuiz]);
}
