// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, renderHook, act } from "@testing-library/react";
import { DEFAULT_SETTINGS, EMPTY_SNAPSHOT } from "../lib/constants";
import { WORD_PAIRS } from "../data/words";
import { MobileWordStudy } from "../components/mobile/screens/WordStudyScreen";
import { WordStudySession } from "../components/words/WordStudySession";
import { TrainingQuestionInput } from "../components/TrainingQuestionInput";
import { buildTrainingItems } from "../lib/training";
import { BackupPanel } from "../components/settings/BackupPanel";
import { useWordActions } from "../context/learning/actions/use-word-actions";
import { BOOK_VOCAB_WORDS } from "../data/book-vocab-data";
import { makeSnapshot, makeWord } from "./fixtures";
import { revealWordAudio } from "../lib/word-reveal";
import type { LearningSnapshot } from "../lib/models";
const mocked = vi.hoisted(() => ({ learning: {} as Record<string, unknown>, sequence: vi.fn().mockResolvedValue({ ok: true }), preload: vi.fn(), supported: false }));
vi.mock("@/context/learning", () => ({ useLearning: () => mocked.learning }));
vi.mock("@/lib/speech", () => ({ preload: mocked.preload, stopSpeech: vi.fn(), isSpeechSupported: () => mocked.supported, speakSequence: mocked.sequence, speak: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); mocked.supported = false; });
describe("usage flows", () => {
  for (const mode of ["japanese", "english"] as const) it(`hides ${mode} answer until reveal and reads the word, example and their Chinese meanings`, async () => {
    const word = makeWord("test-word", "计划");
    mocked.learning = { allWords: [word, ...WORD_PAIRS], snapshot: { ...makeSnapshot(), dailyPlans: [], wordProgress: [] }, settings: { ...DEFAULT_SETTINGS, autoSpeak: true }, studyWord: vi.fn(), answerWordQuiz: vi.fn().mockResolvedValue(undefined), setFocusMode: vi.fn(), isFavorite: () => false, toggleFavorite: vi.fn(), markWordKnown: vi.fn() };
    render(<MobileWordStudy params={new URLSearchParams(`mode=${mode}&word=${word.id}`)} />);
    expect(screen.queryByText(word[mode].term)).toBeNull();
    expect(screen.queryByText(word[mode].example)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /揭示答案/ }));
    expect(screen.getByText(word[mode].term)).toBeTruthy();
    expect(screen.getByText(word[mode].example)).toBeTruthy();
    expect(screen.getByText(word[mode].exampleZh)).toBeTruthy();
    expect(mocked.sequence).toHaveBeenCalledWith([
      { text: word[mode].term, language: mode === "japanese" ? "ja-JP" : "en-US" },
      { text: word.meaningZh, language: "zh-CN" },
      { text: word[mode].example, language: mode === "japanese" ? "ja-JP" : "en-US" },
      { text: word[mode].exampleZh, language: "zh-CN" },
    ]);
    expect(screen.queryByRole("button", { name: /^认识$/ })).toBeNull();
    expect(screen.getByRole("button", { name: /开始练习这 1 组/ })).toBeTruthy();
  });
  for (const first of ["japanese", "english"] as const) it(`reads examples for both languages while keeping word-meaning Chinese only after the first ${first} reveal`, () => {
    const word = makeWord("reveal-word", "计划");
    const second = first === "japanese" ? "english" : "japanese";
    const firstClips = [
      { text: word[first].term, language: first === "japanese" ? "ja-JP" : "en-US" },
      { text: word.meaningZh, language: "zh-CN" },
      { text: word[first].example, language: first === "japanese" ? "ja-JP" : "en-US" },
      { text: word[first].exampleZh, language: "zh-CN" },
    ];
    const secondClips = [
      { text: word[second].term, language: second === "japanese" ? "ja-JP" : "en-US" },
      { text: word[second].example, language: second === "japanese" ? "ja-JP" : "en-US" },
      { text: word[second].exampleZh, language: "zh-CN" },
    ];
    revealWordAudio(word, "combined", 0, 1, first, true);
    expect(mocked.sequence).toHaveBeenLastCalledWith(firstClips);
    revealWordAudio(word, "combined", 1, 2, first, true);
    expect(mocked.sequence).toHaveBeenLastCalledWith(secondClips);
    revealWordAudio(word, "combined", 0, 2, first, true);
    expect(mocked.sequence).toHaveBeenLastCalledWith([...firstClips, ...secondClips]);
  });
  it("replays an example followed by its Chinese translation from the example button", async () => {
    const word = makeWord("replay-word", "计划");
    mocked.supported = true;
    mocked.learning = { allWords: [word, ...WORD_PAIRS], snapshot: { ...makeSnapshot(), wordProgress: [] }, settings: { ...DEFAULT_SETTINGS, autoSpeak: false, displayDensity: "compact" }, answerWordQuiz: vi.fn(), setFocusMode: vi.fn(), isFavorite: () => false, toggleFavorite: vi.fn() };
    render(<WordStudySession items={[word]} mode="japanese" onFinish={vi.fn()} onRestart={vi.fn()} onContinuePlan={vi.fn()} onReviewUnknown={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /揭示答案/ }));
    expect(mocked.sequence).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "朗读日语例句和中文译文" }));
    expect(mocked.sequence).toHaveBeenCalledWith([{ text: word.japanese.example, language: "ja-JP" }, { text: word.japanese.exampleZh, language: "zh-CN" }]);
    await waitFor(() => expect(screen.getByRole("button", { name: "朗读日语例句和中文译文" }).hasAttribute("disabled")).toBe(false));
  });
  it("does not replace a missing sentence translation with the unrelated word definition", () => {
    const word = makeWord("untranslated-word", "计划"); word.japanese.exampleZh = "";
    revealWordAudio(word, "japanese", 0, 1, "japanese", true);
    expect(mocked.sequence).toHaveBeenLastCalledWith([
      { text: word.japanese.term, language: "ja-JP" }, { text: word.meaningZh, language: "zh-CN" }, { text: word.japanese.example, language: "ja-JP" },
    ]);
  });
  for (const surface of ["desktop", "mobile"] as const) it(`reveals before testing and judges the answer without self-ratings on ${surface}`, async () => {
    const word = makeWord("combined-word", "计划");
    const answerWordQuiz = vi.fn().mockResolvedValue(undefined);
    mocked.learning = { allWords: [word, ...WORD_PAIRS], snapshot: { ...makeSnapshot(), dailyPlans: [], wordProgress: [] }, settings: { ...DEFAULT_SETTINGS, revealMode: "together" }, answerWordQuiz, setFocusMode: vi.fn(), isFavorite: () => false, toggleFavorite: vi.fn() };
    render(surface === "mobile" ? <MobileWordStudy params={new URLSearchParams(`mode=combined&word=${word.id}`)} /> : <WordStudySession items={[word]} mode="combined" onFinish={vi.fn()} onRestart={vi.fn()} onContinuePlan={vi.fn()} onReviewUnknown={vi.fn()} />);
    expect(screen.queryByText(word.japanese.term)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /揭示答案/ }));
    expect(answerWordQuiz).not.toHaveBeenCalled();
    for (const label of ["认识", "模糊", "不认识"]) expect(screen.queryByRole("button", { name: label })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /开始练习这 1 组/ }));
    expect(screen.getByRole("heading", { name: word.japanese.term })).toBeTruthy();
    expect(screen.queryByText(word.meaningZh)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`选项 [A-D]：${word.english.term}`) }));
    await waitFor(() => expect(answerWordQuiz).toHaveBeenCalledTimes(1));
    expect(answerWordQuiz).toHaveBeenCalledWith(expect.objectContaining({ sourceId: word.id, wordQuiz: { mode: "combined", direction: "ja-en" } }), expect.any(Number), expect.objectContaining({ elapsedSeconds: expect.any(Number) }));
    expect(screen.getByText("答对了，本轮通过")).toBeTruthy();
  });
  it("keeps dictation as typed recall with replay when reviewing a saved question", () => {
    const item = buildTrainingItems("dictation", "japanese", WORD_PAIRS, [], [])[0];
    expect(item.question.audio).toEqual(item.audio);
    const change = vi.fn();
    render(<TrainingQuestionInput question={item.question} disabled={false} onChange={change} />);
    fireEvent.change(screen.getByLabelText("输入答案"), { target: { value: "wrong answer" } });
    expect(change).toHaveBeenLastCalledWith(1);
    fireEvent.change(screen.getByLabelText("输入答案"), { target: { value: item.expected![0] } });
    expect(change).toHaveBeenLastCalledWith(0);
  });
  for (const surface of ["desktop", "mobile"] as const) it(`carries two failures into three new reveals then tests all five on ${surface}`, async () => {
    const words = Array.from({ length: 8 }, (_, index) => makeWord(`cycle-${index}`, `cycle${index}`));
    const answerWordQuiz = vi.fn().mockResolvedValue(undefined);
    mocked.learning = { allWords: words, snapshot: { ...makeSnapshot(), dailyPlans: [], wordProgress: [] }, settings: { ...DEFAULT_SETTINGS, studyRoundSize: 8, revealMode: "together", autoSpeak: false }, answerWordQuiz, setFocusMode: vi.fn(), isFavorite: () => false, toggleFavorite: vi.fn() };
    render(surface === "mobile" ? <MobileWordStudy params={new URLSearchParams("mode=combined")} /> : <WordStudySession items={words} mode="combined" onFinish={vi.fn()} onRestart={vi.fn()} onContinuePlan={vi.fn()} onReviewUnknown={vi.fn()} />);
    const learn = (start: number, count: number) => {
      for (let index = start; index < start + count; index++) {
        expect(screen.getByRole("heading", { name: words[index].meaningZh })).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: /揭示答案/ }));
        fireEvent.click(screen.getByRole("button", { name: index === start + count - 1 ? /开始练习这 5 组/ : /下一组词/ }));
      }
    };
    learn(0, 5);
    for (let index = 0; index < 5; index++) {
      expect(screen.getByRole("heading", { name: words[index].japanese.term })).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: index < 3 ? new RegExp(`选项 [A-D]：${words[index].english.term}`) : /查看答案（本题计错）/ }));
      await screen.findByText(index < 3 ? "答对了，本轮通过" : "这组保留到下一轮练习");
      fireEvent.click(screen.getByRole("button", { name: index === 4 ? "继续学习" : "下一题" }));
    }
    expect(screen.queryByText(/本轮通过 3 组，待巩固 2 组/)).toBeNull();
    learn(5, 3);
    expect(screen.queryByRole("button", { name: /揭示答案/ })).toBeNull();
    for (let index = 3; index < 8; index++) {
      expect(screen.getByRole("heading", { name: words[index].japanese.term })).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`选项 [A-D]：${words[index].english.term}`) }));
      await screen.findByText("答对了，本轮通过");
      fireEvent.click(screen.getByRole("button", { name: index === 7 ? "继续学习" : "下一题" }));
    }
    expect(screen.getByText(/8 组通过本轮练习/)).toBeTruthy();
    expect(answerWordQuiz).toHaveBeenCalledTimes(10);
  });
  it("persists objective answers, avoids duplicate daily word counts and preserves memory on reload", async () => {
    const word = WORD_PAIRS[0];
    const question = (await import("../lib/word-quiz")).buildWordQuiz(word, WORD_PAIRS, "combined", "ja-en")!;
    const snapshotRef = { current: structuredClone(EMPTY_SNAPSHOT) as LearningSnapshot };
    const settingsRef = { current: DEFAULT_SETTINGS };
    const persistSnapshot = vi.fn(async (next: LearningSnapshot) => { snapshotRef.current = next; });
    const { result } = renderHook(() => useWordActions({ snapshotRef, settingsRef, persistSnapshot }));
    await act(async () => { await result.current.answerWordQuiz(question, -1, { elapsedSeconds: 8 }); });
    expect(snapshotRef.current.wordProgress[0].modes.combined?.quizMemory?.correct).toBe(0);
    expect(snapshotRef.current.mistakes).toHaveLength(1);
    await act(async () => { await result.current.answerWordQuiz(question, question.correctIndex, { elapsedSeconds: 5 }); });
    const review = snapshotRef.current.wordProgress[0].modes.combined!;
    expect(review.quizMemory).toMatchObject({ attempts: 2, correct: 1, spacedCorrectStreak: 0 });
    expect(review.status).not.toBe("mastered");
    expect(snapshotRef.current.testResults).toHaveLength(2);
    expect(snapshotRef.current.mistakes[0].active).toBe(false);
    expect(snapshotRef.current.dailyRecords[0]).toMatchObject({ wordsStudied: 1, newWordsStudied: 1, questionsAnswered: 2, studySeconds: 13 });
    const restored = (await import("../lib/repositories/migrations")).migrateLearningSnapshot(JSON.parse(JSON.stringify(snapshotRef.current)));
    expect(restored.wordProgress[0].modes.combined?.quizMemory).toEqual(review.quizMemory);
  });
  it("requires explicit confirmation before a phone backup replaces data", async () => {
    const importBackup = vi.fn().mockResolvedValue({ ok: true, message: "已恢复" });
    mocked.learning = { settings: DEFAULT_SETTINGS, importBackup, exportBackup: vi.fn(), updateSettings: vi.fn() };
    render(<BackupPanel />);
    const file = { name: "backup.json", text: async () => JSON.stringify({ app: "LinguaStep" }) };
    fireEvent.change(screen.getByLabelText("选择备份文件"), { target: { files: [file] } });
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "确认恢复" })); expect(importBackup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "确认恢复" }));
    await waitFor(() => expect(importBackup).toHaveBeenCalledTimes(1));
  });
  it("imports a book word once, adds it to today's plan, and preserves its subsequent review progress", async () => {
    const snapshotRef = { current: structuredClone(EMPTY_SNAPSHOT) as LearningSnapshot };
    const settingsRef = { current: DEFAULT_SETTINGS };
    const persistSnapshot = vi.fn(async (next: LearningSnapshot) => { snapshotRef.current = next; });
    const { result } = renderHook(() => useWordActions({ snapshotRef, settingsRef, persistSnapshot }));
    let id = "";
    await act(async () => { id = await result.current.addBookWord(BOOK_VOCAB_WORDS[0].id); });
    expect(snapshotRef.current.favorites).toContain(`word:${id}`);
    expect(snapshotRef.current.dailyPlans[0].newWordIds).toContain(id);
    await act(async () => { await result.current.studyWord(id, "known", "japanese"); });
    const progress = snapshotRef.current.wordProgress[0];
    await act(async () => { expect(await result.current.addBookWord(BOOK_VOCAB_WORDS[0].id)).toBe(id); });
    expect(snapshotRef.current.wordProgress[0]).toEqual(progress);
    expect([...WORD_PAIRS, ...snapshotRef.current.aiWords].filter((word) => word.id === id)).toHaveLength(1);
  });
});
