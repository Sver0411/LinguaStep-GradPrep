import type { ZodType } from "zod";
import type { RuntimeAIConfig } from "@/lib/ai/config/ai-config";
import { AIError } from "@/lib/ai/errors/ai-error";
import {
  aiComparisonResponseSchema,
  aiExplanationResponseSchema,
  aiGrammarResponseSchema,
  aiQuizResponseSchema,
  aiWordResponseSchema,
  qualityReviewResponseSchema,
  type AIComparisonWireItem,
  type AIGrammarWireItem,
  type AIQuizWireItem,
  type AIWordWireItem,
} from "@/lib/ai/schemas/content-schemas";
import {
  comparisonGenerationPrompt,
  COMPARISON_JSON_CONTRACT,
  contentRepairPrompt,
  grammarGenerationPrompt,
  GRAMMAR_JSON_CONTRACT,
  mistakeExplanationPrompt,
  qualityReviewPrompt,
  quizGenerationPrompt,
  QUIZ_JSON_CONTRACT,
  wordGenerationPrompt,
  WORD_JSON_CONTRACT,
  type PromptTemplate,
} from "@/lib/ai/prompts/templates";
import type {
  AIGenerationPayload,
  AIProvider,
  AIProviderResponse,
  AIRequestUsage,
  ExplanationGenerationInput,
  GrammarGenerationInput,
  QuizGenerationInput,
  WordGenerationInput,
} from "@/lib/ai/types/ai.types";
import {
  contentHash,
  flattenValidationIssues,
  validateComparisons,
  validateGrammar,
  validateQuiz,
  validateWords,
} from "@/lib/ai/validation/content-validator";
import type {
  AIContentMetadata,
  AIGenerationKind,
  AIGenerationRecord,
  AIUsageRecord,
  ChoiceQuestion,
  GrammarComparison,
  GrammarPoint,
  WordPair,
} from "@/lib/models";

interface AggregateUsage extends AIRequestUsage {
  retryCount: number;
  durationMs: number;
  model: string;
}

interface ParsedResult<T> {
  value: T;
  usage: AggregateUsage;
  repaired: boolean;
  model: string;
}

function emptyUsage(model: string): AggregateUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cacheHitTokens: 0,
    retryCount: 0,
    durationMs: 0,
    model,
  };
}

function addUsage(total: AggregateUsage, response: AIProviderResponse): AggregateUsage {
  return {
    inputTokens: total.inputTokens + response.usage.inputTokens,
    outputTokens: total.outputTokens + response.usage.outputTokens,
    totalTokens: total.totalTokens + response.usage.totalTokens,
    cacheHitTokens: total.cacheHitTokens + response.usage.cacheHitTokens,
    retryCount: total.retryCount + response.retryCount,
    durationMs: total.durationMs + response.durationMs,
    model: response.model,
  };
}

function parseJSON<T>(content: string, schema: ZodType<T>): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new AIError("INVALID_JSON", { cause: error });
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AIError("SCHEMA_VALIDATION_FAILED", {
      cause: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    });
  }
  return result.data;
}

function issuesFrom(error: unknown): string[] {
  if (error instanceof AIError && Array.isArray(error.technicalCause)) {
    return error.technicalCause.filter((item): item is string => typeof item === "string");
  }
  if (error instanceof AIError) return [`${error.code}: ${error.message}`];
  return [error instanceof Error ? error.message : "JSON 或 Schema 校验失败"];
}

function randomId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function metadata(
  generationId: string,
  model: string,
  prompt: PromptTemplate<unknown>,
  generatedAt: string,
  validationStatus: "passed" | "repaired",
  value: unknown,
): AIContentMetadata {
  return {
    source: "ai",
    provider: "deepseek",
    model,
    promptName: prompt.name,
    promptVersion: prompt.version,
    generationId,
    generatedAt,
    validationStatus,
    contentHash: contentHash(value),
  };
}

export class AIContentService {
  constructor(
    private readonly provider: AIProvider,
    private readonly config: RuntimeAIConfig,
  ) {}

  private async generateAndParse<TInput, TOutput>(options: {
    input: TInput;
    prompt: PromptTemplate<TInput>;
    schema: ZodType<TOutput>;
    schemaDescription: string;
    model: string;
    requestId: string;
    signal?: AbortSignal;
    qualityReview?: boolean;
    reviewKind: string;
    thinking?: boolean;
  }): Promise<ParsedResult<TOutput>> {
    let usage = emptyUsage(options.model);
    const call = async (
      prompt: PromptTemplate<unknown>,
      input: unknown,
      model: string,
      suffix: string,
      thinking = false,
      extraInstruction = "",
    ) => {
      const response = await this.provider.generateJSON({
        requestId: `${options.requestId}${suffix}`,
        model,
        systemPrompt: prompt.system,
        userPrompt: `${prompt.buildUser(input)}${extraInstruction}`,
        maxTokens: prompt.maxTokens,
        thinking,
        signal: options.signal,
      });
      usage = addUsage(usage, response);
      return response.content;
    };

    const originalContent = await call(
      options.prompt as PromptTemplate<unknown>,
      options.input,
      options.model,
      "",
      options.thinking,
    );
    let parsed: TOutput;
    let repaired = false;
    try {
      parsed = parseJSON(originalContent, options.schema);
    } catch (initialError) {
      try {
        const repairedContent = await call(
          contentRepairPrompt as PromptTemplate<unknown>,
          {
            original: originalContent,
            issues: issuesFrom(initialError),
            schemaDescription: options.schemaDescription,
          },
          this.config.qualityModel,
          "-repair",
        );
        parsed = parseJSON(repairedContent, options.schema);
        repaired = true;
      } catch {
        const regenerated = await call(
          options.prompt as PromptTemplate<unknown>,
          options.input,
          this.config.qualityModel,
          "-regenerate",
          options.thinking,
          `\n上次输出未通过校验。必须修正这些问题：${JSON.stringify(issuesFrom(initialError).slice(0, 12))}。请重新生成全新 JSON，严格遵守字段名、英文枚举值和目标合约。`,
        );
        parsed = parseJSON(regenerated, options.schema);
        repaired = true;
      }
    }

    if (options.qualityReview) {
      const reviewContent = await call(
        qualityReviewPrompt as PromptTemplate<unknown>,
        { content: parsed, kind: options.reviewKind },
        this.config.qualityModel,
        "-review",
        true,
      );
      const review = parseJSON(reviewContent, qualityReviewResponseSchema);
      if (review.status === "reject") {
        throw new AIError("CONTENT_VALIDATION_FAILED", { cause: review.issues });
      }
      if (review.status === "needsRepair") {
        const repairedContent = await call(
          contentRepairPrompt as PromptTemplate<unknown>,
          {
            original: JSON.stringify(parsed),
            issues: [...review.issues, ...review.repairSuggestions],
            schemaDescription: options.schemaDescription,
          },
          this.config.qualityModel,
          "-review-repair",
        );
        parsed = parseJSON(repairedContent, options.schema);
        repaired = true;
      }
    }

    return { value: parsed, usage, repaired, model: usage.model || options.model };
  }

  private records(options: {
    requestId: string;
    generationId: string;
    kind: AIGenerationKind;
    prompt: PromptTemplate<unknown>;
    model: string;
    startedAt: string;
    usage: AggregateUsage;
    requestedCount: number;
    contentIds: string[];
    previewLabels: string[];
    rejectedReasons: string[];
    repaired: boolean;
    parameters?: AIGenerationRecord["parameters"];
  }): { generation: AIGenerationRecord; usage: AIUsageRecord } {
    const completedAt = new Date().toISOString();
    const usageId = randomId("ai-usage");
    const acceptedCount = options.contentIds.length;
    const rejectedCount = Math.max(
      options.rejectedReasons.length,
      options.requestedCount - acceptedCount,
    );
    return {
      generation: {
        id: options.generationId,
        requestId: options.requestId,
        kind: options.kind,
        createdAt: options.startedAt,
        completedAt,
        provider: "deepseek",
        model: options.model,
        promptName: options.prompt.name,
        promptVersion: options.prompt.version,
        status: rejectedCount > 0 ? "partial" : "succeeded",
        saveMode: "temporary",
        validationStatus: options.repaired ? "repaired" : "passed",
        requestedCount: options.requestedCount,
        acceptedCount,
        rejectedCount,
        contentIds: options.contentIds,
        previewLabels: options.previewLabels,
        parameters: options.parameters,
        usageId,
      },
      usage: {
        id: usageId,
        requestId: options.requestId,
        operation: options.kind,
        model: options.model,
        promptName: options.prompt.name,
        promptVersion: options.prompt.version,
        startedAt: options.startedAt,
        completedAt,
        durationMs: options.usage.durationMs,
        success: true,
        retryCount: options.usage.retryCount,
        inputTokens: options.usage.inputTokens,
        outputTokens: options.usage.outputTokens,
        totalTokens: options.usage.totalTokens,
        cacheHitTokens: options.usage.cacheHitTokens,
      },
    };
  }

  async generateWords(input: WordGenerationInput, requestId: string, signal?: AbortSignal): Promise<AIGenerationPayload> {
    const startedAt = new Date().toISOString();
    const generationId = randomId("ai-generation");
    const model = input.quality === "quality" ? this.config.qualityModel : this.config.fastModel;
    const result = await this.generateAndParse({
      input,
      prompt: wordGenerationPrompt,
      schema: aiWordResponseSchema,
      schemaDescription: WORD_JSON_CONTRACT,
      model,
      requestId,
      signal,
      qualityReview: input.qualityReview,
      reviewKind: "word",
      thinking: input.quality === "quality",
    });
    const validation = validateWords(result.value.items, input.existingWords);
    if (validation.accepted.length === 0) {
      throw new AIError("CONTENT_VALIDATION_FAILED", {
        cause: flattenValidationIssues(validation.rejected),
      });
    }
    const generatedAt = new Date().toISOString();
    const words = validation.accepted.map((item: AIWordWireItem): WordPair => {
      const id = randomId("ai-word");
      return {
        id,
        meaningZh: item.meaningZh,
        japanese: item.japanese,
        english: item.english,
        note: item.note,
        highFrequency: item.frequency === "高频",
        frequency: item.frequency,
        tags: item.tags,
        source: "ai-generated",
        aiMetadata: metadata(
          generationId,
          result.model,
          wordGenerationPrompt as PromptTemplate<unknown>,
          generatedAt,
          result.repaired ? "repaired" : "passed",
          item,
        ),
      };
    });
    const rejectedReasons = flattenValidationIssues(validation.rejected);
    const records = this.records({
      requestId,
      generationId,
      kind: "words",
      prompt: wordGenerationPrompt as PromptTemplate<unknown>,
      model: result.model,
      startedAt,
      usage: result.usage,
      requestedCount: input.count,
      contentIds: words.map((item) => item.id),
      previewLabels: words.map((item) => `${item.japanese.term} / ${item.english.term}`),
      rejectedReasons,
      repaired: result.repaired,
      parameters: {
        count: input.count,
        japaneseLevel: input.japaneseLevel,
        englishLevel: input.englishLevel,
        frequency: input.frequency,
        purpose: input.purpose,
        quality: input.quality,
        qualityReview: input.qualityReview,
      },
    });
    return { ...records, words, rejectedReasons };
  }

  async generateGrammar(input: GrammarGenerationInput, requestId: string, signal?: AbortSignal): Promise<AIGenerationPayload> {
    const startedAt = new Date().toISOString();
    const generationId = randomId("ai-generation");
    const qualityRequired = input.quality === "quality" || input.language === "comparison" || input.level.includes("N1");
    const model = qualityRequired ? this.config.qualityModel : this.config.fastModel;
    if (input.language === "comparison") {
      const result = await this.generateAndParse({
        input,
        prompt: comparisonGenerationPrompt,
        schema: aiComparisonResponseSchema,
        schemaDescription: COMPARISON_JSON_CONTRACT,
        model,
        requestId,
        signal,
        qualityReview: input.qualityReview || qualityRequired,
        reviewKind: "comparison",
        thinking: true,
      });
      const validation = validateComparisons(result.value.items, input.existingTitles);
      if (validation.accepted.length === 0) {
        throw new AIError("CONTENT_VALIDATION_FAILED", { cause: flattenValidationIssues(validation.rejected) });
      }
      const generatedAt = new Date().toISOString();
      const comparisons = validation.accepted.map((item: AIComparisonWireItem): GrammarComparison => {
        const id = randomId("ai-comparison");
        const exercise: ChoiceQuestion = {
          ...item.exercise,
          id: randomId("ai-question"),
          source: "comparison",
          sourceId: id,
        };
        return {
          id,
          semantic: item.semantic,
          japanese: item.japanese,
          english: item.english,
          samePoints: item.samePoints,
          difference: item.difference,
          nonInterchangeable: item.nonInterchangeable,
          japaneseExample: item.japaneseExample,
          englishExample: item.englishExample,
          translationZh: item.translationZh,
          pitfalls: item.pitfalls,
          exercise,
          level: item.level,
          source: "ai-generated",
          aiMetadata: metadata(generationId, result.model, comparisonGenerationPrompt as PromptTemplate<unknown>, generatedAt, result.repaired ? "repaired" : "passed", item),
        };
      });
      const rejectedReasons = flattenValidationIssues(validation.rejected);
      const records = this.records({
        requestId, generationId, kind: "grammar", prompt: comparisonGenerationPrompt as PromptTemplate<unknown>, model: result.model,
        startedAt, usage: result.usage, requestedCount: input.count,
        contentIds: comparisons.map((item) => item.id), previewLabels: comparisons.map((item) => item.semantic), rejectedReasons, repaired: result.repaired,
        parameters: { count: input.count, language: input.language, level: input.level, topic: input.topic, quality: input.quality, qualityReview: input.qualityReview },
      });
      return { ...records, comparisons, rejectedReasons };
    }

    const result = await this.generateAndParse({
      input,
      prompt: grammarGenerationPrompt,
      schema: aiGrammarResponseSchema,
      schemaDescription: GRAMMAR_JSON_CONTRACT,
      model,
      requestId,
      signal,
      qualityReview: input.qualityReview || qualityRequired,
      reviewKind: "grammar",
      thinking: qualityRequired,
    });
    const validation = validateGrammar(
      result.value.items,
      input.existingTitles,
      input.language,
      input.level,
    );
    if (validation.accepted.length === 0) {
      throw new AIError("CONTENT_VALIDATION_FAILED", { cause: flattenValidationIssues(validation.rejected) });
    }
    const generatedAt = new Date().toISOString();
    const grammar = validation.accepted.map((item: AIGrammarWireItem): GrammarPoint => {
      const id = randomId("ai-grammar");
      return {
        ...item,
        id,
        exercises: item.exercises.map((question) => ({
          ...question,
          id: randomId("ai-question"),
          source: "grammar",
          sourceId: id,
        })),
        source: "ai-generated",
        aiMetadata: metadata(generationId, result.model, grammarGenerationPrompt as PromptTemplate<unknown>, generatedAt, result.repaired ? "repaired" : "passed", item),
      };
    });
    const rejectedReasons = flattenValidationIssues(validation.rejected);
    const records = this.records({
      requestId, generationId, kind: "grammar", prompt: grammarGenerationPrompt as PromptTemplate<unknown>, model: result.model,
      startedAt, usage: result.usage, requestedCount: input.count,
      contentIds: grammar.map((item) => item.id), previewLabels: grammar.map((item) => item.title), rejectedReasons, repaired: result.repaired,
      parameters: { count: input.count, language: input.language, level: input.level, topic: input.topic, quality: input.quality, qualityReview: input.qualityReview },
    });
    return { ...records, grammar, rejectedReasons };
  }

  async generateQuiz(input: QuizGenerationInput, requestId: string, signal?: AbortSignal): Promise<AIGenerationPayload> {
    const startedAt = new Date().toISOString();
    const generationId = randomId("ai-generation");
    const model = input.quality === "quality" ? this.config.qualityModel : this.config.fastModel;
    const result = await this.generateAndParse({
      input,
      prompt: quizGenerationPrompt,
      schema: aiQuizResponseSchema,
      schemaDescription: QUIZ_JSON_CONTRACT,
      model,
      requestId,
      signal,
      reviewKind: "quiz",
      thinking: input.quality === "quality",
    });
    const sources = new Map(input.sources.map((item) => [item.sourceId, { source: item.source, language: item.language }]));
    const validation = validateQuiz(result.value.items, sources, input.mode);
    if (validation.accepted.length === 0) {
      throw new AIError("CONTENT_VALIDATION_FAILED", { cause: flattenValidationIssues(validation.rejected) });
    }
    const questions = validation.accepted.slice(0, input.count).map((item: AIQuizWireItem): ChoiceQuestion => ({
      ...item,
      id: randomId("ai-question"),
    }));
    const rejectedReasons = flattenValidationIssues(validation.rejected);
    const records = this.records({
      requestId, generationId, kind: "quiz", prompt: quizGenerationPrompt as PromptTemplate<unknown>, model: result.model,
      startedAt, usage: result.usage, requestedCount: input.count,
      contentIds: questions.map((item) => item.id), previewLabels: questions.map((item) => item.prompt), rejectedReasons, repaired: result.repaired,
      parameters: { count: input.count, mode: input.mode, sourceFilter: input.sourceFilter, quality: input.quality, sourceCount: input.sources.length },
    });
    return { ...records, questions, rejectedReasons };
  }

  async explainMistake(input: ExplanationGenerationInput, requestId: string, signal?: AbortSignal): Promise<AIGenerationPayload> {
    const startedAt = new Date().toISOString();
    const generationId = randomId("ai-generation");
    const result = await this.generateAndParse({
      input,
      prompt: mistakeExplanationPrompt,
      schema: aiExplanationResponseSchema,
      schemaDescription: "包含六个简洁中文解释字段的对象",
      model: this.config.qualityModel,
      requestId,
      signal,
      reviewKind: "explanation",
      thinking: true,
    });
    const generatedAt = new Date().toISOString();
    const cacheKey = contentHash({
      question: input.question,
      selectedIndex: input.selectedIndex,
      promptVersion: mistakeExplanationPrompt.version,
      model: result.model,
      variant: input.variant,
    });
    const explanation = {
      id: randomId("ai-explanation"),
      cacheKey,
      questionId: input.question.id,
      selectedIndex: input.selectedIndex,
      correctIndex: input.question.correctIndex,
      variant: input.variant,
      content: result.value,
      model: result.model,
      promptVersion: mistakeExplanationPrompt.version,
      generatedAt,
      generationId,
    };
    const records = this.records({
      requestId, generationId, kind: "explanation", prompt: mistakeExplanationPrompt as PromptTemplate<unknown>, model: result.model,
      startedAt, usage: result.usage, requestedCount: 1, contentIds: [explanation.id], previewLabels: [input.question.prompt], rejectedReasons: [], repaired: result.repaired,
      parameters: { questionId: input.question.id, selectedIndex: input.selectedIndex, variant: input.variant, force: input.force },
    });
    return { ...records, explanation };
  }
}
