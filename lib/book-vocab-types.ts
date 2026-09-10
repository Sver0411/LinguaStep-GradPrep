/**
 * Japanese-only lookup entries for the word-library book sections (红宝书 /
 * 绿宝书 scans, open JLPT lists and open dictionary data). These live in their
 * own sections of the word library for browsing, speech and favourites, and
 * deliberately stay out of the bilingual SRS study flow (no English
 * counterpart to study).
 */
export interface BookVocabWord {
  id: string;
  term: string;
  reading: string;
  meaningZh: string;
  /** English counterpart, resolved from JMdict so the pair really matches. */
  english: string;
  pos: string;
  /** Human-readable provenance, shown on the card. */
  source: string;
  /** Section id from BOOK_VOCAB_SECTIONS in data/book-vocab-data.ts */
  section: string;
  /** Example sentence from the JMdict example corpus (Japanese). */
  exampleJp?: string;
  /** English translation of that sentence. */
  exampleEn?: string;
}

export interface BookVocabSection {
  id: string;
  label: string;
  book: string;
}
