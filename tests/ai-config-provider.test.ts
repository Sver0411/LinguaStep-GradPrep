import { describe, expect, it, vi } from "vitest";
import { parseAIConfig } from "../lib/ai/config/ai-config";
import { DeepSeekProvider } from "../lib/ai/provider/deepseek-provider";

const config = parseAIConfig({
  DEEPSEEK_API_KEY: "server-secret",
  AI_MAX_RETRIES: "2",
  AI_MAX_CONCURRENCY: "2",
});

function completion(content = '{"ok":true}', model = "deepseek-v4-flash") {
  return new Response(JSON.stringify({
    model,
    choices: [{ finish_reason: "stop", message: { content } }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, prompt_cache_hit_tokens: 2 },
  }), { status: 200, headers: { "content-type": "application/json" } });
}

const request = {
  requestId: "request-1",
  model: "deepseek-v4-flash",
  systemPrompt: "system",
  userPrompt: "user",
  maxTokens: 1000,
  thinking: false,
};

describe("AI configuration", () => {
  it("uses the required DeepSeek v4 defaults and bounded runtime settings", () => {
    const parsed = parseAIConfig({ AI_TIMEOUT_MS: "999999", AI_MAX_RETRIES: "9", AI_MAX_CONCURRENCY: "0" });
    expect(parsed).toMatchObject({
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com",
      fastModel: "deepseek-v4-flash",
      qualityModel: "deepseek-v4-pro",
      timeoutMs: 120_000,
      maxRetries: 5,
      maxConcurrency: 1,
    });
  });

  it("rejects an insecure non-local base URL", () => {
    expect(() => parseAIConfig({ DEEPSEEK_BASE_URL: "http://example.com" })).toThrow("HTTPS");
  });

  it("rejects an unsupported provider instead of silently routing it to DeepSeek", () => {
    expect(() => parseAIConfig({ AI_PROVIDER: "unknown" })).toThrow("DeepSeek Provider");
  });
});

describe("DeepSeekProvider", () => {
  it("sends OpenAI-compatible JSON mode and explicitly disables thinking", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(completion());
    const provider = new DeepSeekProvider(config, "sk-test-secret", { fetchImpl });
    const result = await provider.generateJSON(request);
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5, totalTokens: 15, cacheHitTokens: 2 });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test-secret");
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: "deepseek-v4-flash",
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      stream: false,
    });
  });

  it("enables thinking only when the business service requests a complex task", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(completion());
    const provider = new DeepSeekProvider(config, "sk-test-secret", { fetchImpl });
    await provider.generateJSON({ ...request, requestId: "thinking", thinking: true });
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string).thinking).toEqual({ type: "enabled" });
  });

  it("retries transient 429 failures with backoff and reports retry count", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(completion());
    const sleep = vi.fn().mockResolvedValue(undefined);
    const provider = new DeepSeekProvider(config, "sk-test", { fetchImpl, sleep, random: () => 0 });
    const result = await provider.generateJSON({ ...request, requestId: "retry" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(500, undefined);
    expect(result.retryCount).toBe(1);
  });

  it("does not retry an invalid API key", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 401 }));
    const sleep = vi.fn();
    const provider = new DeepSeekProvider(config, "bad-key", { fetchImpl, sleep });
    await expect(provider.generateJSON({ ...request, requestId: "invalid-key" })).rejects.toMatchObject({ code: "INVALID_API_KEY" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("deduplicates identical in-flight requests", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchImpl = vi.fn(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    const provider = new DeepSeekProvider(config, "sk-dedupe", { fetchImpl });
    const first = provider.generateJSON({ ...request, requestId: "dedupe-a" });
    const second = provider.generateJSON({ ...request, requestId: "dedupe-b" });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    resolveFetch?.(completion());
    const [left, right] = await Promise.all([first, second]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(left).toBe(right);
  });

  it("rejects truncated responses after bounded retries", async () => {
    const truncated = new Response(JSON.stringify({ model: "deepseek-v4-flash", choices: [{ finish_reason: "length", message: { content: "{}" } }] }), { status: 200 });
    const fetchImpl = vi.fn().mockResolvedValue(truncated);
    const provider = new DeepSeekProvider({ ...config, maxRetries: 0 }, "sk-test", { fetchImpl });
    await expect(provider.generateJSON({ ...request, requestId: "truncated" })).rejects.toMatchObject({ code: "TRUNCATED_RESPONSE" });
  });

  it("stops after the configured maximum retry count", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 503 }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const provider = new DeepSeekProvider({ ...config, maxRetries: 2 }, "sk-test", { fetchImpl, sleep, random: () => 0 });
    await expect(provider.generateJSON({ ...request, requestId: "max-retries" })).rejects.toMatchObject({ code: "SERVER_OVERLOADED" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("maps HTTP 500 to a retryable overloaded error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
    const provider = new DeepSeekProvider({ ...config, maxRetries: 0 }, "sk-test", { fetchImpl });
    await expect(provider.generateJSON({ ...request, requestId: "http-500" })).rejects.toMatchObject({ code: "SERVER_OVERLOADED", retryable: true });
  });

  it("retries and then rejects an empty completion", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ model: "deepseek-v4-flash", choices: [{ finish_reason: "stop", message: { content: "" } }] }), { status: 200 }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const provider = new DeepSeekProvider({ ...config, maxRetries: 1 }, "sk-test", { fetchImpl, sleep });
    await expect(provider.generateJSON({ ...request, requestId: "empty" })).rejects.toMatchObject({ code: "EMPTY_RESPONSE" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries malformed upstream JSON before failing safely", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => new Response("not-json", { status: 200 }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const provider = new DeepSeekProvider({ ...config, maxRetries: 1 }, "sk-test", { fetchImpl, sleep });
    await expect(provider.generateJSON({ ...request, requestId: "bad-json" })).rejects.toMatchObject({ code: "INVALID_JSON" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("honors cancellation before contacting the provider", async () => {
    const fetchImpl = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const provider = new DeepSeekProvider(config, "sk-test", { fetchImpl });
    await expect(provider.generateJSON({ ...request, requestId: "cancelled", signal: controller.signal })).rejects.toMatchObject({ code: "REQUEST_CANCELLED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("classifies an aborted provider fetch as a timeout", async () => {
    const fetchImpl = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }));
    const provider = new DeepSeekProvider({ ...config, timeoutMs: 5, maxRetries: 0 }, "sk-test", { fetchImpl: fetchImpl as typeof fetch });
    await expect(provider.generateJSON({ ...request, requestId: "timeout" })).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("fails closed for a model outside the configured allow-list", async () => {
    const provider = new DeepSeekProvider(config, "sk-test", { fetchImpl: vi.fn() });
    await expect(provider.generateJSON({ ...request, model: "untrusted-model", requestId: "model" })).rejects.toMatchObject({ code: "MODEL_UNAVAILABLE" });
  });

  it("checks that both configured models are available", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "deepseek-v4-flash" }, { id: "deepseek-v4-pro" }] }), { status: 200 }));
    const provider = new DeepSeekProvider(config, "sk-test", { fetchImpl });
    await expect(provider.testConnection()).resolves.toMatchObject({ ok: true, fastModel: "deepseek-v4-flash", qualityModel: "deepseek-v4-pro" });
  });
});
