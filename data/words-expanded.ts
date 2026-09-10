import type { FrequencyLevel, WordPair } from "@/lib/models";
import {
  englishStudyLevelFromRank,
  japaneseStudyLevelFromRank,
} from "@/lib/word-levels";
import compactRows from "./words-expanded.generated.json";

type CompactWord = [
  japanese: string,
  reading: string,
  romanization: string,
  english: string,
  phonetic: string,
  meaningZh: string,
  japanesePartOfSpeech: string,
  englishPartOfSpeech: string,
  frequencyRank: number,
  exampleJp: string,
  exampleEn: string,
];

function frequency(rank: number): FrequencyLevel {
  if (rank <= 2_000) return "高频";
  if (rank <= 6_000) return "常用";
  if (rank <= 15_000) return "普通";
  return "低频";
}

export const EXPANDED_WORDS: WordPair[] = (compactRows as CompactWord[]).map(
  (row, index) => {
    const [
      japanese,
      reading,
      romanization,
      english,
      phonetic,
      meaningZh,
      japanesePartOfSpeech,
      englishPartOfSpeech,
      frequencyRank,
      exampleJp,
      exampleEn,
    ] = row;
    const rank = frequency(frequencyRank);
    // Real Japanese→English example pairs come from the JMdict example corpus
    // (Tanaka/Tatoeba). We only fall back to a wording hint when the corpus has
    // nothing for this word, so the card never shows a fabricated sentence as
    // if it were a real usage example.
    const japaneseExample = exampleJp || `「${japanese}」を使った例文は準備中です。`;
    const englishExample = exampleEn
      ? exampleEn
      : `No corpus example for “${english}” yet.`;
    return {
      id: `word-expanded-${String(index + 1).padStart(4, "0")}`,
      meaningZh,
      japanese: {
        term: japanese,
        reading,
        romanization,
        partOfSpeech: japanesePartOfSpeech,
        difficulty: japaneseStudyLevelFromRank(frequencyRank),
        example: japaneseExample,
        exampleZh: exampleEn || `“${japanese}”的例句待补充。`,
        collocations: [japanese, reading],
      },
      english: {
        term: english,
        phonetic,
        partOfSpeech: englishPartOfSpeech,
        difficulty: englishStudyLevelFromRank(frequencyRank),
        example: englishExample,
        exampleZh: exampleJp || `“${english}”的例句待补充。`,
        collocations: [english],
      },
      // No note for imported entries: the previous placeholder sentence
      // repeated the same wording for every word and only added noise.
      note: "",
      highFrequency: rank === "高频",
      frequency: rank,
      tags: ["扩展词库", "JMdict", "ECDICT"],
      source: "curated",
    };
  },
);
