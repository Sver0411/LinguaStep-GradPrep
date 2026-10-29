import type { BookVocabWord } from "./book-vocab-types";
import type { WordPair } from "./models";
const normalized = (value: string) => value.normalize("NFKC").trim();
export function findBookStudyWord(book: BookVocabWord, words: readonly WordPair[]) {
  return words.find((word) => normalized(word.japanese.term) === normalized(book.term) &&
    normalized(word.japanese.reading ?? "") === normalized(book.reading));
}
export function bookToStudyWord(book: BookVocabWord): WordPair {
  const level = /n[12345]/i.exec(book.section)?.[0].toUpperCase();
  return {
    id: `book-study-${book.id}`, meaningZh: book.meaningZh,
    japanese: { term: book.term, reading: book.reading, partOfSpeech: book.pos, difficulty: level ? `JLPT ${level}` : "基础", example: book.exampleJp ?? "", exampleZh: "", collocations: [] },
    english: { term: book.english, partOfSpeech: "", difficulty: "未分级", example: book.exampleEn ?? "", exampleZh: "", collocations: [] },
    note: "",
    highFrequency: true, source: "user-created", tags: ["book-import", book.id, ...(book.english ? [] : ["japanese-only"])],
  };
}
