import type { RuntimeAIConfig } from "@/lib/ai/config/ai-config";
import { AIError } from "@/lib/ai/errors/ai-error";

const MAX_BODY_BYTES = 65_536;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const rateBuckets = new Map<string, { startedAt: number; count: number }>();

function localHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

export async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)]);
  let difference = 0;
  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index];
  }
  return difference === 0;
}

export function validateSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestOrigin = new URL(request.url).origin;
  if (origin !== requestOrigin) {
    throw new AIError("PROXY_ACCESS_DENIED", { status: 403 });
  }
}

export async function readLimitedJSON(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw new AIError("INVALID_REQUEST", { status: 413 });
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    throw new AIError("INVALID_REQUEST", { status: 413 });
  }
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new AIError("INVALID_REQUEST", { status: 400, cause: error });
  }
}

export async function resolveAPIKey(
  request: Request,
  config: RuntimeAIConfig,
): Promise<{ apiKey: string; mode: "server" | "byok" }> {
  if (!config.enabled) throw new AIError("NOT_CONFIGURED", { status: 503 });
  const userKey = request.headers.get("x-linguastep-api-key")?.trim() ?? "";
  if (userKey) return { apiKey: userKey, mode: "byok" };
  if (!config.serverApiKey) throw new AIError("NOT_CONFIGURED", { status: 503 });

  const hostname = new URL(request.url).hostname;
  if (!localHostname(hostname)) {
    if (!config.proxyAccessToken) {
      throw new AIError("NOT_CONFIGURED", { status: 503 });
    }
    const provided = request.headers.get("x-linguastep-proxy-token") ?? "";
    if (!provided || !(await constantTimeEqual(provided, config.proxyAccessToken))) {
      throw new AIError("PROXY_ACCESS_DENIED", { status: 401 });
    }
  }
  return { apiKey: config.serverApiKey, mode: "server" };
}

function clientKey(request: Request): string {
  const address =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  return `${new URL(request.url).hostname}:${address}`;
}

export function enforceRateLimit(request: Request, now = Date.now()): void {
  const key = clientKey(request);
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return;
  }
  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    throw new AIError("RATE_LIMITED", { status: 429, retryable: true });
  }
}

export function resetRateLimitsForTests(): void {
  rateBuckets.clear();
}
