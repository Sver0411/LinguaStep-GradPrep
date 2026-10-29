import source from "./word-books.generated.json";
import type { WordPair } from "@/lib/models";

export interface WordBook {
  id: string;
  title: string;
  series: string;
  level: string;
  cover: string;
  sourceUrl: string;
  sourceNotes: number;
  wordCount: number;
  orderNote: string;
}
export const WORD_BOOKS: readonly WordBook[] = source.books;
export const BOOK_MEMBERSHIPS = source.memberships as unknown as Record<string, [string, string][]>;
export const BOOK_WORDS: WordPair[] = source.words.map((word) => ({
  id: word.id, meaningZh: word.meaningZh,
  japanese: { term: word.term, reading: word.reading, partOfSpeech: word.pos,
    difficulty: word.level, example: word.exampleJp, exampleZh: word.exampleJpZh, collocations: [] },
  english: { term: word.english, partOfSpeech: word.englishPos, difficulty: "词书对应表达",
    example: word.exampleEn, exampleZh: word.exampleEnZh, collocations: [] },
  note: "",
  source: "curated", highFrequency: false, tags: ["textbook", word.sourceBook],
  ...(word.audio ? { audioUrl: `/api/word-audio/${word.audio}` } : {}),
}));
export const BOOK_WORD_BY_ID = new Map(BOOK_WORDS.map((word) => [word.id, word]));
