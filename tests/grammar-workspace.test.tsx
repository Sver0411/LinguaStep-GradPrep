// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GrammarWorkspace } from "../components/grammar/GrammarWorkspace";
import { GRAMMAR_POINTS } from "../data/grammar";
import { DEFAULT_SETTINGS } from "../lib/constants";
import { makeSnapshot } from "./fixtures";
const state = vi.hoisted(() => ({ learning: {} as Record<string,unknown> }));
vi.mock("@/context/learning", () => ({useLearning: () => state.learning}));
vi.mock("@/lib/speech", () => ({isSpeechSupported:()=>false,preload:vi.fn(),speak:vi.fn(),speakSequence:vi.fn(),stopSpeech:vi.fn()}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function setup(course = "jp-n5") {
  const learning = { allGrammar:GRAMMAR_POINTS, snapshot:{...makeSnapshot(),grammarProgress:[],dailyPlans:[],dailyRecords:[]},settings:{...DEFAULT_SETTINGS,grammarCourse:course,grammarExerciseCount:2},ready:true,updateSettings:vi.fn(),rebuildTodayPlan:vi.fn(),isFavorite:()=>false,toggleFavorite:vi.fn(),completeGrammar:vi.fn().mockResolvedValue(undefined),setFocusMode:vi.fn() };
  state.learning=learning; return learning;
}
describe("shared grammar workspace", () => {
  for (const mobile of [false,true]) it(`shows a compact course and opens the full catalog on ${mobile ? "mobile" : "desktop"}`, () => {
    const learning=setup(); render(<GrammarWorkspace mobile={mobile} />);
    expect(screen.getByRole("heading",{name:"蓝宝书 N5"})).toBeTruthy();
    expect(screen.queryByRole("region",{name:"语法目录"})).toBeNull();
    expect(screen.getByText("学习设置",{selector:"summary span"}).closest("details")?.open).toBe(false);
    fireEvent.click(screen.getByRole("button",{name:"浏览本册语法"}));
    expect(screen.getAllByRole("button").some((button)=>button.textContent?.includes("名词1＋は＋名词2"))).toBe(true);
    fireEvent.change(screen.getByLabelText("搜索语法"),{target:{value:"绝对不存在"}});
    expect(screen.getByText("没有找到匹配的语法。")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"切换"}));
    fireEvent.click(screen.getByRole("button",{name:/英语语法/}));
    expect(screen.getByRole("heading",{name:"英语语法"})).toBeTruthy();
    expect(learning.updateSettings).toHaveBeenCalledWith({grammarCourse:"en-core"});
    expect(learning.rebuildTodayPlan).toHaveBeenCalled();
  });
  it("reads before recalling original examples and saves the real answers once", async () => {
    const learning=setup();
    const point=GRAMMAR_POINTS.find((point)=>point.book && point.exercises.length >= 2)!;
    render(<GrammarWorkspace params={new URLSearchParams(`id=${point.id}`)} />);
    await screen.findByRole("heading",{name:point.title});
    expect(learning.completeGrammar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:/原句填空/}));
    for (let index=0;index<2;index++) {
      expect(screen.queryByRole("button",{name:"与原句不同"})).toBeNull();
      fireEvent.change(screen.getByLabelText("回忆原句中的表达"),{target:{value:point.exercises[index].acceptedAnswers![0]}});
      fireEvent.click(screen.getByRole("button",{name:"核对答案"}));
      expect(screen.getByText("与原句一致")).toBeTruthy();
      fireEvent.click(screen.getByRole("button",{name:index ? "完成练习" : "下一题"}));
    }
    await screen.findByRole("heading",{name:"练习完成"});
    expect(learning.completeGrammar).toHaveBeenCalledTimes(1);
    expect(learning.completeGrammar).toHaveBeenCalledWith(point.id,expect.arrayContaining([expect.objectContaining({isCorrect:true,typedAnswer:point.exercises[0].acceptedAnswers![0]})]));
    fireEvent.click(screen.getByRole("button",{name:"返回语法"}));
    expect(screen.getByRole("heading",{name:"蓝宝书 N5"})).toBeTruthy();
  });
  it("shows original charts without inventing questions, and retries a failed reading save", async () => {
    const learning=setup(); learning.completeGrammar.mockRejectedValueOnce(new Error("offline"));
    const point=GRAMMAR_POINTS.find((point)=>point.title === "基数词")!;
    render(<GrammarWorkspace mobile params={new URLSearchParams(`id=${point.id}`)} />);
    await screen.findByRole("heading",{name:point.title});
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.queryByRole("button",{name:/原句填空/})).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"完成阅读"}));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button",{name:"完成阅读"}));
    await waitFor(()=>expect(screen.getByRole("heading",{name:"蓝宝书 N5"})).toBeTruthy());
    expect(learning.completeGrammar).toHaveBeenLastCalledWith(point.id,[]);
  });
  it("opens linked N1 lessons on mobile", async () => {
    setup(); const point=GRAMMAR_POINTS.find((point)=>point.level === "JLPT N1")!;
    render(<GrammarWorkspace mobile params={new URLSearchParams(`id=${point.id}&mobile=practice`)} />);
    await screen.findByRole("heading",{name:point.title});
    expect(screen.queryByText("暂无配套练习。")).toBeNull();
  });
  it("keeps language and ordering options inside a persistent settings control", () => {
    const learning=setup();render(<GrammarWorkspace />);
    fireEvent.change(screen.getByLabelText("语法学习顺序"),{target:{value:"random"}});
    expect(learning.updateSettings).toHaveBeenCalledWith({grammarStudyOrder:"random"});
    expect(learning.rebuildTodayPlan).toHaveBeenCalled();
  });
});
