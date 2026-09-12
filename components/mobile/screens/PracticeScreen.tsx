"use client";
/* eslint-disable @next/next/no-img-element */

import { CircleAlert, NotebookPen, Play, Timer } from "lucide-react";
import { useLearning } from "@/context/learning";
import { dateKey } from "@/lib/learning";
import { mobileHref, navigateTo } from "../navigation";

export function MobilePracticeScreen() {
  const { snapshot, settings } = useLearning();
  const today = dateKey(new Date());
  const plan = snapshot.dailyPlans.find((item) => item.date === today);
  const record = snapshot.dailyRecords.find((item) => item.date === today);
  const target = plan?.testTarget ?? settings.dailyTestQuestions;
  const answered = Math.min(target, record?.questionsAnswered ?? 0);
  const remaining = Math.max(0, target - answered);
  const percent = target > 0 ? Math.round(answered / target * 100) : 0;
  const answers = snapshot.testResults.flatMap((item) => item.answers);
  const accuracy = answers.length > 0 ? Math.round(answers.filter((item) => item.isCorrect).length / answers.length * 100) : null;
  const mistakes = snapshot.mistakes.filter((item) => item.active).length;
  const quizLang = settings.defaultStudyMode === "english" ? "english" : "japanese";
  const quizLevel = settings.defaultStudyMode === "english" ? "CET-4" : "N3";
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const item = snapshot.dailyRecords.find((recordItem) => recordItem.date === dateKey(date));
    return (item?.questionsAnswered ?? 0) + (item?.wordsStudied ?? 0);
  });
  const maxWeekValue = Math.max(1, ...week);

  return (
    <main className="m2-page m2-practice-page">
      <header className="m2-topline"><div><p className="m2-brand">PRACTICE</p><h1>练习</h1></div><button onClick={() => navigateTo(mobileHref("/stats", { mobile: "stats" }))} type="button"><Timer size={19} />练习记录</button></header>
      <section className="m2-practice-hero">
        <img className="m2-practice-art" src="/mobile-art/practice-clipboard-v2.jpg" alt="练习剪贴板插画" />
        <div className="m2-card-title"><span>今日练习</span><small>{target} 题目标</small></div>
        <div className="m2-practice-count"><span>还剩</span><strong>{remaining}</strong><span>题</span></div>
        <div className="m2-progress"><span style={{ width: `${percent}%` }} /></div>
        <p>{answered} / {target} 已完成</p>
        <button onClick={() => navigateTo(mobileHref("/test", { mobile: "quiz", lang: quizLang, level: quizLevel, section: "characters", count: target }))} type="button"><Play size={17} fill="currentColor" />{remaining > 0 ? "继续练习" : "再练一组"}</button>
      </section>
      <section>
        <div className="m2-section-title"><h2>选择练习</h2></div>
        <div className="m2-practice-options">
          <button onClick={() => navigateTo(mobileHref("/test", { mobile: "setup" }))} type="button"><span className="mint"><Timer size={25} /></span><div><b>快速测验</b><small>{target} 题 · 根据你的计划</small></div><em>开始</em></button>
          <button onClick={() => navigateTo(mobileHref("/mistakes", { mobile: "list" }))} type="button"><span className="lavender"><CircleAlert size={25} /></span><div><b>错题巩固</b><small>{mistakes > 0 ? `${mistakes} 道需要处理` : "暂时没有活跃错题"}</small></div><em className="lavender">去巩固</em></button>
          <button onClick={() => navigateTo("/grammar")} type="button"><span className="coral"><NotebookPen size={25} /></span><div><b>语法即时练习</b><small>根据语法卡片完成小测</small></div><em className="coral">开始</em></button>
        </div>
      </section>
      <section className="m2-performance-card">
        <div><h2>本周表现</h2><b>{accuracy === null ? "暂无答题记录" : `正确率 ${accuracy}%`}</b><small>{accuracy === null ? "完成第一组练习后显示真实正确率" : `累计完成 ${answers.length} 题`}</small></div>
        <div className="m2-bars" aria-label="本周学习量">{week.map((value, index) => <span className={index === 6 ? "active" : ""} key={index} style={{ height: `${value === 0 ? 0 : value / maxWeekValue * 100}%` }} />)}</div>
      </section>
    </main>
  );
}
