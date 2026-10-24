"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Heart } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLearning } from "@/context/learning";
import { SpeakButton } from "@/components/SpeakButton";
import { WordExample } from "./WordExample";
import { dateKey } from "@/lib/learning";
import { getNextLearningAction } from "@/lib/learning-flow";
import type { ReviewState, StudyMode, WordPair } from "@/lib/models";
import { preload, stopSpeech } from "@/lib/speech";
import { revealWordAudio } from "@/lib/word-reveal";
import { buildWordQuiz, fillWordCycle, quizDirection, type WordCycle, type WordQuizQuestion } from "@/lib/word-quiz";

export interface WordStudyProps {
  items: WordPair[];
  mode: StudyMode;
  onFinish: () => void;
  onRestart: () => void;
  onContinuePlan: (href: string) => void;
  onReviewUnknown: (items: WordPair[]) => void;
  mobile?: boolean;
}
interface Cycle extends WordCycle { questions: (WordQuizQuestion | null)[] }
type Stage = "learn" | "quiz" | "complete";

export function WordStudySession(props: WordStudyProps) {
  return <WordLearningRound key={`${props.mode}:${props.items.map((item) => item.id).join("|")}`} {...props} />;
}

function WordLearningRound({ items, mode, onFinish, onRestart, onContinuePlan, mobile = false }: WordStudyProps) {
  const { allWords, snapshot, settings, answerWordQuiz, isFavorite, toggleFavorite, setFocusMode } = useLearning();
  const pool = useMemo(() => [...allWords, ...items.filter((word) => !allWords.some((item) => item.id === word.id))], [allWords, items]);
  const seenIds = useMemo(() => new Set(snapshot.wordProgress.filter((item) => item.modes[mode]).map((item) => item.wordId)), [snapshot.wordProgress, mode]);
  const firstLanguage = useCallback((word: WordPair): "japanese" | "english" => settings.revealOrder === "english-first" ? "english" : settings.revealOrder === "random" ? [...word.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 ? "english" : "japanese" : "japanese", [settings.revealOrder]);
  const createCycle = useCallback((carried: WordPair[], reserve: WordPair[]): Cycle => {
    const next = fillWordCycle(carried, reserve, seenIds);
    return { ...next, questions: next.active.map((word) => buildWordQuiz(word, pool, mode, quizDirection(mode, snapshot.wordProgress.find((item) => item.wordId === word.id)?.modes[mode], firstLanguage(word)))) };
  }, [firstLanguage, mode, pool, seenIds, snapshot.wordProgress]);
  const [cycle, setCycle] = useState<Cycle>(() => createCycle([], items));
  const [stage, setStage] = useState<Stage>(() => !items.length ? "complete" : cycle.fresh.length ? "learn" : "quiz");
  const [round, setRound] = useState(1);
  const [learnIndex, setLearnIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [revealStage, setRevealStage] = useState(0);
  const [selection, setSelection] = useState<number | null>(null);
  const [reviewOutcome, setReviewOutcome] = useState<ReviewState>();
  const [outcomes, setOutcomes] = useState<Record<string, boolean>>({});
  const [passed, setPassed] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const sessionRef = useRef<HTMLElement>(null);
  const questionStarted = useRef(0);
  const learnStarted = useRef(0);
  const learningSeconds = useRef(new Map<string, number>());
  const current = stage === "learn" ? cycle.fresh[learnIndex] : cycle.active[quizIndex];
  const question = cycle.questions[quizIndex];
  const answerVisible = revealStage >= (mode === "combined" ? 2 : 1);
  const nextAction = getNextLearningAction(snapshot, dateKey(new Date()));
  useEffect(() => {
    sessionRef.current?.scrollIntoView?.({ block: "start", behavior: "auto" });
  }, [current?.id, quizIndex, stage]);
  useEffect(() => {
    if (!current) return;
    questionStarted.current = Date.now();
    if (stage === "learn") learnStarted.current = Date.now();
    for (const language of ["japanese", "english"] as const) {
      if (mode !== "combined" && mode !== language) continue;
      const entry = current[language];
      const voice = language === "japanese" ? "ja-JP" : "en-US";
      preload(entry.term, voice);
      if (entry.example.trim()) { preload(entry.example, voice); if (entry.exampleZh.trim()) preload(entry.exampleZh, "zh-CN"); }
    }
    preload(current.meaningZh, "zh-CN");
    return () => stopSpeech();
  }, [current, mode, stage, quizIndex]);
  useEffect(() => () => setFocusMode(false), [setFocusMode]);

  const reveal = useCallback(() => {
    if (stage !== "learn" || !current) return;
    const next = mode !== "combined" ? 1 : settings.revealMode === "together" ? 2 : Math.min(2, revealStage + 1);
    revealWordAudio(current, mode, revealStage, next, firstLanguage(current), settings.autoSpeak);
    setRevealStage(next);
  }, [current, firstLanguage, mode, revealStage, settings.autoSpeak, settings.revealMode, stage]);

  const nextLearn = useCallback(() => {
    if (!current || !answerVisible || stage !== "learn") return;
    learningSeconds.current.set(current.id, Math.min(300, (Date.now() - learnStarted.current) / 1000));
    stopSpeech();
    if (learnIndex + 1 < cycle.fresh.length) { setLearnIndex(learnIndex + 1); setRevealStage(0); }
    else { setStage("quiz"); setQuizIndex(0); }
  }, [answerVisible, current, cycle.fresh.length, learnIndex, stage]);

  const answer = useCallback(async (index: number) => {
    if (!question || !current || stage !== "quiz" || selection !== null || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError("");
    const correct = index === question.correctIndex;
    try {
      const progress = await answerWordQuiz(question, index, { elapsedSeconds: (Date.now() - questionStarted.current) / 1000 + (learningSeconds.current.get(current.id) ?? 0) });
      setReviewOutcome(progress?.modes[mode]);
      learningSeconds.current.delete(current.id);
      setSelection(index); setOutcomes((prior) => ({ ...prior, [current.id]: correct }));
      if (correct) setPassed((prior) => [...new Set([...prior, current.id])]);
      if (settings.autoSpeak) revealWordAudio(current, mode, 0, mode === "combined" ? 2 : 1, question.wordQuiz.direction.startsWith("ja") ? "japanese" : "english", true);
    } catch { setError("保存失败，请重试；本题尚未计入学习记录。"); }
    finally { busyRef.current = false; setBusy(false); }
  }, [answerWordQuiz, current, mode, question, selection, settings.autoSpeak, stage]);

  const advanceCycle = useCallback(() => {
    stopSpeech();
    const failed = cycle.active.filter((word) => outcomes[word.id] === false);
    const next = createCycle(failed, cycle.reserve);
    setCycle(next); setOutcomes({}); setLearnIndex(0); setQuizIndex(0); setRevealStage(0); setSelection(null); setReviewOutcome(undefined); setRound((value) => value + 1);
    setStage(!next.active.length ? "complete" : next.fresh.length ? "learn" : "quiz");
  }, [createCycle, cycle.active, cycle.reserve, outcomes]);
  const nextQuestion = useCallback(() => {
    if (busyRef.current || selection === null) return;
    stopSpeech(); setSelection(null); setReviewOutcome(undefined); setError("");
    if (quizIndex + 1 < cycle.active.length) setQuizIndex(quizIndex + 1);
    else advanceCycle();
  }, [advanceCycle, cycle.active.length, quizIndex, selection]);

  const skipUnavailable = () => {
    if (!current) return;
    setSkipped((prior) => [...new Set([...prior, current.id])]);
    if (quizIndex + 1 < cycle.active.length) setQuizIndex(quizIndex + 1);
    else advanceCycle();
  };
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.matches("input, textarea, select, button, a")) return;
      if (stage === "learn" && event.code === "Space") { event.preventDefault(); if (answerVisible) nextLearn(); else reveal(); }
      else if (stage === "quiz" && /^[1-4]$/.test(event.key)) { event.preventDefault(); void answer(Number(event.key) - 1); }
      else if (stage === "quiz" && event.code === "Space" && selection !== null) { event.preventDefault(); nextQuestion(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [answer, answerVisible, nextLearn, nextQuestion, reveal, selection, stage]);
  const rootClass = mobile ? "m3-page m3-study-session word-cycle-session" : "study-session word-cycle-session";
  const buttonClass = mobile ? "m3-primary" : "button button-primary";

  if (!items.length) return <section ref={sessionRef} className={`${rootClass} card`}><h1>当前没有可学习的单词</h1><p>可以回到词库选择新词，或稍后再查看到期复习。</p><button className={buttonClass} onClick={onFinish}>返回单词页</button></section>;

  if (stage === "complete") return <section ref={sessionRef} className={`${rootClass} session-summary card`}><h1>本轮学习完成</h1><p>{passed.length} 组通过本轮练习{skipped.length ? `，${skipped.length} 组因材料不足暂未测试` : ""}，复习时间已按答题结果安排。</p><p>本轮通过不等于永久掌握，之后会按记忆情况再次复习。</p><div className="summary-actions">{(mobile || nextAction.href.startsWith("/words")) ? <button className={buttonClass} onClick={() => onContinuePlan(nextAction.href)}>{nextAction.label}</button> : <Link className={buttonClass} href={nextAction.href}>{nextAction.label}</Link>}<button className="button button-secondary" onClick={onRestart}>再学一轮</button><button className="button button-secondary" onClick={onFinish}>返回单词页</button></div></section>;

  if (!current) return null;
  const first = firstLanguage(current);
  const japaneseVisible = mode !== "english" && (revealStage >= 2 || revealStage === 1 && (mode === "japanese" || first === "japanese"));
  const englishVisible = mode !== "japanese" && (revealStage >= 2 || revealStage === 1 && (mode === "english" || first === "english"));
  return <section ref={sessionRef} className={rootClass}>
    <div className="session-topline"><span>第 {round} 轮 · {stage === "learn" ? `熟悉新词 ${learnIndex + 1} / ${cycle.fresh.length}` : `对应选择 ${quizIndex + 1} / ${cycle.active.length}`}</span><button className="text-button" onClick={onFinish}><ArrowLeft size={16} />退出学习</button></div>
    <div className="session-progress"><span style={{ width: `${passed.length / Math.max(1, items.length) * 100}%` }} /></div>
    {stage === "learn" ? <>
      <article className="flashcard">
        <button className={`favorite-button floating${isFavorite("word", current.id) ? " active" : ""}`} onClick={() => void toggleFavorite("word", current.id)} aria-label={isFavorite("word", current.id) ? "取消收藏" : "收藏单词"}><Heart size={20} /></button>
        <div className="prompt-side"><h1>{current.meaningZh}</h1><p>想一想：{mode === "combined" ? "日语和英语分别" : mode === "japanese" ? "日语" : "英语"}怎么表达？</p></div>
        {revealStage === 0 && <button className="reveal-area" onClick={reveal}><strong>揭示答案</strong><span>点击或按 Space</span></button>}
        {japaneseVisible && <div className="answer-panel japanese-answer"><div className="answer-heading"><span className="language-label jp">日</span><span>{current.japanese.partOfSpeech} · {current.japanese.difficulty}</span><SpeakButton text={current.japanese.term} language="ja-JP" label="朗读日语" /></div><strong>{current.japanese.term}</strong><span className="reading">{current.japanese.reading}</span><WordExample entry={current.japanese} language="japanese" /></div>}
        {mode === "combined" && revealStage === 1 && <button className="reveal-next-language" onClick={reveal}>揭示{first === "japanese" ? "英语" : "日语"}<ArrowRight size={17} /></button>}
        {englishVisible && <div className="answer-panel english-answer"><div className="answer-heading"><span className="language-label en">英</span><span>{current.english.partOfSpeech} · {current.english.difficulty}</span><SpeakButton text={current.english.term} language="en-US" label="朗读英语" /></div><strong>{current.english.term}</strong><span className="reading">{current.english.phonetic}</span><WordExample entry={current.english} language="english" /></div>}
        {answerVisible && <p className="word-note">{current.note}</p>}
      </article>
      {answerVisible && <button className={buttonClass} onClick={nextLearn}>{learnIndex + 1 === cycle.fresh.length ? `开始练习这 ${cycle.active.length} 组` : "下一组词"}<ArrowRight size={18} /></button>}
    </> : question ? <article className="question-card card word-choice-card">
      <p>{question.wordQuiz.direction.endsWith("en") ? "选择对应的英语" : question.wordQuiz.direction.endsWith("ja") ? "选择对应的日语" : "选择对应的中文意思"}</p>
      <h1>{question.prompt}</h1><SpeakButton text={question.prompt} language={question.wordQuiz.direction.startsWith("ja") ? "ja-JP" : "en-US"} label="朗读题目" />
      <div className="option-list">{question.options.map((option, index) => <button key={option} className={`quiz-option${selection === index ? " selected" : ""}${selection !== null && index === question.correctIndex ? " correct" : ""}${selection === index && index !== question.correctIndex ? " wrong" : ""}`} aria-label={`选项 ${String.fromCharCode(65 + index)}：${option}`} disabled={busy || selection !== null} onClick={() => void answer(index)}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span></button>)}</div>
      {selection === null ? <button className="text-button" disabled={busy} onClick={() => void answer(-1)}>查看答案（本题计错）</button> : <><div className={`answer-explanation ${selection === question.correctIndex ? "correct" : "wrong"}`} role="status"><strong>{selection === question.correctIndex ? "答对了，本轮通过" : "这组保留到下一轮练习"}</strong><p>{current.japanese.term} / {current.english.term} · {current.meaningZh}</p>{mode !== "english" && <WordExample entry={current.japanese} language="japanese" />}{mode !== "japanese" && <WordExample entry={current.english} language="english" />}<p>{selection === question.correctIndex ? "后续复习由 FSRS 按答题历史安排。" : "先继续下一题，下一轮会与新词一起练习。"}</p>{reviewOutcome && <p>下次复习：{new Date(reviewOutcome.nextReviewAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {reviewOutcome.status === "mastered" ? "记忆稳定" : "继续巩固"}</p>}</div><button className={buttonClass} onClick={nextQuestion}>{quizIndex + 1 === cycle.active.length ? "继续学习" : "下一题"}<ArrowRight size={18} /></button></>}
      {busy && <p role="status">正在保存…</p>}{error && <p role="alert">{error}</p>}
    </article> : <article className="card"><h1>这组词暂时无法生成有效选项</h1><p>对应表达或可用干扰项不足；跳过不会计为通过或提高熟练度。</p><button className={buttonClass} onClick={skipUnavailable}>暂不测这组词</button></article>}
  </section>;
}
