import type { AIGenerationPayload } from "@/lib/ai/types/ai.types";
import { normalizeContent } from "@/lib/ai/validation/content-validator";
import type { GrammarComparison, GrammarPoint, WordPair } from "@/lib/models";

export function filterWordPayloadAgainstLibrary(
  payload: AIGenerationPayload,
  library: readonly WordPair[],
): AIGenerationPayload {
  if (!payload.words) return payload;
  const japanese = new Set(library.map((item) => normalizeContent(item.japanese.term)));
  const readings = new Set(library.map((item) => normalizeContent(item.japanese.reading ?? "")));
  const english = new Set(library.map((item) => normalizeContent(item.english.term)));
  const meanings = new Set(library.map((item) => normalizeContent(item.meaningZh)));
  const words = payload.words.filter((item) => {
    const keys = {
      japanese: normalizeContent(item.japanese.term),
      reading: normalizeContent(item.japanese.reading ?? ""),
      english: normalizeContent(item.english.term),
      meaning: normalizeContent(item.meaningZh),
    };
    if (japanese.has(keys.japanese) || readings.has(keys.reading) || english.has(keys.english) || meanings.has(keys.meaning)) return false;
    japanese.add(keys.japanese);
    readings.add(keys.reading);
    english.add(keys.english);
    meanings.add(keys.meaning);
    return true;
  });
  const removed = payload.words.length - words.length;
  if (removed === 0) return payload;
  return {
    ...payload,
    words,
    generation: {
      ...payload.generation,
      status: "partial",
      acceptedCount: words.length,
      rejectedCount: payload.generation.rejectedCount + removed,
      contentIds: words.map((item) => item.id),
      previewLabels: words.map((item) => `${item.japanese.term} / ${item.english.term}`),
    },
    rejectedReasons: [
      ...(payload.rejectedReasons ?? []),
      `全量词库去重跳过 ${removed} 项，已继续生成补足。`,
    ],
  };
}

export function filterGrammarPayloadAgainstLibrary(
  payload: AIGenerationPayload,
  grammarLibrary: readonly GrammarPoint[],
  comparisonLibrary: readonly GrammarComparison[],
): AIGenerationPayload {
  const titles = new Set([
    ...grammarLibrary.map((item) => normalizeContent(item.title)),
    ...comparisonLibrary.map((item) => normalizeContent(item.semantic)),
  ]);
  const grammar = (payload.grammar ?? []).filter((item) => {
    const title = normalizeContent(item.title);
    if (titles.has(title)) return false;
    titles.add(title);
    return true;
  });
  const comparisons = (payload.comparisons ?? []).filter((item) => {
    const title = normalizeContent(item.semantic);
    if (titles.has(title)) return false;
    titles.add(title);
    return true;
  });
  const originalCount = (payload.grammar?.length ?? 0) + (payload.comparisons?.length ?? 0);
  const removed = originalCount - grammar.length - comparisons.length;
  if (removed === 0) return payload;
  const contentIds = [...grammar.map((item) => item.id), ...comparisons.map((item) => item.id)];
  const previewLabels = [...grammar.map((item) => item.title), ...comparisons.map((item) => item.semantic)];
  return {
    ...payload,
    grammar: payload.grammar ? grammar : undefined,
    comparisons: payload.comparisons ? comparisons : undefined,
    generation: {
      ...payload.generation,
      status: "partial",
      acceptedCount: contentIds.length,
      rejectedCount: payload.generation.rejectedCount + removed,
      contentIds,
      previewLabels,
    },
    rejectedReasons: [
      ...(payload.rejectedReasons ?? []),
      `全量语法库去重跳过 ${removed} 项，已继续生成补足。`,
    ],
  };
}
