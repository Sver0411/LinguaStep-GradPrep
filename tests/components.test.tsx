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
import { DEFAULT_SETTINGS } from "../lib/constants";
import { WORD_PAIRS } from "../data/words";
import { GRAMMAR_POINTS } from "../data/grammar";
import { GRAMMAR_COMPARISONS } from "../data/grammar-comparisons";
import {
  makeDailyPlan,
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
import { AppShell } from "../components/AppShell";
import { GrammarPractice } from "../components/grammar/GrammarPractice";

const mocked = vi.hoisted(() => ({
  learning: {} as ReturnType<typeof learningMock>,
}));

vi.mock("@/context/LearningContext", () => ({
  useLearning: () => mocked.learning,
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

vi.mock("next/navigation", () => ({
  usePathname: () => "/words",
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

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
  it("exits focus mode from both the top-right button and Escape", async () => {
    const onExitFocus = vi.fn();
    const { rerender } = render(<AppShell focusMode onExitFocus={onExitFocus}><div>练习内容</div></AppShell>);
    await userEvent.click(screen.getByRole("button", { name: /退出专注/ }));
    expect(onExitFocus).toHaveBeenCalledTimes(1);
    rerender(<AppShell focusMode onExitFocus={onExitFocus}><div>练习内容</div></AppShell>);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onExitFocus).toHaveBeenCalledTimes(2);
  });

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

  it("returns from word study through its explicit exit button", async () => {
    mocked.learning = learningMock();
    const onFinish = vi.fn();
    render(
      <WordStudySession
        items={[makeWord("word-exit", "退出")]}
        mode="japanese"
        onFinish={onFinish}
        onRestart={vi.fn()}
        onReviewWeak={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "退出学习" }));
    expect(onFinish).toHaveBeenCalled();
  });

  it("returns from a grammar exercise through its explicit exit button", async () => {
    mocked.learning = learningMock();
    const onClose = vi.fn();
    render(<GrammarPractice point={GRAMMAR_POINTS[0]} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "退出练习" }));
    expect(onClose).toHaveBeenCalled();
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

  it("chooses the study language before showing its matching word difficulty", async () => {
    mocked.learning = learningMock();
    render(<WordsView />);
    expect(screen.queryByText(/AI 新增/)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "日语" }));
    expect(screen.getByRole("combobox", { name: "2. 日语难度" })).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "2. 英语难度" })).toBeNull();
    expect(screen.queryByText("仅收藏")).toBeNull();
    expect(screen.queryByText("仅错词")).toBeNull();
    expect(screen.queryByText("仅到期")).toBeNull();
  });

  it("keeps grammar search focused on difficulty and mastery", () => {
    mocked.learning = learningMock();
    render(<GrammarView />);
    expect(screen.queryByText(/AI 新增/)).toBeNull();
    expect(screen.queryByText("仅收藏")).toBeNull();
    expect(screen.queryByText("仅错题")).toBeNull();
    expect(screen.queryByText("仅到期")).toBeNull();
  });

  it("completes a Japanese exam section and renders the result breakdown", async () => {
    const snapshot = makeSnapshot();
    snapshot.grammarProgress = [];
    snapshot.wordProgress = [makeWordProgress("word-001")];
    mocked.learning = learningMock({ snapshot });
    const { container } = render(<TestView />);
    await userEvent.click(screen.getByRole("button", { name: "开始测试" }));
    for (let questionIndex = 0; questionIndex < 120; questionIndex += 1) {
      const option = container.querySelector<HTMLButtonElement>(".quiz-option");
      expect(option).not.toBeNull();
      await userEvent.click(option!);
      await userEvent.click(screen.getByRole("button", { name: questionIndex === 119 ? /提交测试/ : /下一题/ }));
    }
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
    await userEvent.click(screen.getByRole("button", { name: "英语" }));
    expect(mocked.learning.updateSettings).toHaveBeenCalledWith({
      defaultStudyMode: "english",
    });
    await userEvent.click(screen.getByRole("switch", { name: "学习专注模式" }));
    expect(mocked.learning.updateSettings).toHaveBeenCalledWith({
      focusModeEnabled: true,
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
