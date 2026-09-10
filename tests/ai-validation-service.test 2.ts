import { describe, expect, it } from "vitest";
import { parseAIConfig } from "../lib/ai/config/ai-config";
import { MockAIProvider } from "../lib/ai/provider/mock-provider";
import { AIContentService } from "../lib/ai/services/ai-content-service";
import { validateQuiz, validateWords } from "../lib/ai/validation/content-validator";
import { providerResponse, validAIQuestion, validAIWord } from "./ai-fixtures";
import {
  aiQuizResponseSchema,
} from "../lib/ai/schemas/content-schemas";
import {
  grammarGenerationPrompt,
  comparisonGenerationPrompt,
  quizGenerationPrompt,
  wordGenerationPrompt,
} from "../lib/ai/prompts/templates";

const config = parseAIConfig({});
const wordInput = {
  count: 1 as const,
  japaneseLevel: "N2" as const,
  englishLevel: "四级" as const,
  frequency: "高频" as const,
  purpose: "综合" as const,
  quality: "fast" as const,
  qualityReview: false,
  existingWords: [],
};

describe("AI content validation", () => {
  it("normalizes an empty optional question context instead of rejecting valid AI output", () => {
    const parsed = aiQuizResponseSchema.parse({ items: [{ ...validAIQuestion, context: "" }] });
    expect(parsed.items[0].context).toBeUndefined();
  });

  it("publishes exact v2 JSON contracts for all saveable content prompts", () => {
    expect(wordGenerationPrompt.version).toBe("v2");
    expect(wordGenerationPrompt.system).toContain('"meaningZh"');
    expect(grammarGenerationPrompt.system).toContain('"sourceId":"draft-grammar"');
    expect(comparisonGenerationPrompt.system).toContain('"language":"mixed"');
    expect(quizGenerationPrompt.system).toContain("必须原样复制给定来源 ID");
  });

  it("accepts a well-formed bilingual word and rejects existing duplicates", () => {
    expect(validateWords([validAIWord], []).accepted).toHaveLength(1);
    const duplicate = validateWords([validAIWord], [{ japanese: "改善する", reading: "かいぜんする", english: "improve", meaningZh: "改善" }]);
    expect(duplicate.accepted).toHaveLength(0);
    expect(duplicate.rejected[0].issues.some((issue) => issue.field === "duplicate")).toBe(true);
  });

  it("rejects swapped language fields and invalid kana", () => {
    const invalid = { ...validAIWord, japanese: { ...validAIWord.japanese, term: "improve", reading: "kaizen" } };
    const result = validateWords([invalid], []);
    expect(result.rejected[0].issues.map((issue) => issue.field)).toEqual(expect.arrayContaining(["japanese.term", "japanese.reading"]));
  });

  it("rejects quiz questions that cite content outside the supplied source set", () => {
    const result = validateQuiz([validAIQuestion], new Map(), "english");
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0].issues[0].field).toBe("sourceId");
  });
});

describe("AIContentService", () => {
  it("maps validated wire content into saved-ready app content with trace metadata", async () => {
    const provider = new MockAIProvider(() => providerResponse({ items: [validAIWord] }));
    const payload = await new AIContentService(provider, config).generateWords(wordInput, "service-request");
    expect(payload.words).toHaveLength(1);
    expect(payload.words?.[0]).toMatchObject({ source: "ai-generated", meaningZh: "改善", aiMetadata: { provider: "deepseek", promptVersion: "v2" } });
    expect(payload.generation).toMatchObject({ status: "succeeded", requestedCount: 1, acceptedCount: 1, parameters: { japaneseLevel: "N2", quality: "fast" } });
    expect(payload.usage.totalTokens).toBe(300);
  });

  it("repairs malformed JSON once before accepting content", async () => {
    let calls = 0;
    const provider = new MockAIProvider((request) => {
      calls += 1;
      return calls === 1
        ? providerResponse("not-json")
        : providerResponse({ items: [validAIWord] }, { model: request.model });
    });
    const payload = await new AIContentService(provider, config).generateWords(wordInput, "repair-request");
    expect(calls).toBe(2);
    expect(payload.generation.validationStatus).toBe("repaired");
  });

  it("adds concrete validation failures when repair falls back to regeneration", async () => {
    const requests: string[] = [];
    let calls = 0;
    const provider = new MockAIProvider((request) => {
      requests.push(request.userPrompt);
      calls += 1;
      return calls < 3
        ? providerResponse("not-json")
        : providerResponse({ items: [validAIWord] }, { model: request.model });
    });
    const payload = await new AIContentService(provider, config).generateWords(wordInput, "regenerate-request");
    expect(payload.generation.validationStatus).toBe("repaired");
    expect(requests).toHaveLength(3);
    expect(requests[2]).toContain("上次输出未通过校验");
    expect(requests[2]).toContain("INVALID_JSON");
  });

  it("returns partial success when local validation rejects one item", async () => {
    const provider = new MockAIProvider(() => providerResponse({ items: [validAIWord, validAIWord] }));
    const payload = await new AIContentService(provider, config).generateWords({ ...wordInput, count: 5 }, "partial-request");
    expect(payload.words).toHaveLength(1);
    expect(payload.generation.status).toBe("partial");
  });

  it("fails closed when every generated item violates local validation", async () => {
    const invalid = { ...validAIWord, japanese: { ...validAIWord.japanese, reading: "not-kana" } };
    const provider = new MockAIProvider(() => providerResponse({ items: [invalid] }));
    await expect(new AIContentService(provider, config).generateWords(wordInput, "reject-request")).rejects.toMatchObject({ code: "CONTENT_VALIDATION_FAILED" });
  });
});
