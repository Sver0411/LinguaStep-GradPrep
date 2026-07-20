// @vitest-environment jsdom

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AIExplanationPanel } from "../components/ai/AIExplanationPanel";
import { AISettingsPanel } from "../components/ai/AISettingsPanel";
import { AIView } from "../components/views/AIView";
import { DEFAULT_AI_SETTINGS } from "../lib/constants";
import { makeQuestion, makeSnapshot, makeWord } from "./fixtures";

const mocked = vi.hoisted(() => ({
  ai: {} as ReturnType<typeof aiMock>,
  learning: {} as ReturnType<typeof learningMock>,
}));
vi.mock("@/context/AIContext", () => ({ useAI: () => mocked.ai }));
vi.mock("@/context/LearningContext", () => ({ useLearning: () => mocked.learning }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

function generation(overrides: Record<string, unknown> = {}) {
  return {
    id: "generation-1", requestId: "request-1", kind: "words", createdAt: "2026-07-21T00:00:00.000Z", completedAt: "2026-07-21T00:00:01.000Z",
    provider: "deepseek", model: "deepseek-v4-flash", promptName: "word-generation", promptVersion: "v1", status: "partial", saveMode: "temporary",
    validationStatus: "passed", requestedCount: 5, acceptedCount: 1, rejectedCount: 1, contentIds: ["ai-word-1"], previewLabels: ["改善する / improve"],
    ...overrides,
  };
}

function aiMock(overrides: Record<string, unknown> = {}) {
  return {
    settings: DEFAULT_AI_SETTINGS,
    health: null,
    online: true,
    busyOperation: null,
    error: null,
    transientResult: null,
    usageSummary: { todayRequests: 1, monthRequests: 2, todayTokens: 300, monthTokens: 600, successRate: 100, averageDurationMs: 120 },
    updateSettings: vi.fn(), setSecret: vi.fn(), clearSecret: vi.fn(), getSecretStatus: vi.fn().mockReturnValue({ configured: false, masked: "未设置" }), testConnection: vi.fn().mockResolvedValue(undefined),
    generateWords: vi.fn().mockResolvedValue(null), generateGrammar: vi.fn().mockResolvedValue(null), generateQuiz: vi.fn().mockResolvedValue(null), explainMistake: vi.fn().mockResolvedValue(null),
    saveTransient: vi.fn().mockResolvedValue(undefined), saveQuizCollection: vi.fn().mockResolvedValue(null), undoLastSave: vi.fn().mockResolvedValue(undefined), cancel: vi.fn(), resetAISettings: vi.fn(), clearAllSecrets: vi.fn(),
    ...overrides,
  };
}

function learningMock(overrides: Record<string, unknown> = {}) {
  return {
    snapshot: makeSnapshot(), removeAIContent: vi.fn(), undoAIGeneration: vi.fn(), removeAIGeneration: vi.fn(), saveAIArtifacts: vi.fn(), clearAIData: vi.fn(),
    ...overrides,
  };
}

describe("phase-three AI components", () => {
  beforeEach(() => {
    mocked.ai = aiMock();
    mocked.learning = learningMock();
    vi.stubGlobal("scrollTo", vi.fn());
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("submits the word, grammar and quiz generator forms through the AI context", async () => {
    render(<AIView />);
    await userEvent.click(screen.getByRole("button", { name: /开始生成/ }));
    expect(mocked.ai.generateWords).toHaveBeenCalledWith(expect.objectContaining({ count: 5, japaneseLevel: "N2", quality: "fast" }));
    await userEvent.click(screen.getByRole("tab", { name: /生成语法/ }));
    await userEvent.click(screen.getByRole("button", { name: /开始生成/ }));
    expect(mocked.ai.generateGrammar).toHaveBeenCalledWith(expect.objectContaining({ language: "japanese", level: "N2" }));
    await userEvent.click(screen.getByRole("tab", { name: /生成练习题/ }));
    await userEvent.click(screen.getByRole("button", { name: /开始生成/ }));
    expect(mocked.ai.generateQuiz).toHaveBeenCalledWith(expect.objectContaining({ count: 10, mode: "mixed" }));
  });

  it("shows generation progress and allows cancellation", async () => {
    mocked.ai = aiMock({ busyOperation: "words" });
    render(<AIView />);
    expect(screen.getByText(/正在生成并校验内容/)).toBeTruthy();
    const cancelButtons = screen.getAllByRole("button", { name: /取消/ });
    await userEvent.click(cancelButtons[0]);
    expect(mocked.ai.cancel).toHaveBeenCalled();
  });

  it("renders partial success, validation rejection details and manual save", async () => {
    const word = { ...makeWord("ai-word-1", "AI"), source: "ai-generated" as const };
    mocked.ai = aiMock({ transientResult: { kind: "words", saved: false, payload: { generation: generation(), usage: {}, words: [word], rejectedReasons: ["第 2 项 duplicate：与现有词库重复"] } } });
    render(<AIView />);
    expect(screen.getByText("部分内容通过校验")).toBeTruthy();
    expect(screen.getByText("查看未通过项的原因")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /保存到学习库/ }));
    expect(mocked.ai.saveTransient).toHaveBeenCalled();
  });

  it("edits masked secrets and tests the connection from settings", async () => {
    render(<AISettingsPanel />);
    const secret = screen.getByPlaceholderText("输入代理访问令牌") as HTMLInputElement;
    expect(secret.type).toBe("password");
    await userEvent.type(secret, "proxy-secret");
    await userEvent.click(screen.getByRole("button", { name: "显示密钥" }));
    expect(secret.type).toBe("text");
    await userEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(mocked.ai.setSecret).toHaveBeenCalledWith("proxyToken", "proxy-secret", "session");
    await userEvent.click(screen.getByRole("button", { name: /测试连接/ }));
    expect(mocked.ai.testConnection).toHaveBeenCalled();
  });

  it("displays a cached AI explanation only after the user asks for it", async () => {
    const question = makeQuestion();
    mocked.ai = aiMock({ transientResult: { kind: "explanation", record: {}, content: { whyCorrect: "正确项符合词义。", whyUserChoiceWrong: "你的选项混淆了近义词。", keyPoint: "注意核心动词。", languageDifference: "日英搭配范围不同。", example: "补充例句。", preventionTip: "先看语境再选择。" } } });
    render(<AIExplanationPanel question={question} selectedIndex={0} />);
    expect(screen.queryByText(/正确项符合词义/)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /分析我的错误/ }));
    expect(mocked.ai.explainMistake).toHaveBeenCalledWith(expect.objectContaining({ question, selectedIndex: 0, variant: "simple" }));
    expect(screen.getByText(/正确项符合词义/)).toBeTruthy();
  });

  it("lists AI history and confirms removal from the content library", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const snapshot = { ...makeSnapshot(), aiGenerations: [generation({ saveMode: "saved" })] };
    mocked.learning = learningMock({ snapshot });
    render(<AIView />);
    await userEvent.click(screen.getByRole("tab", { name: /历史记录/ }));
    expect(screen.getByText(/单词生成 · 部分成功/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /移出内容库/ }));
    expect(mocked.learning.undoAIGeneration).toHaveBeenCalledWith("generation-1");
  });
});
