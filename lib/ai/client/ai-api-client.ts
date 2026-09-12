import { AIError } from "@/lib/ai/errors/ai-error";
import { getAISecret } from "@/lib/ai/client/ai-settings";
import type {
  AIAPIErrorBody,
  AIAPIResponse,
  AIClientOperation,
  AIConnectionResult,
  AIGenerationPayload,
  AIHealthResponse,
  ExplanationGenerationInput,
  GrammarGenerationInput,
  QuizGenerationInput,
  WordGenerationInput,
} from "@/lib/ai/types/ai.types";
import type { AISettings } from "@/lib/models";
import { executeAIAction } from "@/lib/ai/server/action-handler";
import type { AIActionResult } from "@/lib/ai/server/action-handler";

type AIInput =
  | WordGenerationInput
  | GrammarGenerationInput
  | QuizGenerationInput
  | ExplanationGenerationInput
  | Record<string, never>;

const APP_BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
  .trim()
  .replace(/\/+$/, "");
const AI_SERVICE_BASE_PATH = `${APP_BASE_PATH}/study-service`;

export class AIAPIClient {
  constructor(private readonly fetchImpl?: typeof fetch) {}

  async health(signal?: AbortSignal): Promise<AIHealthResponse> {
    if (!this.fetchImpl) {
      return this.actionRequest<AIHealthResponse>("health", {}, undefined, signal);
    }
    const response = await this.fetchImpl(`${AI_SERVICE_BASE_PATH}/health`, {
      method: "GET",
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw await this.errorFromResponse(response);
    return response.json() as Promise<AIHealthResponse>;
  }

  async testConnection(settings: AISettings, signal?: AbortSignal): Promise<AIConnectionResult> {
    const response = await this.request<AIConnectionResult>("models", {}, settings, signal);
    return response.data;
  }

  async generateWords(input: WordGenerationInput, settings: AISettings, signal?: AbortSignal): Promise<AIGenerationPayload> {
    return (await this.request<AIGenerationPayload>("generate-words", input, settings, signal)).data;
  }

  async generateGrammar(input: GrammarGenerationInput, settings: AISettings, signal?: AbortSignal): Promise<AIGenerationPayload> {
    return (await this.request<AIGenerationPayload>("generate-grammar", input, settings, signal)).data;
  }

  async generateQuiz(input: QuizGenerationInput, settings: AISettings, signal?: AbortSignal): Promise<AIGenerationPayload> {
    return (await this.request<AIGenerationPayload>("generate-quiz", input, settings, signal)).data;
  }

  async explainMistake(input: ExplanationGenerationInput, settings: AISettings, signal?: AbortSignal): Promise<AIGenerationPayload> {
    return (await this.request<AIGenerationPayload>("explain-mistake", input, settings, signal)).data;
  }

  private async request<T>(
    operation: AIClientOperation,
    input: AIInput,
    settings: AISettings,
    signal?: AbortSignal,
  ): Promise<AIAPIResponse<T>> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new AIError("OFFLINE", { status: 503 });
    }
    if (!settings.enabled) throw new AIError("NOT_CONFIGURED", { status: 503 });
    if (!this.fetchImpl) {
      return {
        data: await this.actionRequest<T>(operation, input, settings, signal),
        requestId: crypto.randomUUID(),
      };
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    headers["x-linguastep-max-retries"] = String(
      settings.autoRetry ? settings.maxRetries : 0,
    );
    if (settings.connectionMode === "byok") {
      const key = getAISecret("apiKey");
      if (!key) throw new AIError("NOT_CONFIGURED", { status: 503 });
      headers["x-linguastep-api-key"] = key;
    } else {
      const token = getAISecret("proxyToken");
      if (token) headers["x-linguastep-proxy-token"] = token;
    }
    let response: Response;
    try {
      response = await this.fetchImpl(`${AI_SERVICE_BASE_PATH}/${operation}`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
        cache: "no-store",
        signal,
      });
    } catch (error) {
      if (signal?.aborted) throw new AIError("REQUEST_CANCELLED", { status: 499 });
      throw new AIError("NETWORK_ERROR", { retryable: true, cause: error });
    }
    if (!response.ok) throw await this.errorFromResponse(response);
    try {
      return await response.json() as AIAPIResponse<T>;
    } catch (error) {
      throw new AIError("INVALID_JSON", { cause: error });
    }
  }

  private async actionRequest<T>(
    operation: AIClientOperation | "health",
    input: AIInput,
    settings?: AISettings,
    signal?: AbortSignal,
  ): Promise<T> {
    if (signal?.aborted) throw new AIError("REQUEST_CANCELLED", { status: 499 });
    const apiKey = settings?.connectionMode === "byok" ? getAISecret("apiKey") : "";
    const proxyToken = settings?.connectionMode === "server" ? getAISecret("proxyToken") : "";
    if (settings?.connectionMode === "byok" && !apiKey) {
      throw new AIError("NOT_CONFIGURED", { status: 503 });
    }

    let result: AIActionResult;
    try {
      result = await executeAIAction({
        operation,
        input,
        connectionMode: settings?.connectionMode,
        apiKey,
        proxyToken,
        maxRetries: settings ? (settings.autoRetry ? settings.maxRetries : 0) : 0,
      });
    } catch (error) {
      if (signal?.aborted) throw new AIError("REQUEST_CANCELLED", { status: 499 });
      throw new AIError("NETWORK_ERROR", { retryable: true, cause: error });
    }
    if (signal?.aborted) throw new AIError("REQUEST_CANCELLED", { status: 499 });
    if (!result.ok) {
      throw new AIError(result.error.code, {
        status: result.error.status,
        retryable: result.error.retryable,
      });
    }
    return result.data as T;
  }

  private async errorFromResponse(response: Response): Promise<AIError> {
    try {
      const body = await response.json() as AIAPIErrorBody;
      return new AIError(body.error.code, {
        status: response.status,
        retryable: body.error.retryable,
      });
    } catch {
      return new AIError("UNKNOWN", { status: response.status });
    }
  }
}
