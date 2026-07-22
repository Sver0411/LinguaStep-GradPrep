import type { FrequencyLevel, WordPair } from "@/lib/models";
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

function japaneseLevel(rank: number): string {
  if (rank <= 2_000) return "高频基础";
  if (rank <= 8_000) return "常用进阶";
  return "扩展词汇";
}

function englishLevel(rank: number): string {
  if (rank <= 3_000) return "高中・CET-4";
  if (rank <= 10_000) return "CET-4・CET-6";
  return "CET-6・TOEIC 扩展";
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
        difficulty: japaneseLevel(frequencyRank),
        example: `「${japanese}」は「${meaningZh}」という意味で使われます。`,
        exampleZh: `“${japanese}”可用于表达“${meaningZh}”。`,
        collocations: [japanese, reading],
      },
      english: {
        term: english,
        phonetic,
        partOfSpeech: englishPartOfSpeech,
        difficulty: englishLevel(frequencyRank),
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
