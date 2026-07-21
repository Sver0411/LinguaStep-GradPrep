import { beforeEach, describe, expect, it } from "vitest";
import { parseAIConfig } from "../lib/ai/config/ai-config";
import { MockAIProvider } from "../lib/ai/provider/mock-provider";
import { createAIHandler, healthResponse } from "../lib/ai/server/api-handler";
import { constantTimeEqual, resetRateLimitsForTests, resolveAPIKey, validateSameOrigin } from "../lib/ai/server/request-guard";
import { providerResponse, validAIWord } from "./ai-fixtures";
import { AIError } from "../lib/ai/errors/ai-error";
import { executeAIAction } from "../lib/ai/server/action-handler";

const protectedConfig = parseAIConfig({
  DEEPSEEK_API_KEY: "server-key-should-never-leak",
  AI_PROXY_ACCESS_TOKEN: "proxy-token-should-never-leak",
});

describe("AI proxy security", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("health reports capability without exposing either server secret", async () => {
    const response = healthResponse({ config: protectedConfig });
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).not.toContain("server-key-should-never-leak");
    expect(text).not.toContain("proxy-token-should-never-leak");
    expect(JSON.parse(text)).toMatchObject({ serverModeConfigured: true, serverModeProtected: true });
  });

  it("requires the proxy access token for remote server-key mode", async () => {
    const denied = new Request("https://linguastep.example/api/ai/models", { method: "POST" });
    await expect(resolveAPIKey(denied, protectedConfig)).rejects.toMatchObject({ code: "PROXY_ACCESS_DENIED" });
    const allowed = new Request("https://linguastep.example/api/ai/models", { method: "POST", headers: { "x-linguastep-proxy-token": "proxy-token-should-never-leak" } });
    await expect(resolveAPIKey(allowed, protectedConfig)).resolves.toEqual({ apiKey: "server-key-should-never-leak", mode: "server" });
  });

  it("allows BYOK without returning or persisting the user key", async () => {
    const request = new Request("https://linguastep.example/api/ai/models", { method: "POST", headers: { "x-linguastep-api-key": "sk-personal" } });
    await expect(resolveAPIKey(request, parseAIConfig({}))).resolves.toEqual({ apiKey: "sk-personal", mode: "byok" });
  });

  it("executes BYOK through the Server Action bridge without exposing the key", async () => {
    let receivedKey = "";
    const result = await executeAIAction({
      operation: "models",
      connectionMode: "byok",
      apiKey: "sk-server-action-sentinel",
    }, {
      config: parseAIConfig({}),
      providerFactory: (_config, apiKey) => {
        receivedKey = apiKey;
        return new MockAIProvider(() => providerResponse({ items: [validAIWord] }));
      },
    });
    expect(result).toMatchObject({ ok: true });
    expect(receivedKey).toBe("sk-server-action-sentinel");
    expect(JSON.stringify(result)).not.toContain("sk-server-action-sentinel");
  });

  it("keeps server-key mode protected through the Server Action bridge", async () => {
    const result = await executeAIAction({
      operation: "models",
      connectionMode: "server",
    }, { config: protectedConfig });
    expect(result).toEqual({
      ok: false,
      error: { code: "PROXY_ACCESS_DENIED", status: 401, retryable: false },
    });
  });

  it("blocks cross-origin requests and compares tokens by digest", async () => {
    expect(() => validateSameOrigin(new Request("https://linguastep.example/api/ai/models", { headers: { origin: "https://evil.example" } }))).toThrow();
    await expect(constantTimeEqual("same", "same")).resolves.toBe(true);
    await expect(constantTimeEqual("same", "different")).resolves.toBe(false);
  });

  it("returns a stable safe error for invalid input without echoing the body", async () => {
    const handler = createAIHandler("generate-words", {
      config: protectedConfig,
      providerFactory: () => new MockAIProvider(() => providerResponse({ items: [validAIWord] })),
    });
    const request = new Request("http://localhost/api/ai/generate-words", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify({ malicious: "SECRET-PAYLOAD" }),
    });
    const response = await handler(request);
    const text = await response.text();
    expect(response.status).toBe(400);
    expect(text).toContain("INVALID_REQUEST");
    expect(text).not.toContain("SECRET-PAYLOAD");
  });

  it("validates, generates and returns request trace data through the proxy", async () => {
    const handler = createAIHandler("generate-words", {
      config: protectedConfig,
      providerFactory: () => new MockAIProvider(() => providerResponse({ items: [validAIWord] })),
    });
    const request = new Request("http://localhost/api/ai/generate-words", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost", "x-linguastep-max-retries": "0" },
      body: JSON.stringify({ count: 1, japaneseLevel: "N2", englishLevel: "四级", frequency: "高频", purpose: "综合", quality: "fast", qualityReview: false, existingWords: [] }),
    });
    const response = await handler(request);
    const body = await response.json() as { data: { words: unknown[]; generation: { parameters: Record<string, unknown> } }; requestId: string };
    expect(response.status).toBe(200);
    expect(body.data.words).toHaveLength(1);
    expect(body.data.generation.parameters.japaneseLevel).toBe("N2");
    expect(body.requestId).toBeTruthy();
  });

  it("rejects request bodies larger than 64 KiB", async () => {
    const handler = createAIHandler("generate-words", { config: protectedConfig });
    const response = await handler(new Request("http://localhost/api/ai/generate-words", {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      body: JSON.stringify({ content: "x".repeat(66_000) }),
    }));
    expect(response.status).toBe(413);
  });

  it("rejects generation counts that bypass the UI limit", async () => {
    const handler = createAIHandler("generate-words", { config: protectedConfig });
    const response = await handler(new Request("http://localhost/api/ai/generate-words", {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      body: JSON.stringify({ count: 11, japaneseLevel: "N2", englishLevel: "四级", frequency: "高频", purpose: "综合", quality: "fast", qualityReview: false, existingWords: [] }),
    }));
    expect(response.status).toBe(400);
  });

  it("maps an upstream invalid key without exposing it in the response", async () => {
    const handler = createAIHandler("models", {
      config: protectedConfig,
      providerFactory: () => ({
        generateJSON: async () => { throw new AIError("INVALID_API_KEY", { status: 401 }); },
        listModels: async () => { throw new AIError("INVALID_API_KEY", { status: 401 }); },
        testConnection: async () => { throw new AIError("INVALID_API_KEY", { status: 401, cause: "upstream key sk-leak" }); },
      }),
    });
    const response = await handler(new Request("http://localhost/api/ai/models", { method: "POST", headers: { origin: "http://localhost" } }));
    const text = await response.text();
    expect(response.status).toBe(401);
    expect(text).toContain("INVALID_API_KEY");
    expect(text).not.toContain("sk-leak");
  });
});
