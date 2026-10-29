import { BOOK_WORDS, WORD_BOOKS, BOOK_MEMBERSHIPS } from "./word-books";
import type { BookVocabWord } from "@/lib/book-vocab-types";
/** Compatibility for saved word-library links; all content now comes from the selected books. */
export const BOOK_VOCAB_SECTIONS = WORD_BOOKS.map((book) => ({ id: book.id, label: book.title, book: book.title }));
const firstBook = new Map<string, typeof WORD_BOOKS[number]>();
for (const book of WORD_BOOKS) for (const [id] of BOOK_MEMBERSHIPS[book.id] ?? []) if (!firstBook.has(id)) firstBook.set(id, book);
export const BOOK_VOCAB_WORDS: BookVocabWord[] = BOOK_WORDS.map((word) => {
 const section = firstBook.get(word.id);
 return { id: word.id, term: word.japanese.term, reading: word.japanese.reading ?? "", meaningZh: word.meaningZh, english: word.english.term, pos: word.japanese.partOfSpeech, source: section?.title ?? "词书", section: section?.id ?? "", exampleJp: word.japanese.example, exampleEn: word.english.example };
});
