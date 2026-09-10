import type { AIErrorCode } from "@/lib/models";

const USER_MESSAGES: Record<AIErrorCode, string> = {
  NOT_CONFIGURED: "请先在设置中配置 DeepSeek。",
  INVALID_API_KEY: "API Key 无效，请检查后重试。",
  PROXY_ACCESS_DENIED: "代理访问令牌无效，请检查后重试。",
  INSUFFICIENT_BALANCE: "DeepSeek 账户余额不足。",
  RATE_LIMITED: "请求过于频繁，请稍后重试。",
  INVALID_REQUEST: "请求参数不符合要求，请调整后重试。",
  MODEL_UNAVAILABLE: "配置的 DeepSeek 模型当前不可用。",
  TIMEOUT: "本次生成时间过长，可重试或减少生成数量。",
  NETWORK_ERROR: "网络连接失败，请检查网络后重试。",
  SERVER_OVERLOADED: "DeepSeek 当前繁忙，请稍后重试。",
  EMPTY_RESPONSE: "DeepSeek 没有返回内容，请重试。",
  TRUNCATED_RESPONSE: "生成内容被截断，请减少数量后重试。",
  INVALID_JSON: "生成内容格式异常，已停止保存。",
  SCHEMA_VALIDATION_FAILED: "生成内容结构未通过检查，未保存。",
  CONTENT_VALIDATION_FAILED: "生成内容未通过质量检查，未保存。",
  REQUEST_CANCELLED: "已取消本次生成。",
  DAILY_LIMIT_REACHED: "已达到今日 AI 请求软限制，可在设置中调整。",
  OFFLINE: "当前离线，AI 功能暂不可用。",
  UNKNOWN: "AI 服务暂时不可用，请稍后重试。",
};

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly technicalCause?: unknown;

  constructor(
    code: AIErrorCode,
    options: { status?: number; retryable?: boolean; cause?: unknown; message?: string } = {},
  ) {
    super(options.message ?? USER_MESSAGES[code]);
    this.name = "AIError";
    this.code = code;
    this.status = options.status ?? 500;
    this.retryable = options.retryable ?? false;
    this.technicalCause = options.cause;
  }
}

export function aiErrorMessage(code: AIErrorCode): string {
  return USER_MESSAGES[code];
}

export function isAIError(error: unknown): error is AIError {
  return error instanceof AIError;
}

export function mapUpstreamStatus(status: number): AIError {
  if (status === 401) return new AIError("INVALID_API_KEY", { status: 401 });
  if (status === 402) return new AIError("INSUFFICIENT_BALANCE", { status: 402 });
  if (status === 403) return new AIError("INVALID_API_KEY", { status: 403 });
  if (status === 404) return new AIError("MODEL_UNAVAILABLE", { status: 503 });
  if (status === 429) return new AIError("RATE_LIMITED", { status: 429, retryable: true });
  if (status === 500 || status === 503) {
    return new AIError("SERVER_OVERLOADED", { status: 503, retryable: true });
  }
  if (status === 400 || status === 422) {
    return new AIError("INVALID_REQUEST", { status: 400 });
  }
  return new AIError("UNKNOWN", { status: 502 });
}

export function normalizeAIError(error: unknown): AIError {
  if (isAIError(error)) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AIError("REQUEST_CANCELLED", { status: 499, cause: error });
  }
  return new AIError("UNKNOWN", { cause: error });
}

export function safeAIErrorResponse(error: unknown): {
  code: AIErrorCode;
  message: string;
  status: number;
  retryable: boolean;
} {
  const normalized = normalizeAIError(error);
  return {
    code: normalized.code,
    message: aiErrorMessage(normalized.code),
    status: normalized.status,
    retryable: normalized.retryable,
  };
}
