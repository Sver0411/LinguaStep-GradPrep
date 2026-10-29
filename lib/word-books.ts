import { BOOK_MEMBERSHIPS, WORD_BOOKS } from "@/data/word-books";
import { getWordModeState, needsWordReview, compareWordReviewPriority } from "./learning";
import type { StudyMode, WordPair, WordProgress } from "./models";
import { shuffled } from "./shuffle";

export type WordStudyOrder = "sequential" | "random";
export const DEFAULT_WORD_BOOK = "red-n3";
export const getWordBook = (id?: string) => WORD_BOOKS.find((book) => book.id === id);
export const validWordBook = (id?: string) => getWordBook(id)?.id ?? DEFAULT_WORD_BOOK;
export function wordsInBook(bookId: string, words: readonly WordPair[]): WordPair[] {
  const byId = new Map(words.map((word) => [word.id, word]));
  return (BOOK_MEMBERSHIPS[bookId] ?? []).flatMap(([id]) => {
    const word = byId.get(id); return word ? [word] : [];
  });
}
export function chooseBookWords({ words, progress, mode, order, source = "all", selectedIds, limit = 10, now = Date.now(), random = Math.random }: {
  words: readonly WordPair[]; progress: readonly WordProgress[]; mode: StudyMode;
  order: WordStudyOrder; source?: "all" | "new" | "review" | "selected";
  selectedIds?: ReadonlySet<string>; limit?: number; now?: number; random?: () => number;
}): WordPair[] {
  const states = new Map(progress.map((item) => [item.wordId, item]));
  let candidates = words.filter((word) => mode === "japanese" || Boolean(word.english.term.trim()));
  if (source === "selected") candidates = candidates.filter((word) => selectedIds?.has(word.id));
  else if (source === "review") {
    return candidates.filter((word) => {
      const state = states.get(word.id); return state && needsWordReview(state, now, mode);
    }).sort((a, b) => compareWordReviewPriority(states.get(a.id)!, states.get(b.id)!, mode, now)).slice(0, limit);
  } else {
    const fresh = candidates.filter((word) => !getWordModeState(states.get(word.id), mode));
    if (fresh.length || source === "new") candidates = fresh;
    else candidates = candidates.filter((word) => getWordModeState(states.get(word.id), mode)?.status !== "mastered");
  }
  const ordered = order === "random" ? shuffled(candidates, random) : [...candidates];
  return source === "selected" ? ordered : ordered.slice(0, limit);
}
