import type { ChoiceQuestion, ReviewState, StudyMode, WordPair, WordQuizDirection } from "./models";
import { shuffled } from "./shuffle";

export interface WordQuizQuestion extends ChoiceQuestion { wordQuiz: { mode: StudyMode; direction: WordQuizDirection } }
export function quizDirection(mode: StudyMode, state: ReviewState | undefined, first: "japanese" | "english"): WordQuizDirection {
  if (mode !== "combined") return mode === "japanese" ? "ja-zh" : "en-zh";
  if (state?.quizMemory && state.lastRating === "unknown") return state.quizMemory.lastDirection;
  return state?.quizMemory?.lastDirection === "ja-en" ? "en-ja" : state?.quizMemory?.lastDirection === "en-ja" ? "ja-en" : first === "japanese" ? "ja-en" : "en-ja";
}
const normalized = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
function variants(value: string): string[] { return value.split(/[;；,，、/／（）()]/).map(normalized).filter(Boolean); }
const overlap = (left: string, right: string) => variants(left).some((value) => variants(right).includes(value));
export function quizExpressions(word: WordPair, direction: WordQuizDirection): { prompt: string; answer: string } {
  return { prompt: direction.startsWith("ja") ? word.japanese.term : word.english.term,
    answer: direction === "ja-en" ? word.english.term : direction === "en-ja" ? word.japanese.term : word.meaningZh };
}
export function buildWordQuiz(word: WordPair, pool: readonly WordPair[], mode: StudyMode, direction: WordQuizDirection, random = Math.random): WordQuizQuestion | null {
  const { prompt, answer } = quizExpressions(word, direction);
  if (!prompt.trim() || !answer.trim()) return null;
  const source = direction.startsWith("ja") ? "japanese" : "english";
  const candidates: WordPair[] = [];
  for (const candidate of shuffled(pool, random)) {
    const other = quizExpressions(candidate, direction);
    const usable = candidate.id !== word.id && other.prompt.trim() && other.answer.trim()
      && !overlap(prompt, other.prompt) && !overlap(answer, other.answer) && !overlap(word.meaningZh, candidate.meaningZh);
    if (usable) candidates.push(candidate);
    if (candidates.length >= 32) break;
  }
  candidates.sort((a, b) => Number(b[source].partOfSpeech === word[source].partOfSpeech) - Number(a[source].partOfSpeech === word[source].partOfSpeech));
  const choices = [answer];
  for (const candidate of candidates) {
    const value = quizExpressions(candidate, direction).answer;
    if (choices.some((choice) => overlap(choice, value))) continue;
    choices.push(value);
    if (choices.length === 4) break;
  }
  // Do not manufacture distractors when imported content lacks sufficient translations.
  if (choices.length !== 4) return null;
  const options = shuffled(choices, random) as [string, string, string, string];
  return {
    id: `word-quiz:${mode}:${direction}:${word.id}`, source: "word", sourceId: word.id,
    prompt, options, correctIndex: options.indexOf(answer),
    explanation: `${word.japanese.term} / ${word.english.term}\n${word.meaningZh}`,
    language: mode === "combined" ? "mixed" : mode, category: "word-recognition",
    wordQuiz: { mode, direction },
  };
}

export interface WordCycle { active: WordPair[]; fresh: WordPair[]; reserve: WordPair[] }
/** Carried failures occupy slots first; only genuinely new additions get reveal cards. */
export function fillWordCycle(carried: readonly WordPair[], reserve: readonly WordPair[], seenIds: ReadonlySet<string>, size = 5): WordCycle {
  const active = [...carried];
  const remaining = [...reserve];
  const additions: WordPair[] = [];
  while (active.length < size && remaining.length) {
    const word = remaining.shift()!;
    if (active.some((item) => item.id === word.id)) continue;
    active.push(word); additions.push(word);
  }
  return { active, fresh: additions.filter((word) => !seenIds.has(word.id)), reserve: remaining };
}
