import { DEFAULT_AI_SETTINGS } from "@/lib/constants";
import type { AISecretPersistence, AISettings } from "@/lib/models";

const SETTINGS_KEY = "lingua-step:ai-settings";
const API_KEY = "lingua-step:deepseek-api-key";
const PROXY_TOKEN_KEY = "lingua-step:ai-proxy-token";

function clampInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

export function normalizeAISettings(value: unknown): AISettings {
  const input = typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
  const defaults = DEFAULT_AI_SETTINGS;
  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : defaults.enabled,
    connectionMode: input.connectionMode === "byok" ? "byok" : "server",
    apiKeyPersistence: input.apiKeyPersistence === "device" ? "device" : "session",
    proxyTokenPersistence: input.proxyTokenPersistence === "device" ? "device" : "session",
    autoSave: typeof input.autoSave === "boolean" ? input.autoSave : defaults.autoSave,
    defaultWordCount: input.defaultWordCount === 1 || input.defaultWordCount === 10 ? input.defaultWordCount : 5,
    defaultJapaneseLevel: input.defaultJapaneseLevel === "N3" || input.defaultJapaneseLevel === "N1" ? input.defaultJapaneseLevel : "N2",
    defaultEnglishLevel:
      input.defaultEnglishLevel === "高中基础" ||
      input.defaultEnglishLevel === "六级" ||
      input.defaultEnglishLevel === "TOEIC 过渡"
        ? input.defaultEnglishLevel
        : "四级",
    defaultFrequency: input.defaultFrequency === "常用" || input.defaultFrequency === "普通" ? input.defaultFrequency : "高频",
    defaultPurpose: input.defaultPurpose === "日常" || input.defaultPurpose === "考试" ? input.defaultPurpose : "综合",
    defaultQuality: input.defaultQuality === "quality" ? "quality" : "fast",
    qualityReview: typeof input.qualityReview === "boolean" ? input.qualityReview : defaults.qualityReview,
    autoRetry: typeof input.autoRetry === "boolean" ? input.autoRetry : defaults.autoRetry,
    maxRetries: clampInteger(input.maxRetries, defaults.maxRetries, 0, 5),
    dailyRequestSoftLimit: clampInteger(input.dailyRequestSoftLimit, defaults.dailyRequestSoftLimit, 1, 200),
  };
}

export class AISettingsRepository {
  get(): AISettings {
    if (typeof localStorage === "undefined") return DEFAULT_AI_SETTINGS;
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? normalizeAISettings(JSON.parse(stored)) : DEFAULT_AI_SETTINGS;
    } catch {
      return DEFAULT_AI_SETTINGS;
    }
  }

  save(settings: AISettings): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeAISettings(settings)));
  }

  reset(): AISettings {
    if (typeof localStorage !== "undefined") localStorage.removeItem(SETTINGS_KEY);
    return DEFAULT_AI_SETTINGS;
  }
}

function storageFor(persistence: AISecretPersistence): Storage | null {
  if (typeof window === "undefined") return null;
  return persistence === "device" ? window.localStorage : window.sessionStorage;
}

function secretKey(kind: "apiKey" | "proxyToken"): string {
  return kind === "apiKey" ? API_KEY : PROXY_TOKEN_KEY;
}

export function setAISecret(
  kind: "apiKey" | "proxyToken",
  value: string,
  persistence: AISecretPersistence,
): void {
  clearAISecret(kind);
  const normalized = value.trim();
  if (normalized) storageFor(persistence)?.setItem(secretKey(kind), normalized);
}

export function getAISecret(kind: "apiKey" | "proxyToken"): string {
  if (typeof window === "undefined") return "";
  const key = secretKey(kind);
  return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key) ?? "";
}

export function clearAISecret(kind: "apiKey" | "proxyToken"): void {
  if (typeof window === "undefined") return;
  const key = secretKey(kind);
  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
}

export function clearAllAISecrets(): void {
  clearAISecret("apiKey");
  clearAISecret("proxyToken");
}

export function maskedSecret(kind: "apiKey" | "proxyToken"): string {
  const value = getAISecret(kind);
  if (!value) return "未设置";
  return `${value.slice(0, Math.min(3, value.length))}••••${value.slice(-4)}`;
}
