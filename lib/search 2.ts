import { getWordModeState } from "./learning";
import { isReviewDue } from "./spaced-repetition";
import type {
  FrequencyLevel,
  GrammarPoint,
  GrammarProgress,
  LearningStatus,
  MistakeRecord,
  StudyMode,
  WordPair,
  WordProgress,
} from "./models";

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("ja-JP");
}

function includesQuery(values: Array<string | undefined>, query: string): boolean {
  if (!query) return true;
  return values.some((value) => normalize(value ?? "").includes(query));
}

export interface WordSearchFilters {
  query: string;
  japaneseLevel: string;
  englishLevel: string;
  frequency: FrequencyLevel | "all";
  status: LearningStatus | "unlearned" | "all";
  favorite: boolean;
  mistake: boolean;
  due: boolean;
  mode: StudyMode;
}

export interface WordSearchContext {
  progress: readonly WordProgress[];
  favorites: readonly string[];
  mistakes: readonly MistakeRecord[];
  nowTimestamp: number;
}

export function searchWords(
  words: readonly WordPair[],
  filters: WordSearchFilters,
  context: WordSearchContext,
): WordPair[] {
  const query = normalize(filters.query);
  const progressMap = new Map(context.progress.map((item) => [item.wordId, item]));
  const favorites = new Set(context.favorites);
  const mistakeIds = new Set(
    context.mistakes
      .filter((item) => item.active && item.contentRef.source === "word")
      .map((item) => item.contentRef.sourceId),
  );
  return words.filter((word) => {
    const progress = progressMap.get(word.id);
    const modeState = getWordModeState(progress, filters.mode);
    if (
      !includesQuery(
        [
          word.meaningZh,
          word.japanese.term,
          word.japanese.reading,
          word.japanese.romanization,
          word.english.term,
          word.japanese.example,
          word.english.example,
          ...word.japanese.collocations,
          ...word.english.collocations,
        ],
        query,
      )
    ) return false;
    if (
      filters.japaneseLevel !== "all" &&
      word.japanese.difficulty !== filters.japaneseLevel
    ) return false;
    if (
      filters.englishLevel !== "all" &&
      word.english.difficulty !== filters.englishLevel
    ) return false;
    if (
      filters.frequency !== "all" &&
      (word.frequency ?? (word.highFrequency ? "高频" : "常用")) !==
        filters.frequency
    ) return false;
    if (filters.status === "unlearned" && modeState) return false;
    if (
      filters.status !== "all" &&
      filters.status !== "unlearned" &&
      modeState?.status !== filters.status
    ) return false;
    if (filters.favorite && !favorites.has(`word:${word.id}`)) return false;
    if (filters.mistake && !mistakeIds.has(word.id)) return false;
    if (
      filters.due &&
      (!modeState || !isReviewDue(modeState, context.nowTimestamp))
    ) return false;
    return true;
  });
}

export interface GrammarSearchFilters {
  query: string;
  language: "japanese" | "english" | "all";
  level: string;
  status: LearningStatus | "unlearned" | "all";
  favorite: boolean;
  mistake: boolean;
  due: boolean;
}

export function searchGrammar(
  grammar: readonly GrammarPoint[],
  filters: GrammarSearchFilters,
  context: {
    progress: readonly GrammarProgress[];
    favorites: readonly string[];
    mistakes: readonly MistakeRecord[];
    nowTimestamp: number;
  },
): GrammarPoint[] {
  const query = normalize(filters.query);
  const progressMap = new Map(
    context.progress.map((item) => [item.grammarId, item]),
  );
  const favorites = new Set(context.favorites);
  const mistakeIds = new Set(
    context.mistakes
      .filter((item) => item.active && item.contentRef.source === "grammar")
      .map((item) => item.contentRef.sourceId),
  );
  return grammar.filter((point) => {
    const progress = progressMap.get(point.id);
    if (
      !includesQuery(
        [
          point.title,
          point.explanation,
          point.structure,
          point.connection,
          ...point.examples.flatMap((example) => [example.text, example.translationZh]),
        ],
        query,
      )
    ) return false;
    if (filters.language !== "all" && point.language !== filters.language) return false;
    if (filters.level !== "all" && point.level !== filters.level) return false;
    if (filters.status === "unlearned" && progress) return false;
    if (
      filters.status !== "all" &&
      filters.status !== "unlearned" &&
      progress?.status !== filters.status
    ) return false;
    if (filters.favorite && !favorites.has(`grammar:${point.id}`)) return false;
    if (filters.mistake && !mistakeIds.has(point.id)) return false;
    if (
      filters.due &&
      (!progress || !isReviewDue(progress.review, context.nowTimestamp))
    ) return false;
    return true;
  });
}
