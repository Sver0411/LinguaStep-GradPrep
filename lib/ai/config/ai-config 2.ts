import { AIError } from "@/lib/ai/errors/ai-error";

export interface RuntimeAIConfig {
  enabled: boolean;
  provider: "deepseek";
  baseUrl: string;
  serverApiKey: string;
  fastModel: string;
  qualityModel: string;
  timeoutMs: number;
  maxRetries: number;
  maxConcurrency: number;
  proxyAccessToken: string;
  allowedModels: readonly string[];
}

type Environment = Record<string, string | undefined>;

function booleanValue(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() !== "false" && value !== "0";
}

function integerValue(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function safeBaseUrl(value: string | undefined): string {
  const raw = value?.trim() || "https://api.deepseek.com";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AIError("NOT_CONFIGURED", { message: "DeepSeek Base URL 配置无效。" });
  }
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new AIError("NOT_CONFIGURED", { message: "DeepSeek Base URL 必须使用 HTTPS。" });
  }
  return url.toString().replace(/\/$/, "");
}

export function parseAIConfig(env: Environment): RuntimeAIConfig {
  const provider = env.AI_PROVIDER?.trim() || "deepseek";
  if (provider !== "deepseek") {
    throw new AIError("NOT_CONFIGURED", { message: "当前仅支持 DeepSeek Provider。" });
  }
  const fastModel = env.DEEPSEEK_MODEL_FAST?.trim() || "deepseek-v4-flash";
  const qualityModel = env.DEEPSEEK_MODEL_QUALITY?.trim() || "deepseek-v4-pro";
  return {
    enabled: booleanValue(env.AI_ENABLED, true),
    provider,
    baseUrl: safeBaseUrl(env.DEEPSEEK_BASE_URL),
    serverApiKey: env.DEEPSEEK_API_KEY?.trim() || "",
    fastModel,
    qualityModel,
    timeoutMs: integerValue(env.AI_TIMEOUT_MS, 45_000, 5_000, 120_000),
    maxRetries: integerValue(env.AI_MAX_RETRIES, 3, 0, 5),
    maxConcurrency: integerValue(env.AI_MAX_CONCURRENCY, 2, 1, 5),
    proxyAccessToken: env.AI_PROXY_ACCESS_TOKEN?.trim() || "",
    allowedModels: [fastModel, qualityModel],
  };
}

export function loadAIConfig(): RuntimeAIConfig {
  return parseAIConfig(process.env);
}

export function publicAIConfig(config: RuntimeAIConfig) {
  return {
    enabled: config.enabled,
    provider: config.provider,
    serverModeConfigured: Boolean(config.serverApiKey),
    serverModeProtected: Boolean(config.proxyAccessToken),
    fastModel: config.fastModel,
    qualityModel: config.qualityModel,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    maxConcurrency: config.maxConcurrency,
  };
}
