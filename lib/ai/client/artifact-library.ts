import type {
  AIContentReport,
  AIExplanationRecord,
  AIGenerationRecord,
  AISavedCollection,
  AIUsageRecord,
  GrammarComparison,
  GrammarPoint,
  LearningSnapshot,
  WordPair,
} from "@/lib/models";

export interface AIArtifactBatch {
  words?: WordPair[];
  grammar?: GrammarPoint[];
  comparisons?: GrammarComparison[];
  generations?: AIGenerationRecord[];
  usage?: AIUsageRecord[];
  explanations?: AIExplanationRecord[];
  collections?: AISavedCollection[];
  reports?: AIContentReport[];
}

function appendById<T>(current: readonly T[], incoming: readonly T[], keyOf: (item: T) => string): T[] {
  const next = new Map(current.map((item) => [keyOf(item), item]));
  incoming.forEach((item) => next.set(keyOf(item), item));
  return [...next.values()];
}

/** Adds a generation batch without replacing content from earlier batches. */
export function appendAIArtifacts(
  current: LearningSnapshot,
  batch: AIArtifactBatch,
): LearningSnapshot {
  return {
    ...current,
    aiWords: appendById(current.aiWords, batch.words ?? [], (item) => item.id),
    aiGrammar: appendById(current.aiGrammar, batch.grammar ?? [], (item) => item.id),
    aiComparisons: appendById(current.aiComparisons, batch.comparisons ?? [], (item) => item.id),
    aiGenerations: appendById(current.aiGenerations, batch.generations ?? [], (item) => item.id),
    aiUsage: appendById(current.aiUsage, batch.usage ?? [], (item) => item.id),
    aiExplanations: appendById(current.aiExplanations, batch.explanations ?? [], (item) => item.id),
    aiCollections: appendById(current.aiCollections, batch.collections ?? [], (item) => item.id),
    aiContentReports: appendById(current.aiContentReports, batch.reports ?? [], (item) => item.id),
  };
}
