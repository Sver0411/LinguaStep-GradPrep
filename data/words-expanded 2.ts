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
    ] = row;
    const rank = frequency(frequencyRank);
    return {
      id: `word-expanded-${String(index + 1).padStart(4, "0")}`,
      meaningZh,
      japanese: {
        term: japanese,
        reading,
        romanization,
        partOfSpeech: japanesePartOfSpeech,
        difficulty: japaneseStudyLevelFromRank(frequencyRank),
        example: `「${japanese}」は「${meaningZh}」という意味で使われます。`,
        exampleZh: `“${japanese}”可用于表达“${meaningZh}”。`,
        collocations: [japanese, reading],
      },
      english: {
        term: english,
        phonetic,
        partOfSpeech: englishPartOfSpeech,
        difficulty: englishStudyLevelFromRank(frequencyRank),
        example: `“${english}” can express the meaning “${meaningZh}”.`,
        exampleZh: `“${english}”可用于表达“${meaningZh}”。`,
        collocations: [english],
      },
      note: `日语「${japanese}」与英语 ${english} 在“${meaningZh}”这一义项上对应；具体搭配和语域可能不同。`,
      highFrequency: rank === "高频",
      frequency: rank,
      tags: ["扩展词库", "JMdict", "ECDICT"],
      source: "curated",
    };
  },
);
