import type { AISettings } from "@/lib/models";
import type {
  AIClientOperation,
  AIConnectionResult,
  AIGenerationPayload,
  AIHealthResponse,
} from "@/lib/ai/types/ai.types";
import { AIError, safeAIErrorResponse } from "@/lib/ai/errors/ai-error";
import {
  createAIHandler,
  healthResponse,
  type AIHandlerDependencies,
} from "@/lib/ai/server/api-handler";

type AIActionData = AIConnectionResult | AIGenerationPayload | AIHealthResponse;

export interface AIActionRequest {
  operation: AIClientOperation | "health";
  input?: unknown;
  connectionMode?: AISettings["connectionMode"];
  apiKey?: string;
  proxyToken?: string;
  maxRetries?: number;
}

export type AIActionResult<T extends AIActionData = AIActionData> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ReturnType<typeof safeAIErrorResponse>["code"];
        status: number;
        retryable: boolean;
      };
    };

function failure(error: unknown): AIActionResult {
  const safe = safeAIErrorResponse(error);
  return {
    ok: false,
    error: { code: safe.code, status: safe.status, retryable: safe.retryable },
  };
}

/**
 * Executes the existing guarded AI handler without relying on a browser route
 * fetch. Sites transports this through React Server Actions/RSC, which also
 * applies the platform's CSRF checks before this function runs.
 */
export async function executeAIAction(
  action: AIActionRequest,
  dependencies: AIHandlerDependencies = {},
): Promise<AIActionResult> {
  try {
    if (action.operation === "health") {
      const response = healthResponse(dependencies);
      const body = await response.json() as AIHealthResponse | { error: { code: string } };
      if (!response.ok || "error" in body) {
        throw new AIError("NOT_CONFIGURED", { status: response.status });
      }
      return { ok: true, data: body };
    }

    const headers = new Headers({
      "Content-Type": "application/json",
      "x-linguastep-max-retries": String(
        Number.isInteger(action.maxRetries) ? action.maxRetries : 0,
      ),
    });
    if (action.connectionMode === "byok") {
      const apiKey = action.apiKey?.trim();
      if (!apiKey) throw new AIError("NOT_CONFIGURED", { status: 503 });
      headers.set("x-linguastep-api-key", apiKey);
    } else if (action.proxyToken?.trim()) {
      headers.set("x-linguastep-proxy-token", action.proxyToken.trim());
    }

    // This Request never leaves the server. It lets the Server Action reuse the
    // same validation, rate limiting, authorization, and safe-error path as the
    // public route handlers.
    const internalRequest = new Request(`https://linguastep.internal/study-service/${action.operation}`, {
      method: "POST",
      headers,
      body: JSON.stringify(action.input ?? {}),
    });
    const response = await createAIHandler(action.operation, dependencies)(internalRequest);
    const body = await response.json() as {
      data?: AIConnectionResult | AIGenerationPayload;
      error?: { code: ReturnType<typeof safeAIErrorResponse>["code"]; retryable: boolean };
    };
    if (!response.ok || body.error || !body.data) {
      return {
        ok: false,
        error: {
          code: body.error?.code ?? "UNKNOWN",
          status: response.status,
          retryable: body.error?.retryable ?? false,
        },
      };
    }
    return { ok: true, data: body.data };
  } catch (error) {
    return failure(error);
  }
}
