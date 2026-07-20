import { MISTAKE_MASTERY_STREAK } from "./constants";
import type {
  ChoiceQuestion,
  DailyRecord,
  GrammarPoint,
  GrammarProgress,
  MasteryRating,
  MistakeRecord,
  ReviewSchedule,
  WordPair,
  WordProgress,
} from "./models";

const DAY_MS = 86_400_000;

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString();
}

function initialSchedule(now: string): ReviewSchedule {
  return {
    dueAt: now,
    intervalDays: 0,
    easeFactor: 2.3,
    repetitions: 0,
    lapses: 0,
  };
}

export function updateWordMastery(
  previous: WordProgress | undefined,
  wordId: string,
  rating: MasteryRating,
  now: string,
): WordProgress {
  const schedule = previous?.schedule ?? initialSchedule(now);
  let nextSchedule: ReviewSchedule;

  if (rating === "known") {
    const intervalDays =
      schedule.repetitions === 0
        ? 3
        : Math.max(3, Math.round(schedule.intervalDays * schedule.easeFactor));
    nextSchedule = {
      ...schedule,
      dueAt: addDays(now, intervalDays),
      intervalDays,
      easeFactor: Math.min(2.8, schedule.easeFactor + 0.05),
      repetitions: schedule.repetitions + 1,
    };
  } else if (rating === "fuzzy") {
    nextSchedule = {
      ...schedule,
      dueAt: addDays(now, 1),
      intervalDays: 1,
      easeFactor: Math.max(1.3, schedule.easeFactor - 0.15),
      repetitions: Math.max(0, schedule.repetitions - 1),
    };
  } else {
    nextSchedule = {
      ...schedule,
      dueAt: new Date(new Date(now).getTime() + 10 * 60_000).toISOString(),
      intervalDays: 0,
      easeFactor: Math.max(1.3, schedule.easeFactor - 0.25),
      repetitions: 0,
      lapses: schedule.lapses + 1,
    };
  }

  return {
    wordId,
    status: rating === "known" ? "learned" : "learning",
    mastery: rating,
    studyCount: (previous?.studyCount ?? 0) + 1,
    firstStudiedAt: previous?.firstStudiedAt ?? now,
    lastStudiedAt: now,
    schedule: nextSchedule,
  };
}

export function updateGrammarProgress(
  previous: GrammarProgress | undefined,
  grammarId: string,
  correct: number,
  attempted: number,
  now: string,
): GrammarProgress {
  const priorSchedule = previous?.schedule ?? initialSchedule(now);
  const ratio = attempted > 0 ? correct / attempted : 0;
  const intervalDays = ratio >= 0.8 ? Math.max(3, priorSchedule.intervalDays * 2 || 3) : 1;

  return {
    grammarId,
    status: ratio >= 0.8 ? "learned" : "learning",
    studyCount: (previous?.studyCount ?? 0) + 1,
    correctCount: (previous?.correctCount ?? 0) + correct,
    attemptCount: (previous?.attemptCount ?? 0) + attempted,
    firstStudiedAt: previous?.firstStudiedAt ?? now,
    lastStudiedAt: now,
    schedule: {
      ...priorSchedule,
      dueAt: addDays(now, intervalDays),
      intervalDays,
      repetitions: priorSchedule.repetitions + (ratio >= 0.8 ? 1 : 0),
      lapses: priorSchedule.lapses + (ratio < 0.6 ? 1 : 0),
    },
  };
}

export function isAnswerCorrect(
  question: ChoiceQuestion,
  selectedIndex: number,
): boolean {
  return selectedIndex === question.correctIndex;
}

export function updateMistakeRecord(
  previous: MistakeRecord | undefined,
  question: ChoiceQuestion,
  selectedIndex: number,
  now: string,
): MistakeRecord | null {
  const correct = isAnswerCorrect(question, selectedIndex);
  if (correct && !previous) return null;

  if (correct && previous) {
    const correctStreak = previous.correctStreak + 1;
    return {
      ...previous,
      selectedIndex,
      correctStreak,
      active: correctStreak < MISTAKE_MASTERY_STREAK,
      priority: Math.max(0, previous.priority - 1),
      lastAnsweredAt: now,
    };
  }

  return {
    id: previous?.id ?? `mistake-${question.id}`,
    question,
    selectedIndex,
    errorCount: (previous?.errorCount ?? 0) + 1,
    correctStreak: 0,
    active: true,
    priority: Math.min(5, (previous?.priority ?? 0) + 1),
    firstWrongAt: previous?.firstWrongAt ?? now,
    lastWrongAt: now,
    lastAnsweredAt: now,
  };
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function updateDailyRecord(
  records: DailyRecord[],
  date: string,
  delta: Partial<Omit<DailyRecord, "date">>,
): DailyRecord[] {
  const current = records.find((item) => item.date === date) ?? {
    date,
    wordsStudied: 0,
    grammarStudied: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
  };
  const next: DailyRecord = {
    date,
    wordsStudied: current.wordsStudied + (delta.wordsStudied ?? 0),
    ...((current.newWordsStudied !== undefined ||
      delta.newWordsStudied !== undefined) && {
      newWordsStudied:
        (current.newWordsStudied ?? 0) + (delta.newWordsStudied ?? 0),
    }),
    ...((current.reviewWordsStudied !== undefined ||
      delta.reviewWordsStudied !== undefined) && {
      reviewWordsStudied:
        (current.reviewWordsStudied ?? 0) + (delta.reviewWordsStudied ?? 0),
    }),
    grammarStudied: current.grammarStudied + (delta.grammarStudied ?? 0),
    questionsAnswered: current.questionsAnswered + (delta.questionsAnswered ?? 0),
    correctAnswers: current.correctAnswers + (delta.correctAnswers ?? 0),
  };
  return [...records.filter((item) => item.date !== date), next].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export function calculateStreak(dates: string[], today: string): number {
  const activity = new Set(dates);
  const todayDate = new Date(`${today}T12:00:00`);
  const yesterday = new Date(todayDate.getTime() - DAY_MS);
  let cursor = activity.has(today) ? todayDate : yesterday;
  if (!activity.has(dateKey(cursor))) return 0;

  let streak = 0;
  while (activity.has(dateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

function buildOptions(
  correct: string,
  distractors: string[],
  seed: number,
): { options: [string, string, string, string]; correctIndex: number } {
  const unique = [...new Set(distractors.filter((item) => item !== correct))].slice(0, 3);
  while (unique.length < 3) unique.push(`备选项 ${unique.length + 1}`);
  const correctIndex = seed % 4;
  const values = [...unique];
  values.splice(correctIndex, 0, correct);
  return {
    options: values as [string, string, string, string],
    correctIndex,
  };
}

function createWordQuestion(
  word: WordPair,
  vocabulary: WordPair[],
  variant: number,
  seed: number,
): ChoiceQuestion {
  const rotated = vocabulary
    .slice(seed + 1)
    .concat(vocabulary.slice(0, seed + 1));
  const mode = variant % 5;
  let prompt: string;
  let correct: string;
  let distractors: string[];

  if (mode === 0) {
    prompt = `“${word.meaningZh}”对应的日语是？`;
    correct = word.japanese.term;
    distractors = rotated.map((item) => item.japanese.term);
  } else if (mode === 1) {
    prompt = `“${word.meaningZh}”对应的英语是？`;
    correct = word.english.term;
    distractors = rotated.map((item) => item.english.term);
  } else if (mode === 2) {
    prompt = `日语“${word.japanese.term}”对应的英语是？`;
    correct = word.english.term;
    distractors = rotated.map((item) => item.english.term);
  } else if (mode === 3) {
    prompt = `英语“${word.english.term}”对应的日语是？`;
    correct = word.japanese.term;
    distractors = rotated.map((item) => item.japanese.term);
  } else {
    prompt = `“${word.english.term} / ${word.japanese.term}”最准确的中文含义是？`;
    correct = word.meaningZh;
    distractors = rotated.map((item) => item.meaningZh);
  }

  const choice = buildOptions(correct, distractors, seed + variant);
  return {
    id: `word-${word.id}-v${mode}`,
    source: "word",
    sourceId: word.id,
    prompt,
    options: choice.options,
    correctIndex: choice.correctIndex,
    explanation: `${word.japanese.term}（${word.japanese.reading ?? ""}）和 ${word.english.term} 都可表达“${word.meaningZh}”。${word.note}`,
  };
}

export function createMixedTest(
  wordProgress: WordProgress[],
  grammarProgress: GrammarProgress[],
  vocabulary: WordPair[],
  grammar: GrammarPoint[],
  count: number,
): ChoiceQuestion[] {
  const learnedWordIds = new Set(wordProgress.map((item) => item.wordId));
  const learnedGrammarIds = new Set(grammarProgress.map((item) => item.grammarId));
  const learnedWords = vocabulary.filter((item) => learnedWordIds.has(item.id));
  const learnedGrammar = grammar.filter((item) => learnedGrammarIds.has(item.id));
  const wordCandidates: ChoiceQuestion[] = [];
  const grammarCandidates: ChoiceQuestion[] = [];

  learnedWords.forEach((word, index) => {
    for (let variant = 0; variant < 5; variant += 1) {
      wordCandidates.push(
        createWordQuestion(word, vocabulary, variant, index * 7 + variant),
      );
    }
  });
  learnedGrammar.forEach((point) => {
    grammarCandidates.push(...point.exercises);
  });

  const result: ChoiceQuestion[] = [];
  let wordIndex = 0;
  let grammarIndex = 0;
  let preferWord = true;
  const target = Math.max(1, count);

  while (
    result.length < target &&
    (wordIndex < wordCandidates.length || grammarIndex < grammarCandidates.length)
  ) {
    if (
      preferWord &&
      wordIndex < wordCandidates.length ||
      grammarIndex >= grammarCandidates.length
    ) {
      result.push(wordCandidates[wordIndex]);
      wordIndex += 1;
    } else {
      result.push(grammarCandidates[grammarIndex]);
      grammarIndex += 1;
    }
    preferWord = !preferWord;
  }

  return result;
}

export function dueWordCount(progress: WordProgress[], now: string): number {
  const timestamp = new Date(now).getTime();
  return progress.filter((item) => new Date(item.schedule.dueAt).getTime() <= timestamp)
    .length;
}

export function needsWordReview(
  progress: WordProgress,
  nowTimestamp: number,
): boolean {
  return (
    progress.mastery !== "known" ||
    new Date(progress.schedule.dueAt).getTime() <= nowTimestamp
  );
}

/** Unknown and fuzzy words come first, followed by the earliest due words. */
export function compareWordReviewPriority(
  left: WordProgress,
  right: WordProgress,
): number {
  const masteryPriority: Record<MasteryRating, number> = {
    unknown: 0,
    fuzzy: 1,
    known: 2,
  };
  return (
    masteryPriority[left.mastery] - masteryPriority[right.mastery] ||
    left.schedule.dueAt.localeCompare(right.schedule.dueAt) ||
    left.lastStudiedAt.localeCompare(right.lastStudiedAt)
  );
}
