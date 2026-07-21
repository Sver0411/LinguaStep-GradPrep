// @vitest-environment jsdom

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_AI_SETTINGS, DEFAULT_SETTINGS } from "../lib/constants";
import { WORD_PAIRS } from "../data/words";
import { GRAMMAR_POINTS } from "../data/grammar";
import { GRAMMAR_COMPARISONS } from "../data/grammar-comparisons";
import {
  makeDailyPlan,
  makeGrammar,
  makeSnapshot,
  makeTestResult,
  makeWord,
  makeWordProgress,
} from "./fixtures";
import { dateKey } from "../lib/learning";
import { WordStudySession } from "../components/words/WordStudySession";
import { HomeView } from "../components/views/HomeView";
import { WordsView } from "../components/views/WordsView";
import { GrammarView } from "../components/views/GrammarView";
import { TestView } from "../components/views/TestView";
import { MistakesView } from "../components/views/MistakesView";
import { SettingsView } from "../components/views/SettingsView";

const mocked = vi.hoisted(() => ({
  learning: {} as ReturnType<typeof learningMock>,
  ai: {} as ReturnType<typeof aiMock>,
}));

vi.mock("@/context/LearningContext", () => ({
  useLearning: () => mocked.learning,
}));

vi.mock("@/context/AIContext", () => ({
  useAI: () => mocked.ai,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function aiMock(overrides: Record<string, unknown> = {}) {
  return {
    settings: DEFAULT_AI_SETTINGS,
    health: null,
    online: true,
    busyOperation: null,
    error: null,
    transientResult: null,
    usageSummary: { todayRequests: 0, monthRequests: 0, todayTokens: 0, monthTokens: 0, successRate: 0, averageDurationMs: 0 },
    updateSettings: vi.fn(),
    setSecret: vi.fn(),
    clearSecret: vi.fn(),
    getSecretStatus: vi.fn().mockReturnValue({ configured: false, masked: "未设置" }),
    testConnection: vi.fn().mockResolvedValue(undefined),
    generateWords: vi.fn().mockResolvedValue(null),
    generateGrammar: vi.fn().mockResolvedValue(null),
    generateQuiz: vi.fn().mockResolvedValue(null),
    explainMistake: vi.fn().mockResolvedValue(null),
    saveTransient: vi.fn().mockResolvedValue(undefined),
    saveQuizCollection: vi.fn().mockResolvedValue(null),
    undoLastSave: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
    resetAISettings: vi.fn(),
    clearAllSecrets: vi.fn(),
    ...overrides,
  };
}

function learningMock(overrides: Record<string, unknown> = {}) {
  return {
    snapshot: makeSnapshot(),
    allWords: WORD_PAIRS,
    allGrammar: GRAMMAR_POINTS,
    allComparisons: GRAMMAR_COMPARISONS,
    settings: DEFAULT_SETTINGS,
    ready: true,
    storageDegraded: false,
    focusMode: false,
    setFocusMode: vi.fn(),
    studyWord: vi.fn().mockResolvedValue(undefined),
    completeGrammar: vi.fn().mockResolvedValue(undefined),
    completeTest: vi.fn().mockImplementation(async (answers: Array<{ isCorrect: boolean }>) => ({
      ...makeTestResult(),
      answers,
      correctCount: answers.filter((answer: { isCorrect: boolean }) => answer.isCorrect)
        .length,
    })),
    answerMistake: vi.fn().mockResolvedValue(null),
    setMistakeState: vi.fn().mockResolvedValue(undefined),
    removeMistake: vi.fn().mockResolvedValue(undefined),
    toggleMistakeFavorite: vi.fn().mockResolvedValue(undefined),
    toggleFavorite: vi.fn().mockResolvedValue(undefined),
    removeFavorites: vi.fn().mockResolvedValue(undefined),
    isFavorite: vi.fn().mockReturnValue(false),
    updateSettings: vi.fn(),
    rebuildTodayPlan: vi.fn().mockResolvedValue(makeSnapshot().dailyPlans[0]),
    saveAIArtifacts: vi.fn().mockResolvedValue(undefined),
    removeAIContent: vi.fn().mockResolvedValue(undefined),
    undoAIGeneration: vi.fn().mockResolvedValue(undefined),
    removeAIGeneration: vi.fn().mockResolvedValue(undefined),
    clearAIData: vi.fn().mockResolvedValue(undefined),
    resetData: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("phase-two components", () => {
  mocked.ai = aiMock();
  it("reveals and rates a word in the selected independent mode", async () => {
    mocked.learning = learningMock();
    const word = makeWord("word-component", "组件");
    render(
      <WordStudySession
        items={[word]}
        mode="japanese"
        onFinish={vi.fn()}
        onRestart={vi.fn()}
        onReviewWeak={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /揭示答案/ }));
    expect(screen.getByText(word.japanese.term)).toBeTruthy();
    expect(screen.queryByText(word.english.term)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /^认识/ }));
    await waitFor(() =>
      expect(mocked.learning.studyWord).toHaveBeenCalledWith(
        word.id,
        "known",
        "japanese",
      ),
    );
  });

  it("renders the persisted daily plan and recommended next step", () => {
    const snapshot = makeSnapshot();
    mocked.learning = learningMock({
      snapshot: {
        ...snapshot,
        dailyRecords: [],
        dailyPlans: [makeDailyPlan(dateKey(new Date()))],
      },
    });
    render(<HomeView />);
    expect(screen.getByText("今日自动计划")).toBeTruthy();
    expect(screen.getByText("到期复习")).toBeTruthy();
    expect(screen.getByRole("link", { name: /继续：今日新词/ })).toBeTruthy();
  });

  it("debounces word search and shows a clear empty state", async () => {
    mocked.learning = learningMock({ snapshot: { ...makeSnapshot(), wordProgress: [] } });
    render(<WordsView />);
    await userEvent.click(screen.getByRole("button", { name: "浏览词库" }));
    const input = screen.getByLabelText("搜索单词");
    await userEvent.type(input, "绝对不存在的词条");
    await waitFor(
      () => expect(screen.getByText("没有符合条件的单词")).toBeTruthy(),
      { timeout: 1000 },
    );
  });

  it("generates ten deduplicated words from the word library and starts studying them", async () => {
    const generated = { ...makeWord("ai-inline-word", "AI新增"), source: "ai-generated" as const };
    mocked.ai = aiMock({ generateWords: vi.fn().mockResolvedValue({ words: [generated] }) });
    mocked.learning = learningMock();
    render(<WordsView />);
    await userEvent.click(screen.getByRole("button", { name: /AI 新增 10 组并学习/ }));
    expect(mocked.ai.generateWords).toHaveBeenCalledWith(expect.objectContaining({ count: 10 }));
    await waitFor(() => expect(screen.getByRole("button", { name: /揭示答案/ })).toBeTruthy());
  });

  it("generates grammar inline using the current grammar mode", async () => {
    const generated = { ...makeGrammar("ai-inline-grammar"), source: "ai-generated" as const };
    mocked.ai = aiMock({ generateGrammar: vi.fn().mockResolvedValue({ grammar: [generated] }) });
    mocked.learning = learningMock({ allGrammar: [...GRAMMAR_POINTS, generated] });
    render(<GrammarView />);
    await userEvent.click(screen.getByRole("button", { name: /AI 新增 1 项/ }));
    expect(mocked.ai.generateGrammar).toHaveBeenCalledWith(expect.objectContaining({ count: 1, language: "japanese" }));
  });

  it("completes a one-question test and renders the result breakdown", async () => {
    const snapshot = makeSnapshot();
    snapshot.grammarProgress = [];
    snapshot.wordProgress = [makeWordProgress("word-001")];
    mocked.learning = learningMock({ snapshot });
    const { container } = render(<TestView />);
    const customCount = screen.getByLabelText("自定义测试题数");
    fireEvent.change(customCount, { target: { value: "1" } });
    await userEvent.click(screen.getByRole("button", { name: /开始测试/ }));
    const option = container.querySelector<HTMLButtonElement>(".quiz-option");
    expect(option).not.toBeNull();
    await userEvent.click(option!);
    await userEvent.click(screen.getByRole("button", { name: /提交测试/ }));
    await waitFor(() => expect(screen.getByText("逐题解析")).toBeTruthy());
    expect(mocked.learning.completeTest).toHaveBeenCalled();
  });

  it("invokes manual mistake-state actions", async () => {
    mocked.learning = learningMock();
    render(<MistakesView />);
    await userEvent.click(screen.getByRole("button", { name: /标记掌握/ }));
    expect(mocked.learning.setMistakeState).toHaveBeenCalledWith(
      makeSnapshot().mistakes[0].id,
      "mastered",
    );
  });

  it("saves settings and confirms a scoped reset", async () => {
    mocked.learning = learningMock();
    render(<SettingsView />);
    await userEvent.click(screen.getByRole("button", { name: "只学英语" }));
    expect(mocked.learning.updateSettings).toHaveBeenCalledWith({
      defaultStudyMode: "english",
    });
    await userEvent.click(screen.getByRole("button", { name: /清空测试记录/ }));
    await userEvent.click(
      screen.getByRole("checkbox", { name: /我已了解影响/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "确认清空测试" }),
    );
    await waitFor(() =>
      expect(mocked.learning.resetData).toHaveBeenCalledWith("tests"),
    );
  });
});
