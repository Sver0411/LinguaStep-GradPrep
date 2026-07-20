import { AIError, mapUpstreamStatus, normalizeAIError } from "@/lib/ai/errors/ai-error";
import type { RuntimeAIConfig } from "@/lib/ai/config/ai-config";
import type {
  AIConnectionResult,
  AIProvider,
  AIProviderRequest,
  AIProviderResponse,
  AIRequestUsage,
} from "@/lib/ai/types/ai.types";

type FetchLike = typeof fetch;

interface ProviderDependencies {
  fetchImpl?: FetchLike;
  sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  random?: () => number;
}

const pendingRequests = new Map<string, Promise<AIProviderResponse>>();
let activeRequests = 0;
const concurrencyWaiters: Array<() => void> = [];

async function fingerprint(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function acquireConcurrency(limit: number, signal?: AbortSignal): Promise<() => void> {
  while (activeRequests >= limit) {
    await new Promise<void>((resolve, reject) => {
      const waiter = () => {
        signal?.removeEventListener("abort", cancel);
        resolve();
      };
      const cancel = () => {
        const index = concurrencyWaiters.indexOf(waiter);
        if (index >= 0) concurrencyWaiters.splice(index, 1);
        reject(new AIError("REQUEST_CANCELLED", { status: 499 }));
      };
      if (signal?.aborted) return cancel();
      signal?.addEventListener("abort", cancel, { once: true });
      concurrencyWaiters.push(waiter);
    });
  }
  activeRequests += 1;
  return () => {
    activeRequests = Math.max(0, activeRequests - 1);
    concurrencyWaiters.shift()?.();
  };
}

function defaultSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    const cancel = () => {
      clearTimeout(timer);
      reject(new AIError("REQUEST_CANCELLED", { status: 499 }));
    };
    if (signal?.aborted) cancel();
    else signal?.addEventListener("abort", cancel, { once: true });
  });
}

function usageFromResponse(value: unknown): AIRequestUsage {
  const usage = typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
  const number = (key: string) =>
    typeof usage[key] === "number" && Number.isFinite(usage[key])
      ? Math.max(0, usage[key] as number)
      : 0;
  return {
    inputTokens: number("prompt_tokens"),
    outputTokens: number("completion_tokens"),
    totalTokens: number("total_tokens"),
    cacheHitTokens: number("prompt_cache_hit_tokens"),
  };
}

function parseCompletionResponse(value: unknown, requestId: string, durationMs: number, retryCount: number): AIProviderResponse {
  if (typeof value !== "object" || value === null) {
    throw new AIError("INVALID_JSON", { retryable: true });
  }
  const record = value as Record<string, unknown>;
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const choice = choices[0];
  if (typeof choice !== "object" || choice === null) {
    throw new AIError("EMPTY_RESPONSE", { retryable: true });
  }
  const choiceRecord = choice as Record<string, unknown>;
  const finishReason = typeof choiceRecord.finish_reason === "string"
    ? choiceRecord.finish_reason
    : "";
  if (finishReason === "length") {
    throw new AIError("TRUNCATED_RESPONSE", { retryable: true });
  }
  if (finishReason !== "stop") {
    throw new AIError("SERVER_OVERLOADED", { retryable: finishReason === "insufficient_system_resource" });
  }
  const message = choiceRecord.message;
  const content = typeof message === "object" && message !== null
    ? (message as Record<string, unknown>).content
    : undefined;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new AIError("EMPTY_RESPONSE", { retryable: true });
  }
  return {
    requestId,
    model: typeof record.model === "string" ? record.model : "unknown",
    content,
    finishReason,
    durationMs,
    retryCount,
    usage: usageFromResponse(record.usage),
  };
}

export class DeepSeekProvider implements AIProvider {
  private readonly fetchImpl: FetchLike;
  private readonly sleep: NonNullable<ProviderDependencies["sleep"]>;
  private readonly random: NonNullable<ProviderDependencies["random"]>;

  constructor(
    private readonly config: RuntimeAIConfig,
    private readonly apiKey: string,
    dependencies: ProviderDependencies = {},
  ) {
    this.fetchImpl = dependencies.fetchImpl ?? fetch;
    this.sleep = dependencies.sleep ?? defaultSleep;
    this.random = dependencies.random ?? Math.random;
  }

  async generateJSON(request: AIProviderRequest): Promise<AIProviderResponse> {
    if (!this.config.enabled || !this.apiKey) {
      throw new AIError("NOT_CONFIGURED", { status: 503 });
    }
    if (!this.config.allowedModels.includes(request.model)) {
      throw new AIError("MODEL_UNAVAILABLE", { status: 400 });
    }
    const dedupeKey = await fingerprint([
      this.apiKey,
      request.model,
      request.systemPrompt,
      request.userPrompt,
      request.maxTokens,
      request.thinking,
    ].join("\n"));
    const existing = pendingRequests.get(dedupeKey);
    if (existing) return existing;
    const promise = this.runCompletion(request).finally(() => {
      pendingRequests.delete(dedupeKey);
    });
    pendingRequests.set(dedupeKey, promise);
    return promise;
  }

  private async runCompletion(request: AIProviderRequest): Promise<AIProviderResponse> {
    const release = await acquireConcurrency(this.config.maxConcurrency, request.signal);
    const startedAt = Date.now();
    try {
      let lastError: AIError = new AIError("UNKNOWN");
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
        if (request.signal?.aborted) {
          throw new AIError("REQUEST_CANCELLED", { status: 499 });
        }
        try {
          const response = await this.fetchWithTimeout(
            `${this.config.baseUrl}/chat/completions`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
              },
              body: JSON.stringify({
                model: request.model,
                messages: [
                  { role: "system", content: request.systemPrompt },
                  { role: "user", content: request.userPrompt },
                ],
                response_format: { type: "json_object" },
                thinking: { type: request.thinking ? "enabled" : "disabled" },
                max_tokens: request.maxTokens,
                stream: false,
              }),
            },
            request.signal,
          );
          if (!response.ok) throw mapUpstreamStatus(response.status);
          let payload: unknown;
          try {
            payload = await response.json();
          } catch (error) {
            throw new AIError("INVALID_JSON", { retryable: true, cause: error });
          }
          return parseCompletionResponse(
            payload,
            request.requestId,
            Date.now() - startedAt,
            attempt,
          );
        } catch (error) {
          lastError = this.normalizeTransportError(error, request.signal);
          if (!lastError.retryable || attempt >= this.config.maxRetries) throw lastError;
          const delay = Math.min(8_000, 500 * 2 ** attempt) + Math.round(this.random() * 250);
          await this.sleep(delay, request.signal);
        }
      }
      throw lastError;
    } finally {
      release();
    }
  }

  private normalizeTransportError(error: unknown, signal?: AbortSignal): AIError {
    if (signal?.aborted) return new AIError("REQUEST_CANCELLED", { status: 499 });
    const normalized = normalizeAIError(error);
    if (normalized.code !== "UNKNOWN") return normalized;
    if (error instanceof TypeError) {
      return new AIError("NETWORK_ERROR", { retryable: true, cause: error });
    }
    return normalized;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    parentSignal?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.config.timeoutMs);
    const cancel = () => controller.abort();
    parentSignal?.addEventListener("abort", cancel, { once: true });
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (timedOut) throw new AIError("TIMEOUT", { retryable: true, cause: error });
      throw error;
    } finally {
      clearTimeout(timeout);
      parentSignal?.removeEventListener("abort", cancel);
    }
  }

  async listModels(signal?: AbortSignal): Promise<string[]> {
    if (!this.config.enabled || !this.apiKey) {
      throw new AIError("NOT_CONFIGURED", { status: 503 });
    }
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/models`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
      signal,
    );
    if (!response.ok) throw mapUpstreamStatus(response.status);
    const payload = await response.json() as { data?: Array<{ id?: unknown }> };
    return (payload.data ?? [])
      .map((item) => item.id)
      .filter((item): item is string => typeof item === "string");
  }

  async testConnection(signal?: AbortSignal): Promise<AIConnectionResult> {
    const models = await this.listModels(signal);
    const expected = [this.config.fastModel, this.config.qualityModel];
    return {
      ok: expected.every((model) => models.includes(model)),
      availableModels: models,
      fastModel: this.config.fastModel,
      qualityModel: this.config.qualityModel,
    };
  }
}
