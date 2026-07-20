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
import { TestView } from "../components/views/TestView";
import { MistakesView } from "../components/views/MistakesView";
import { SettingsView } from "../components/views/SettingsView";

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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function learningMock(overrides: Record<string, unknown> = {}) {
  return {
    snapshot: makeSnapshot(),
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
    resetData: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("phase-two components", () => {
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
    expect(screen.getByRole("link", { name: /开始今日新单词/ })).toBeTruthy();
  });

  it("debounces word search and shows a clear empty state", async () => {
    mocked.learning = learningMock({ snapshot: { ...makeSnapshot(), wordProgress: [] } });
    render(<WordsView />);
    const input = screen.getByLabelText("搜索单词");
    await userEvent.type(input, "绝对不存在的词条");
    await waitFor(
      () => expect(screen.getByText("没有符合条件的单词")).toBeTruthy(),
      { timeout: 1000 },
    );
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
