"use client";
/* eslint-disable @next/next/no-img-element */

import { BookOpen, CalendarDays, ChartNoAxesCombined, ChevronRight, Clock3, Flame, ListChecks, Settings } from "lucide-react";
import { useLearning } from "@/context/learning";
import { calculateStreak, dateKey } from "@/lib/learning";
import { mobileHref, modeLabel, navigateTo } from "../navigation";

export function MobileProfileScreen() {
  const { snapshot, settings } = useLearning();
  const today = dateKey(new Date());
  const activeDates = snapshot.dailyRecords.filter((record) => record.wordsStudied + record.grammarStudied + record.questionsAnswered > 0).map((record) => record.date);
  const streak = calculateStreak(activeDates, today);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const record = snapshot.dailyRecords.find((item) => item.date === dateKey(date));
    return { label: "日一二三四五六"[date.getDay()], value: (record?.wordsStudied ?? 0) + (record?.questionsAnswered ?? 0) + (record?.grammarStudied ?? 0) };
  });
  const weekDays = week.filter((item) => item.value > 0).length;
  const totalQuestions = snapshot.dailyRecords.reduce((total, item) => total + item.questionsAnswered, 0);
  const maxWeekValue = Math.max(1, ...week.map((item) => item.value));
  return <main className="m2-page m2-profile-page">
    <header className="m2-topline"><div><p className="m2-brand">PROFILE</p><h1>我的</h1></div><button onClick={() => navigateTo(mobileHref("/settings", { mobile: "settings" }))} type="button">设置</button></header>
    <button className="m2-profile-card" onClick={() => navigateTo(mobileHref("/settings", { mobile: "settings" }))} type="button"><img src="/mobile-art/profile-avatar-v2.jpg" alt="学习者头像" /><div><b>LinguaStep 学习者</b><span>{streak > 0 ? `连续学习 ${streak} 天` : "开始记录你的学习节奏"}</span>{streak > 0 && <em><Flame size={14} fill="currentColor" />坚持中</em>}</div><ChevronRight size={21} /></button>
    <section><div className="m2-section-title"><h2>学习概览</h2><button onClick={() => navigateTo(mobileHref("/stats", { mobile: "stats" }))} type="button">查看学习记录 <ChevronRight size={16} /></button></div><article className="m2-overview-card"><div className="m2-overview-metrics"><span><CalendarDays size={17} /><small>本周学习</small><b>{weekDays} <i>天</i></b></span><span><BookOpen size={17} /><small>已学词汇</small><b>{snapshot.wordProgress.length} <i>个</i></b></span><span><ListChecks size={17} /><small>完成题目</small><b>{totalQuestions} <i>题</i></b></span></div><div className="m2-line-chart">{week.map((item, index) => <i className={index === 6 ? "active" : ""} key={`${item.label}-${index}`} style={{ height: `${item.value === 0 ? 0 : item.value / maxWeekValue * 100}%` }} />)}</div><div className="m2-chart-labels">{week.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}</div></article></section>
    <section><div className="m2-section-title"><h2>我的目标</h2><button onClick={() => navigateTo(mobileHref("/settings", { mobile: "settings" }))} type="button">调整目标 <ChevronRight size={16} /></button></div><article className="m2-goal-card"><div className="m2-goal-mark">{settings.defaultStudyMode === "english" ? "En" : settings.defaultStudyMode === "japanese" ? "日" : "日英"}</div><div><b>{modeLabel(settings.defaultStudyMode)}</b><small>每日 {settings.dailyNewWords} 个新词</small><div className="m2-goal-progress"><span style={{ width: `${Math.min(100, weekDays / 7 * 100)}%` }} /></div><p>本周完成 {weekDays} / 7 天</p></div></article></section>
    <section><div className="m2-section-title"><h2>偏好与管理</h2></div><div className="m2-profile-menu"><button onClick={() => navigateTo(mobileHref("/settings", { mobile: "settings" }))} type="button"><Settings size={19} />学习设置<ChevronRight size={18} /></button><button onClick={() => navigateTo(mobileHref("/stats", { mobile: "stats" }))} type="button"><ChartNoAxesCombined size={19} />学习统计<ChevronRight size={18} /></button><button onClick={() => navigateTo(mobileHref("/favorites", { mobile: "favorites" }))} type="button"><Clock3 size={19} />我的收藏<ChevronRight size={18} /></button></div></section>
  </main>;
}
