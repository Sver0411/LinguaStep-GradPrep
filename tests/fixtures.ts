import { EMPTY_SNAPSHOT } from "../lib/constants";
import type {
  ChoiceQuestion,
  DailyPlan,
  DailyRecord,
  GrammarPoint,
  GrammarProgress,
  LearningSnapshot,
  MasteryRating,
  MistakeRecord,
  ReviewState,
  StudyMode,
  TestResult,
  WordPair,
  WordProgress,
} from "../lib/models";

export const NOW = "2026-07-20T04:00:00.000Z";

export function makeQuestion(
  id = "question-1",
  source: ChoiceQuestion["source"] = "word",
  sourceId = "word-1",
): ChoiceQuestion {
  return {
    id,
    source,
    sourceId,
    prompt: "请选择正确答案",
    options: ["错误 A", "错误 B", "正确", "错误 C"],
    correctIndex: 2,
    explanation: "测试解析",
    language: source === "word" ? "mixed" : "japanese",
    difficulty: "JLPT N3",
  };
}

export function makeReviewState(
  mastery: MasteryRating = "known",
  overrides: Partial<ReviewState> = {},
): ReviewState {
  return {
    status: mastery === "known" ? "review" : "learning",
    mastery,
    firstStudiedAt: NOW,
    lastStudiedAt: NOW,
    nextReviewAt: "2026-07-23T04:00:00.000Z",
    intervalDays: 3,
    reviewCount: 1,
    correctStreak: mastery === "known" ? 1 : 0,
    lapses: mastery === "unknown" ? 1 : 0,
    stability: 3,
    difficulty: 5,
    lastRating: mastery,
    isNew: false,
    suspended: false,
    algorithmVersion: 2,
    ...overrides,
  };
}

export function makeWordProgress(
  wordId = "word-1",
  mode: StudyMode = "combined",
  state: ReviewState = makeReviewState(),
): WordProgress {
  return {
    wordId,
    modes: { [mode]: state },
    nextReviewAt: state.nextReviewAt,
    lastStudiedAt: state.lastStudiedAt,
    learningStatus: state.status,
    createdAt: state.firstStudiedAt,
    updatedAt: state.lastStudiedAt,
  };
}

export function makeGrammarProgress(
  grammarId = "grammar-1",
): GrammarProgress {
  const review = makeReviewState();
  return {
    grammarId,
    status: review.status,
    studyCount: 1,
    correctCount: 4,
    attemptCount: 5,
    firstStudiedAt: NOW,
    lastStudiedAt: NOW,
    nextReviewAt: review.nextReviewAt,
    review,
  };
}

export function makeMistake(
  question = makeQuestion(),
): MistakeRecord {
  return {
    id: `mistake-${question.id}`,
    contentRef: { source: question.source, sourceId: question.sourceId },
    question,
    selectedIndex: 0,
    errorCount: 1,
    correctStreak: 0,
    active: true,
    state: "active",
    priority: 1,
    favorite: false,
    firstWrongAt: NOW,
    lastWrongAt: NOW,
    lastAnsweredAt: NOW,
    history: [{ answeredAt: NOW, selectedIndex: 0, correct: false }],
  };
}

export function makeTestResult(): TestResult {
  const question = makeQuestion();
  return {
    id: "test-1",
    mode: "mixed",
    sourceFilter: "all-learned",
    answers: [{ question, selectedIndex: 2, isCorrect: true }],
    correctCount: 1,
    startedAt: NOW,
    completedAt: "2026-07-20T04:01:00.000Z",
    durationSeconds: 60,
  };
}

export function makeDailyRecord(date = "2026-07-20"): DailyRecord {
  return {
    date,
    wordsStudied: 1,
    newWordsStudied: 1,
    reviewWordsStudied: 0,
    japaneseWordsStudied: 0,
    englishWordsStudied: 0,
    combinedWordsStudied: 1,
    grammarStudied: 1,
    japaneseGrammarStudied: 1,
    englishGrammarStudied: 0,
    questionsAnswered: 5,
    correctAnswers: 4,
  };
}

export function makeDailyPlan(date = "2026-07-20"): DailyPlan {
  return {
    date,
    generatedAt: NOW,
    newWordIds: ["word-1"],
    reviewWordIds: [],
    overdueWordIds: [],
    mistakeIds: [],
    grammarIds: ["grammar-1"],
    testTarget: 10,
    studyMode: "combined",
  };
}

export function makeSnapshot(): LearningSnapshot {
  const question = makeQuestion();
  return {
    ...structuredClone(EMPTY_SNAPSHOT),
    wordProgress: [makeWordProgress()],
    grammarProgress: [makeGrammarProgress()],
    mistakes: [makeMistake(question)],
    favorites: ["word:word-1", "grammar:grammar-1"],
    testResults: [makeTestResult()],
    dailyRecords: [makeDailyRecord()],
    dailyPlans: [makeDailyPlan()],
  };
}

export function makeWord(id: string, suffix: string): WordPair {
  return {
    id,
    meaningZh: `含义${suffix}`,
    japanese: {
      term: `日本語${suffix}`,
      reading: `にほんご${suffix}`,
      romanization: `nihongo-${suffix}`,
      partOfSpeech: "名词",
      difficulty: "JLPT N3",
      example: `日本語例文${suffix}`,
      exampleZh: `日语例句${suffix}`,
      collocations: [`日本語${suffix}の例`],
    },
    english: {
      term: `English ${suffix}`,
      phonetic: `/english-${suffix}/`,
      partOfSpeech: "noun",
      difficulty: "CET-4",
      example: `English example ${suffix}`,
      exampleZh: `英语例句${suffix}`,
      collocations: [`English ${suffix} example`],
    },
    note: `备注${suffix}`,
    highFrequency: true,
    frequency: "高频",
    source: "curated",
  };
}

export function makeGrammar(
  id: string,
  exercise = makeQuestion(`${id}-q1`, "grammar", id),
): GrammarPoint {
  return {
    id,
    title: `语法 ${id}`,
    language: "japanese",
    level: "JLPT N3",
    explanation: "这是一个用于测试的完整语法说明，长度足以模拟真实语法内容。",
    structure: "A + B",
    connection: "接续说明",
    scenarios: ["日常"],
    nuance: "语气说明",
    examples: [
      { text: "例文一", translationZh: "例句一" },
      { text: "例文二", translationZh: "例句二" },
    ],
    comparison: {
      japanese: "日本語の例文",
      english: "An English example",
      translationZh: "对照例句",
    },
    commonErrors: ["常见错误"],
    confusables: ["易混表达"],
    exercises: [exercise],
    source: "curated",
  };
}
