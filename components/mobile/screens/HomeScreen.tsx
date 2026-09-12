"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, CircleAlert, Flame, MessageCircle, NotebookPen, Play } from "lucide-react";
import { useLearning } from "@/context/learning";
import { getNextLearningAction } from "@/lib/learning-flow";
import { calculateDailyPlanProgress } from "@/lib/daily-plan";
import { calculateStreak, dateKey } from "@/lib/learning";
import type { StudyMode, WordPair } from "@/lib/models";
import { mobileHref, mobileHrefForStep, modeLabel, navigateTo } from "../navigation";

export function MobileHomeScreen() {
  const { snapshot, settings, allWords, allGrammar, rebuildTodayPlan } = useLearning();
  const [mode, setMode] = useState<StudyMode>(settings.defaultStudyMode);
  const [rebuilding, setRebuilding] = useState(false);
  const today = dateKey(new Date());
  const plan = snapshot.dailyPlans.find((item) => item.date === today);
  const record = snapshot.dailyRecords.find((item) => item.date === today);
  const progress = plan
    ? calculateDailyPlanProgress(plan, record)
    : { total: 0, completed: 0, percent: 0, reviewCompleted: 0, newCompleted: 0, grammarCompleted: 0, testCompleted: 0 };
  const activityDates = snapshot.dailyRecords
    .filter((item) => item.wordsStudied + item.grammarStudied + item.questionsAnswered > 0)
    .map((item) => item.date);
  const streak = calculateStreak(activityDates, today);
  const wordMap = useMemo(() => new Map(allWords.map((word) => [word.id, word])), [allWords]);
  const grammarMap = useMemo(() => new Map(allGrammar.map((point) => [point.id, point])), [allGrammar]);
  const recentWord = [...snapshot.wordProgress]
    .filter((item) => item.lastStudiedAt)
    .sort((left, right) => right.lastStudiedAt.localeCompare(left.lastStudiedAt))
    .map((item) => wordMap.get(item.wordId))
    .find((item): item is WordPair => Boolean(item));
  const recentGrammar = [...snapshot.grammarProgress]
    .filter((item) => item.lastStudiedAt)
    .sort((left, right) => right.lastStudiedAt.localeCompare(left.lastStudiedAt))
    .map((item) => grammarMap.get(item.grammarId))
    .find((item) => Boolean(item));
  const reviewCount = plan?.reviewWordIds.length ?? 0;
  const newCount = plan?.newWordIds.length ?? settings.dailyNewWords;
  const grammarCount = plan?.grammarIds.length ?? settings.dailyGrammarCount;
  const testCount = plan?.testTarget ?? settings.dailyTestQuestions;
  /**
   * Everything the learner reads is "how much is left", never "how big the plan
   * was". The desktop home already reads that way; a plan total that refuses to
   * move while the bar advances is what makes people stop trusting the numbers.
   */
  const reviewLeft = Math.max(0, reviewCount - progress.reviewCompleted);
  const newLeft = Math.max(0, newCount - progress.newCompleted);
  const nextAction = plan ? getNextLearningAction(snapshot, today) : null;
  const allDone = nextAction?.step === "complete";
  const studyLabel = !plan ? "开始学习" : allDone ? "自由学习" : "继续学习";
  const startStudy = async () => {
    if (!plan) {
      setRebuilding(true);
      try {
        await rebuildTodayPlan();
      } finally {
        setRebuilding(false);
      }
    }
    if (!plan) {
      // A plan was just generated; it starts with new words by construction.
      navigateTo(mobileHref("/words", { mobile: "study", source: "new", mode }));
      return;
    }
    // Follow the plan instead of always assuming "new words" — once today's new
    // words are done this same button should carry on with grammar or a test.
    navigateTo(
      allDone && nextAction
        ? mobileHref("/words", { mobile: "library" })
        : mobileHrefForStep(nextAction ?? getNextLearningAction(snapshot, today), mode),
    );
  };
  // Mirrors the desktop plan, which has four parts. Grammar was missing here, so
  // a finished day could never show as finished on the phone.
  const flow = [
    { label: "复习", complete: reviewCount > 0 && progress.reviewCompleted >= reviewCount },
    { label: "新词", complete: newCount > 0 && progress.newCompleted >= newCount },
    { label: "语法", complete: grammarCount > 0 && progress.grammarCompleted >= grammarCount },
    { label: "测试", complete: testCount > 0 && progress.testCompleted >= testCount },
  ];

  return (
    <main className="m2-page m2-home-page">
      <header className="m2-home-header">
        <div>
          <p className="m2-brand">LINGUASTEP</p>
          <h1>今天想学点什么？</h1>
          <span className="m2-streak"><Flame size={15} fill="currentColor" />{streak > 0 ? `连续学习 ${streak} 天` : "从今天开始学习"}</span>
        </div>
        <img className="m2-header-avatar" src="/mobile-art/profile-avatar-v2.jpg" alt="学习者头像" />
      </header>

      <section className="m2-study-hero" aria-label="今日学习计划">
        <img className="m2-study-hero-art" src="/mobile-art/home-fuji-v2.jpg" alt="富士山与晨光插画" />
        <div className="m2-study-hero-content">
          <div className="m2-card-title"><span>今日学习</span><small>{modeLabel(mode)}</small></div>
          <div className="m2-mode-switch" role="tablist" aria-label="学习语言">
            {(["japanese", "english", "combined"] as StudyMode[]).map((item) => <button className={mode === item ? "active" : ""} key={item} onClick={() => setMode(item)} role="tab" aria-selected={mode === item} type="button">{modeLabel(item)}</button>)}
          </div>
          <div className="m2-study-hero-focus">
            <span>{plan ? "今日计划" : "为你准备的默认计划"}</span>
            <strong>{plan ? `${progress.completed} / ${progress.total}` : `${newCount} 个新词`}</strong>
            <p>{plan ? `还剩 ${Math.max(0, progress.total - progress.completed)} 项任务` : "生成计划后即可开始"}</p>
          </div>
          <div className="m2-progress"><span style={{ width: `${plan ? progress.percent : 0}%` }} /></div>
          <div className="m2-study-summary"><span>待复习<b>{reviewLeft}</b></span><span>新词<b>{newLeft}</b></span><button disabled={rebuilding} onClick={() => void startStudy()} type="button"><Play size={17} fill="currentColor" />{rebuilding ? "准备中…" : studyLabel}<ArrowRight size={17} /></button></div>
        </div>
      </section>

      <section className="m2-rhythm-card">
        <div className="m2-section-title"><h2>今日节奏</h2><span>{flow.filter((item) => item.complete).length} / {flow.length}</span></div>
        <div className="m2-rhythm-steps">{flow.map((item, index) => <div className={item.complete ? "done" : ""} key={item.label}><i>{item.complete ? "✓" : index + 1}</i><small>{item.label}</small></div>)}</div>
      </section>

      <section>
        <div className="m2-section-title"><h2>快速入口</h2></div>
        <div className="m2-quick-grid">
          <button onClick={() => navigateTo(mobileHref("/resources", { mobile: "topic", topic: "kana" }))} type="button"><span className="kana">あ</span><b>五十音</b></button>
          <button onClick={() => navigateTo(mobileHref("/resources", { mobile: "topic", topic: "expressions" }))} type="button"><span className="lavender"><MessageCircle size={25} /></span><b>常用表达</b></button>
          <button onClick={() => navigateTo(mobileHref("/mistakes", { mobile: "list" }))} type="button"><span className="coral"><CircleAlert size={25} /></span><b>错题本</b></button>
          <button onClick={() => navigateTo("/grammar")} type="button"><span className="mint"><NotebookPen size={25} /></span><b>语法练习</b></button>
        </div>
      </section>

      <section className="m2-recent-card">
        <div className="m2-section-title"><h2>最近学习</h2><button onClick={() => navigateTo(mobileHref("/words", { mobile: "library" }))} type="button">查看全部 <ChevronRight size={16} /></button></div>
        {recentWord || recentGrammar ? <div className="m2-recent-list">
          {recentGrammar && <button onClick={() => navigateTo(mobileHref("/grammar", { mobile: "practice", id: recentGrammar.id }))} className="m2-recent-row" type="button"><span className="m2-recent-icon kana">あ</span><div><b>{recentGrammar.title}</b><small>语法</small></div><ChevronRight size={17} /></button>}
          {recentWord && <button onClick={() => navigateTo(mobileHref("/words", { mobile: "study", word: recentWord.id, mode }))} className="m2-recent-row" type="button"><span className="m2-recent-icon mint">En</span><div><b>{mode === "japanese" ? recentWord.japanese.term : recentWord.english.term}</b><small>{recentWord.meaningZh}</small></div><ChevronRight size={17} /></button>}
        </div> : <div className="m2-empty-inline">还没有学习记录，完成第一组学习后会显示在这里。</div>}
      </section>
    </main>
  );
}
