// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIAPIClient } from "../lib/ai/client/ai-api-client";
import { AISettingsRepository, clearAllAISecrets, getAISecret, maskedSecret, setAISecret } from "../lib/ai/client/ai-settings";
import { DEFAULT_AI_SETTINGS } from "../lib/constants";
import { IDBFactory } from "fake-indexeddb";
import { IndexedDbLearningRepository } from "../lib/repositories/indexed-db";

describe("AI client secret isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  it("defaults secrets to session storage and masks them in UI status", () => {
    setAISecret("apiKey", "sk-1234567890", "session");
    expect(sessionStorage.getItem("lingua-step:deepseek-api-key")).toBe("sk-1234567890");
    expect(localStorage.getItem("lingua-step:deepseek-api-key")).toBeNull();
    expect(getAISecret("apiKey")).toBe("sk-1234567890");
    expect(maskedSecret("apiKey")).toBe("sk-••••7890");
  });

  it("only persists a secret across sessions after explicit device selection", () => {
    setAISecret("proxyToken", "device-proxy", "device");
    expect(localStorage.getItem("lingua-step:ai-proxy-token")).toBe("device-proxy");
    clearAllAISecrets();
    expect(localStorage.getItem("lingua-step:ai-proxy-token")).toBeNull();
  });

  it("stores only normalized non-sensitive AI settings", () => {
    const repository = new AISettingsRepository();
    repository.save({ ...DEFAULT_AI_SETTINGS, maxRetries: 99 });
    const raw = localStorage.getItem("lingua-step:ai-settings") ?? "";
    const saved = JSON.parse(raw) as Record<string, unknown>;
    expect(saved).not.toHaveProperty("apiKey");
    expect(saved).not.toHaveProperty("proxyToken");
    expect(raw).not.toContain("sk-");
    expect(repository.get().maxRetries).toBe(5);
  });

  it("never writes a configured API key into the IndexedDB learning snapshot", async () => {
    Object.defineProperty(globalThis, "indexedDB", { value: new IDBFactory(), configurable: true });
    setAISecret("apiKey", "sk-indexeddb-sentinel", "session");
    const snapshot = await new IndexedDbLearningRepository().getSnapshot();
    expect(JSON.stringify(snapshot)).not.toContain("sk-indexeddb-sentinel");
    expect(JSON.stringify(snapshot)).not.toContain("deepseek-api-key");
  });

  it("puts BYOK only in a request header, never in body or URL", async () => {
    setAISecret("apiKey", "sk-request-secret", "session");
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ok: true, availableModels: [], fastModel: "deepseek-v4-flash", qualityModel: "deepseek-v4-pro" }, requestId: "request" }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = new AIAPIClient(fetchImpl);
    await client.testConnection({ ...DEFAULT_AI_SETTINGS, connectionMode: "byok", autoRetry: false });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/study-service/models");
    expect(url).not.toContain("sk-request-secret");
    expect(init.body).not.toContain("sk-request-secret");
    expect((init.headers as Record<string, string>)["x-linguastep-api-key"]).toBe("sk-request-secret");
    expect((init.headers as Record<string, string>)["x-linguastep-max-retries"]).toBe("0");
  });

  it("fails locally while offline without calling fetch", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const fetchImpl = vi.fn();
    const client = new AIAPIClient(fetchImpl);
    await expect(client.testConnection(DEFAULT_AI_SETTINGS)).rejects.toMatchObject({ code: "OFFLINE" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
