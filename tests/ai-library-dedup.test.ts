import { describe, expect, it } from "vitest";
import {
  filterGrammarPayloadAgainstLibrary,
  filterWordPayloadAgainstLibrary,
} from "../lib/ai/client/library-dedup";
import type { AIGenerationPayload } from "../lib/ai/types/ai.types";
import { makeGrammar, makeWord } from "./fixtures";
import { appendAIArtifacts } from "../lib/ai/client/artifact-library";
import { EMPTY_SNAPSHOT } from "../lib/constants";

function payload(overrides: Partial<AIGenerationPayload>): AIGenerationPayload {
  return {
    generation: {
      id: "generation-new",
      requestId: "request-new",
      kind: "words",
      createdAt: "2026-07-21T00:00:00.000Z",
      completedAt: "2026-07-21T00:00:01.000Z",
      provider: "deepseek",
      model: "deepseek-v4-flash",
      promptName: "word-generation",
      promptVersion: "v1",
      status: "succeeded",
      saveMode: "temporary",
      validationStatus: "passed",
      requestedCount: 2,
      acceptedCount: 2,
      rejectedCount: 0,
      contentIds: ["new-1", "new-2"],
      previewLabels: ["new-1", "new-2"],
    },
    usage: {
      id: "usage-new",
      requestId: "request-new",
      operation: "words",
      model: "deepseek-v4-flash",
      promptName: "word-generation",
      promptVersion: "v1",
      startedAt: "2026-07-21T00:00:00.000Z",
      completedAt: "2026-07-21T00:00:01.000Z",
      durationMs: 1000,
      success: true,
      retryCount: 0,
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      cacheHitTokens: 0,
    },
    ...overrides,
  };
}

describe("AI full-library duplicate filtering", () => {
  it("appends later generations without removing earlier AI library content", () => {
    const first = { ...makeWord("ai-first", "第一批"), source: "ai-generated" as const };
    const second = { ...makeWord("ai-second", "第二批"), source: "ai-generated" as const };
    const afterFirst = appendAIArtifacts({ ...EMPTY_SNAPSHOT }, { words: [first] });
    const afterSecond = appendAIArtifacts(afterFirst, { words: [second] });
    expect(afterSecond.aiWords.map((item) => item.id)).toEqual(["ai-first", "ai-second"]);
  });

  it("drops a duplicate word while preserving the genuinely new word", () => {
    const existing = makeWord("existing", "相同");
    const duplicate = { ...makeWord("new-duplicate", "相同"), source: "ai-generated" as const };
    const fresh = { ...makeWord("new-fresh", "全新"), source: "ai-generated" as const };
    const result = filterWordPayloadAgainstLibrary(payload({ words: [duplicate, fresh] }), [existing]);
    expect(result.words?.map((item) => item.id)).toEqual(["new-fresh"]);
    expect(result.generation).toMatchObject({ status: "partial", acceptedCount: 1, rejectedCount: 1, contentIds: ["new-fresh"] });
    expect(result.rejectedReasons?.[0]).toContain("继续生成补足");
  });

  it("checks generated grammar against the complete accumulated grammar library", () => {
    const existing = makeGrammar("same");
    const duplicate = { ...makeGrammar("duplicate"), title: existing.title, source: "ai-generated" as const };
    const fresh = { ...makeGrammar("fresh"), source: "ai-generated" as const };
    const result = filterGrammarPayloadAgainstLibrary(payload({ grammar: [duplicate, fresh] }), [existing], []);
    expect(result.grammar?.map((item) => item.id)).toEqual(["fresh"]);
    expect(result.generation.acceptedCount).toBe(1);
    expect(result.generation.contentIds).toEqual(["fresh"]);
  });
});
