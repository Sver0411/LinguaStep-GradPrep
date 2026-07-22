import { MISTAKE_MASTERY_STREAK } from "./constants";
import {
  localDateFromKey,
  localDateKey,
  safeTimestamp,
  shiftLocalDateKey,
} from "./date";
import { summarizeWordProgress } from "./repositories/migrations";
import {
  applyReviewRating,
  isReviewDue,
  reviewUrgency,
} from "./spaced-repetition";
import type {
  ChoiceQuestion,
  DailyRecord,
  GrammarComparison,
  GrammarPoint,
  GrammarProgress,
  MasteryRating,
  MistakeRecord,
  ReviewState,
  StudyMode,
  TestMode,
  TestSourceFilter,
  WordPair,
  WordProgress,
} from "./models";

export const dateKey = localDateKey;

export function getWordModeState(
  progress: WordProgress | undefined,
  mode: StudyMode,
): ReviewState | undefined {
  return progress?.modes[mode];
}

export function updateWordMastery(
  previous: WordProgress | undefined,
  wordId: string,
  rating: MasteryRating,
  now: string,
  mode: StudyMode = "combined",
): WordProgress {
  const nextState = applyReviewRating(previous?.modes[mode], rating, now);
  return summarizeWordProgress(
    wordId,
    { ...(previous?.modes ?? {}), [mode]: nextState },
    now,
  );
}

export function updateGrammarProgress(
  previous: GrammarProgress | undefined,
  grammarId: string,
  correct: number,
  attempted: number,
  now: string,
): GrammarProgress {
  const ratio = attempted > 0 ? correct / attempted : 0;
  const rating: MasteryRating =
    ratio >= 0.8 ? "known" : ratio >= 0.5 ? "fuzzy" : "unknown";
  const review = applyReviewRating(previous?.review, rating, now);
  return {
    grammarId,
    status: review.status,
    studyCount: (previous?.studyCount ?? 0) + 1,
    correctCount: (previous?.correctCount ?? 0) + correct,
    attemptCount: (previous?.attemptCount ?? 0) + attempted,
    firstStudiedAt: previous?.firstStudiedAt ?? now,
    lastStudiedAt: now,
    nextReviewAt: review.nextReviewAt,
    review,
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
  masteryStreak = MISTAKE_MASTERY_STREAK,
): MistakeRecord | null {
  const correct = isAnswerCorrect(question, selectedIndex);
  if (correct && !previous) return null;

  if (correct && previous) {
    const correctStreak = previous.correctStreak + 1;
    const mastered = correctStreak >= masteryStreak;
    return {
      ...previous,
      selectedIndex,
      correctStreak,
      active: !mastered,
      state: mastered ? "mastered" : "consolidating",
      priority: Math.max(0, previous.priority - 1),
      lastAnsweredAt: now,
      history: [
        ...previous.history,
        { answeredAt: now, selectedIndex, correct: true },
      ],
    };
  }

  return {
    id: previous?.id ?? `mistake-${question.id}`,
    contentRef: previous?.contentRef ?? {
      source: question.source,
      sourceId: question.sourceId,
    },
    question,
    selectedIndex,
    errorCount: (previous?.errorCount ?? 0) + 1,
    correctStreak: 0,
    active: true,
    state: "active",
    priority: Math.min(10, (previous?.priority ?? 0) + 1),
    favorite: previous?.favorite ?? false,
    firstWrongAt: previous?.firstWrongAt ?? now,
    lastWrongAt: now,
    lastAnsweredAt: now,
    history: [
      ...(previous?.history ?? []),
      { answeredAt: now, selectedIndex, correct: false },
    ],
  };
}

export function updateDailyRecord(
  records: DailyRecord[],
  date: string,
  delta: Partial<Omit<DailyRecord, "date">>,
): DailyRecord[] {
  const current = records.find((item) => item.date === date) ?? emptyDailyRecord(date);
  const fields: Array<keyof Omit<DailyRecord, "date">> = [
    "wordsStudied",
    "newWordsStudied",
    "reviewWordsStudied",
    "japaneseWordsStudied",
    "englishWordsStudied",
    "combinedWordsStudied",
    "grammarStudied",
    "japaneseGrammarStudied",
    "englishGrammarStudied",
    "questionsAnswered",
    "correctAnswers",
  ];
  const next = { ...current };
  fields.forEach((field) => {
    next[field] = current[field] + (delta[field] ?? 0);
  });
  return [...records.filter((item) => item.date !== date), next].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export function emptyDailyRecord(date: string): DailyRecord {
  return {
    date,
    wordsStudied: 0,
    newWordsStudied: 0,
    reviewWordsStudied: 0,
    japaneseWordsStudied: 0,
    englishWordsStudied: 0,
    combinedWordsStudied: 0,
    grammarStudied: 0,
    japaneseGrammarStudied: 0,
    englishGrammarStudied: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
  };
}

export function calculateStreak(dates: string[], today: string): number {
  const activity = new Set(dates);
  let cursor = activity.has(today) ? today : shiftLocalDateKey(today, -1);
  if (!activity.has(cursor)) return 0;
  let streak = 0;
  while (activity.has(cursor)) {
    streak += 1;
    cursor = shiftLocalDateKey(cursor, -1);
  }
  return streak;
}

export function calculateLongestStreak(dates: string[]): number {
  const unique = [...new Set(dates)].sort();
  let longest = 0;
  let current = 0;
  let previous: string | undefined;
  unique.forEach((date) => {
    current =
      previous && shiftLocalDateKey(previous, 1) === date ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = date;
  });
  return longest;
}

function optionCandidates(
  word: WordPair,
  vocabulary: WordPair[],
  pick: (item: WordPair) => string,
): string[] {
  const samePart = vocabulary.filter(
    (item) =>
      item.id !== word.id &&
      (item.japanese.partOfSpeech === word.japanese.partOfSpeech ||
        item.english.partOfSpeech === word.english.partOfSpeech),
  );
  const sameDifficulty = vocabulary.filter(
    (item) =>
      item.id !== word.id &&
      (item.japanese.difficulty === word.japanese.difficulty ||
        item.english.difficulty === word.english.difficulty),
  );
  return [...samePart, ...sameDifficulty, ...vocabulary]
    .filter((item, index, values) =>
      values.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .map(pick);
}

function buildOptions(
  correct: string,
  distractors: string[],
  seed: number,
): { options: [string, string, string, string]; correctIndex: number } {
  const unique = [...new Set(distractors.filter((item) => item !== correct))].slice(0, 3);
  if (unique.length < 3) return {
    options: [correct, ...unique, ...Array.from({ length: 3 - unique.length }, () => "—")]
      .slice(0, 4) as [string, string, string, string],
    correctIndex: 0,
  };
  const correctIndex = Math.abs(seed) % 4;
  const values = [...unique];
  values.splice(correctIndex, 0, correct);
  return { options: values as [string, string, string, string], correctIndex };
}

function seededRank(value: string, seed: number): number {
  let hash = seed | 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

function createWordQuestions(
  word: WordPair,
  vocabulary: WordPair[],
  mode: TestMode,
  seed: number,
): ChoiceQuestion[] {
  const definitions =
    mode === "japanese"
      ? [
          {
            prompt: `“${word.meaningZh}”对应的日语是？`,
            correct: word.japanese.term,
            distractors: optionCandidates(word, vocabulary, (item) => item.japanese.term),
          },
          {
            prompt: `日语“${word.japanese.term}”的中文含义是？`,
            correct: word.meaningZh,
            distractors: optionCandidates(word, vocabulary, (item) => item.meaningZh),
          },
        ]
      : mode === "english"
        ? [
            {
              prompt: `“${word.meaningZh}”对应的英语是？`,
              correct: word.english.term,
              distractors: optionCandidates(word, vocabulary, (item) => item.english.term),
            },
            {
              prompt: `英语“${word.english.term}”的中文含义是？`,
              correct: word.meaningZh,
              distractors: optionCandidates(word, vocabulary, (item) => item.meaningZh),
            },
          ]
        : [
            {
              prompt: `“${word.meaningZh}”对应的日语是？`,
              correct: word.japanese.term,
              distractors: optionCandidates(word, vocabulary, (item) => item.japanese.term),
            },
            {
              prompt: `“${word.meaningZh}”对应的英语是？`,
              correct: word.english.term,
              distractors: optionCandidates(word, vocabulary, (item) => item.english.term),
            },
            {
              prompt: `日语“${word.japanese.term}”对应的英语是？`,
              correct: word.english.term,
              distractors: optionCandidates(word, vocabulary, (item) => item.english.term),
            },
            {
              prompt: `英语“${word.english.term}”对应的日语是？`,
              correct: word.japanese.term,
              distractors: optionCandidates(word, vocabulary, (item) => item.japanese.term),
            },
            {
              prompt: `日语“${word.japanese.term}”的中文含义是？`,
              correct: word.meaningZh,
              distractors: optionCandidates(word, vocabulary, (item) => item.meaningZh),
            },
            {
              prompt: `英语“${word.english.term}”的中文含义是？`,
              correct: word.meaningZh,
              distractors: optionCandidates(word, vocabulary, (item) => item.meaningZh),
            },
          ];

  return definitions.map((definition, index) => {
    const choice = buildOptions(
      definition.correct,
      definition.distractors,
      seed + index,
    );
    return {
      id: `word-${word.id}-${mode}-v${index}`,
      source: "word",
      sourceId: word.id,
      prompt: definition.prompt,
      options: choice.options,
      correctIndex: choice.correctIndex,
      explanation: `${word.japanese.term}（${word.japanese.reading ?? ""}）与 ${word.english.term} 对应“${word.meaningZh}”。${word.note}`,
      language: mode,
      difficulty:
        mode === "english"
          ? word.english.difficulty
          : word.japanese.difficulty,
      category: "vocabulary",
    };
  });
}

export interface TestGenerationOptions {
  mode: TestMode;
  sourceFilter: TestSourceFilter;
  count: number;
  now: string;
  favorites?: readonly string[];
  mistakes?: readonly MistakeRecord[];
  difficulty?: string;
  prioritizeMistakes?: boolean;
  comparisons?: readonly GrammarComparison[];
}

function modeWasStudied(progress: WordProgress, mode: TestMode): boolean {
  if (mode === "mixed") return Object.keys(progress.modes).length > 0;
  return Boolean(progress.modes[mode] ?? progress.modes.combined);
}

function passesTimeSource(
  timestamp: string,
  filter: TestSourceFilter,
  now: string,
): boolean {
  if (filter === "all-learned") return true;
  const today = localDateKey(new Date(now));
  const studiedDate = localDateKey(new Date(timestamp));
  if (filter === "today") return studiedDate === today;
  if (filter === "recent-7") {
    return studiedDate >= shiftLocalDateKey(today, -6) && studiedDate <= today;
  }
  return true;
}

export function createTestQuestions(
  wordProgress: WordProgress[],
  grammarProgress: GrammarProgress[],
  vocabulary: WordPair[],
  grammar: GrammarPoint[],
  options: TestGenerationOptions,
): ChoiceQuestion[] {
  const nowTimestamp = safeTimestamp(options.now);
  const favoriteIds = new Set(options.favorites ?? []);
  const mistakeRefs = new Set(
    (options.mistakes ?? []).map(
      (mistake) => `${mistake.contentRef.source}:${mistake.contentRef.sourceId}`,
    ),
  );
  const wordProgressMap = new Map(wordProgress.map((item) => [item.wordId, item]));
  const grammarProgressMap = new Map(
    grammarProgress.map((item) => [item.grammarId, item]),
  );

  const learnedWords = vocabulary.filter((word) => {
    if (options.sourceFilter === "comparisons") return false;
    const progress = wordProgressMap.get(word.id);
    if (!progress || !modeWasStudied(progress, options.mode)) return false;
    if (options.difficulty) {
      const difficulty =
        options.mode === "english"
          ? word.english.difficulty
          : word.japanese.difficulty;
      if (difficulty !== options.difficulty) return false;
    }
    if (options.sourceFilter === "favorites") {
      return favoriteIds.has(`word:${word.id}`);
    }
    if (options.sourceFilter === "mistakes") {
      return mistakeRefs.has(`word:${word.id}`);
    }
    if (options.sourceFilter === "due") {
      const states =
        options.mode === "mixed"
          ? Object.values(progress.modes)
          : [progress.modes[options.mode] ?? progress.modes.combined];
      return states.some((state) => state && isReviewDue(state, nowTimestamp));
    }
    return passesTimeSource(progress.lastStudiedAt, options.sourceFilter, options.now);
  });

  const learnedGrammar = grammar.filter((point) => {
    if (options.sourceFilter === "comparisons") return false;
    if (options.mode !== "mixed" && point.language !== options.mode) return false;
    const progress = grammarProgressMap.get(point.id);
    if (!progress) return false;
    if (options.difficulty && point.level !== options.difficulty) return false;
    if (options.sourceFilter === "favorites") {
      return favoriteIds.has(`grammar:${point.id}`);
    }
    if (options.sourceFilter === "mistakes") {
      return mistakeRefs.has(`grammar:${point.id}`);
    }
    if (options.sourceFilter === "due") {
      return isReviewDue(progress.review, nowTimestamp);
    }
    return passesTimeSource(progress.lastStudiedAt, options.sourceFilter, options.now);
  });

  const sessionSeed = Math.abs(Math.floor(nowTimestamp / 1_000));
  const orderedWords = options.prioritizeMistakes
    ? [...learnedWords].sort(
        (left, right) =>
          Number(mistakeRefs.has(`word:${right.id}`)) -
            Number(mistakeRefs.has(`word:${left.id}`)) ||
          seededRank(left.id, sessionSeed) - seededRank(right.id, sessionSeed),
      )
    : [...learnedWords].sort(
        (left, right) =>
          seededRank(left.id, sessionSeed) - seededRank(right.id, sessionSeed),
      );
  const orderedGrammar = options.prioritizeMistakes
    ? [...learnedGrammar].sort(
        (left, right) =>
          Number(mistakeRefs.has(`grammar:${right.id}`)) -
            Number(mistakeRefs.has(`grammar:${left.id}`)) ||
          seededRank(left.id, sessionSeed) - seededRank(right.id, sessionSeed),
      )
    : [...learnedGrammar].sort(
        (left, right) =>
          seededRank(left.id, sessionSeed) - seededRank(right.id, sessionSeed),
      );
  // A test samples content before question variants. This guarantees that one
  // word or grammar point appears at most once per round, while the chosen
  // translation direction/exercise still rotates between rounds.
  const candidateLimit = Math.max(options.count * 2, options.count + 12);
  const wordCandidates = orderedWords.slice(0, candidateLimit).map((word, index) => {
    const variants = createWordQuestions(
      word,
      vocabulary,
      options.mode,
      sessionSeed + index * 11,
    );
    return variants[(sessionSeed + index) % variants.length];
  });
  const grammarCandidates = orderedGrammar.slice(0, candidateLimit).flatMap((point, index): ChoiceQuestion[] => {
    const question = point.exercises[(sessionSeed + index) % point.exercises.length];
    if (!question) return [];
    return [{
      ...question,
      language: point.language,
      difficulty: point.level,
      category: "grammar",
    }];
  });
  if (options.sourceFilter === "comparisons") {
    return [...(options.comparisons ?? [])]
      .filter((item) => !options.difficulty || item.level === options.difficulty)
      .sort(
        (left, right) =>
          seededRank(left.id, sessionSeed) - seededRank(right.id, sessionSeed),
      )
      .slice(0, Math.max(1, options.count))
      .map((item) => ({
        ...item.exercise,
        source: "comparison" as const,
        sourceId: item.id,
        language: "mixed" as const,
        difficulty: item.level,
        category: "comparison",
      }));
  }
  const result: ChoiceQuestion[] = [];
  let wordIndex = 0;
  let grammarIndex = 0;
  while (
    result.length < Math.max(1, options.count) &&
    (wordIndex < wordCandidates.length || grammarIndex < grammarCandidates.length)
  ) {
    const takeWord =
      (result.length % 3 !== 2 && wordIndex < wordCandidates.length) ||
      grammarIndex >= grammarCandidates.length;
    if (takeWord) {
      result.push(wordCandidates[wordIndex]);
      wordIndex += 1;
    } else {
      result.push(grammarCandidates[grammarIndex]);
      grammarIndex += 1;
    }
  }
  return result;
}

export function createMixedTest(
  wordProgress: WordProgress[],
  grammarProgress: GrammarProgress[],
  vocabulary: WordPair[],
  grammar: GrammarPoint[],
  count: number,
): ChoiceQuestion[] {
  return createTestQuestions(wordProgress, grammarProgress, vocabulary, grammar, {
    mode: "mixed",
    sourceFilter: "all-learned",
    count,
    now: new Date().toISOString(),
  });
}

export function needsWordReview(
  progress: WordProgress,
  nowTimestamp: number,
  mode: StudyMode = "combined",
): boolean {
  const state = progress.modes[mode];
  return Boolean(state && isReviewDue(state, nowTimestamp));
}

export function compareWordReviewPriority(
  left: WordProgress,
  right: WordProgress,
  mode: StudyMode = "combined",
  nowTimestamp = Date.now(),
): number {
  const leftState = left.modes[mode];
  const rightState = right.modes[mode];
  if (!leftState) return 1;
  if (!rightState) return -1;
  return (
    reviewUrgency(rightState, nowTimestamp) - reviewUrgency(leftState, nowTimestamp) ||
    leftState.nextReviewAt.localeCompare(rightState.nextReviewAt)
  );
}

export function dueWordCount(
  progress: WordProgress[],
  now: string,
  mode: StudyMode = "combined",
): number {
  const timestamp = safeTimestamp(now);
  return progress.filter((item) => needsWordReview(item, timestamp, mode)).length;
}

export function learningDateRangeStart(today: string, days: number): Date {
  return localDateFromKey(shiftLocalDateKey(today, 1 - days));
}
