import type { ZodType } from "zod";
import { loadAIConfig, publicAIConfig, type RuntimeAIConfig } from "@/lib/ai/config/ai-config";
import { AIError, safeAIErrorResponse } from "@/lib/ai/errors/ai-error";
import { DeepSeekProvider } from "@/lib/ai/provider/deepseek-provider";
import {
  explanationGenerationInputSchema,
  grammarGenerationInputSchema,
  quizGenerationInputSchema,
  wordGenerationInputSchema,
} from "@/lib/ai/schemas/content-schemas";
import { AIContentService } from "@/lib/ai/services/ai-content-service";
import type {
  AIProvider,
  ExplanationGenerationInput,
  GrammarGenerationInput,
  QuizGenerationInput,
  WordGenerationInput,
} from "@/lib/ai/types/ai.types";
import { enforceRateLimit, readLimitedJSON, resolveAPIKey, validateSameOrigin } from "./request-guard";

export type AIOperation = "models" | "generate-words" | "generate-grammar" | "generate-quiz" | "explain-mistake";

export interface AIHandlerDependencies {
  config?: RuntimeAIConfig;
  providerFactory?: (config: RuntimeAIConfig, apiKey: string) => AIProvider;
}

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: RESPONSE_HEADERS });
}

function validateInput<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AIError("INVALID_REQUEST", { status: 400, cause: result.error.issues });
  }
  return result.data;
}

function requestConfig(request: Request, config: RuntimeAIConfig): RuntimeAIConfig {
  const raw = request.headers.get("x-linguastep-max-retries");
  if (raw === null || raw.trim() === "") return config;
  const requested = Number(raw);
  if (!Number.isInteger(requested)) return config;
  return { ...config, maxRetries: Math.min(config.maxRetries, Math.max(0, requested)) };
}

export function healthResponse(dependencies: AIHandlerDependencies = {}): Response {
  try {
    const config = dependencies.config ?? loadAIConfig();
    return jsonResponse(publicAIConfig(config));
  } catch (error) {
    const safe = safeAIErrorResponse(error);
    return jsonResponse({ error: { code: safe.code, message: safe.message, retryable: safe.retryable } }, safe.status);
  }
}

export function createAIHandler(
  operation: AIOperation,
  dependencies: AIHandlerDependencies = {},
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();
    try {
      if (request.method !== "POST") {
        throw new AIError("INVALID_REQUEST", { status: 405 });
      }
      validateSameOrigin(request);
      enforceRateLimit(request);
      const config = dependencies.config ?? loadAIConfig();
      const { apiKey } = await resolveAPIKey(request, config);
      const effectiveConfig = requestConfig(request, config);
      const provider = dependencies.providerFactory?.(effectiveConfig, apiKey) ?? new DeepSeekProvider(effectiveConfig, apiKey);
      if (operation === "models") {
        const result = await provider.testConnection(request.signal);
        if (!result.ok) throw new AIError("MODEL_UNAVAILABLE", { status: 503 });
        return jsonResponse({ data: result, requestId });
      }

      const body = await readLimitedJSON(request);
      const service = new AIContentService(provider, effectiveConfig);
      const data = operation === "generate-words"
        ? await service.generateWords(validateInput<WordGenerationInput>(wordGenerationInputSchema, body), requestId, request.signal)
        : operation === "generate-grammar"
          ? await service.generateGrammar(validateInput<GrammarGenerationInput>(grammarGenerationInputSchema, body), requestId, request.signal)
          : operation === "generate-quiz"
            ? await service.generateQuiz(validateInput<QuizGenerationInput>(quizGenerationInputSchema, body), requestId, request.signal)
            : await service.explainMistake(validateInput<ExplanationGenerationInput>(explanationGenerationInputSchema, body), requestId, request.signal);
      return jsonResponse({ data, requestId });
    } catch (error) {
      const safe = safeAIErrorResponse(error);
      return jsonResponse(
        { error: { code: safe.code, message: safe.message, retryable: safe.retryable }, requestId },
        safe.status,
      );
    }
  };
}
