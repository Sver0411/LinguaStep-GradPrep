"use client";

import { useLearning } from "@/context/learning";
import { calculateStreak, dateKey } from "@/lib/learning";
import { navigateTo } from "../navigation";
import { MobileSubHeader } from "../ui/MobileSubHeader";

export function MobileStats() {
  const { snapshot } = useLearning();
  const today = dateKey(new Date());
  const history = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const record = snapshot.dailyRecords.find((item) => item.date === dateKey(date));
    return { label: "日一二三四五六"[date.getDay()], value: (record?.wordsStudied ?? 0) + (record?.grammarStudied ?? 0) + (record?.questionsAnswered ?? 0) };
  });
  const max = Math.max(1, ...history.map((item) => item.value));
  const answers = snapshot.testResults.flatMap((item) => item.answers);
  const accuracy = answers.length > 0 ? Math.round(answers.filter((item) => item.isCorrect).length / answers.length * 100) : null;
  const todayRecord = snapshot.dailyRecords.find((item) => item.date === today);
  const activeDates = snapshot.dailyRecords.filter((item) => item.wordsStudied + item.grammarStudied + item.questionsAnswered > 0).map((item) => item.date);
  return <main className="m3-page"><MobileSubHeader detail="STATS" onBack={() => navigateTo("/profile")} title="学习记录" /><section className="m3-metric-grid"><article><small>连续学习</small><b>{calculateStreak(activeDates, today)}<i>天</i></b></article><article><small>已学词汇</small><b>{snapshot.wordProgress.length}<i>个</i></b></article><article><small>完成题目</small><b>{snapshot.dailyRecords.reduce((total, item) => total + item.questionsAnswered, 0)}<i>题</i></b></article></section><section className="m3-card"><div className="m3-section-heading"><h2>最近 7 天</h2><span>学习量</span></div><div className="m3-bar-chart">{history.map((item, index) => <div key={`${item.label}-${index}`}><i className={index === 6 ? "active" : ""} style={{ height: `${item.value === 0 ? 0 : item.value / max * 100}%` }} /><span>{item.label}</span></div>)}</div></section><section className="m3-card m3-stat-list"><div><span>今日学习</span><b>{(todayRecord?.wordsStudied ?? 0) + (todayRecord?.grammarStudied ?? 0)} 项</b></div><div><span>今日答题</span><b>{todayRecord?.questionsAnswered ?? 0} 题</b></div><div><span>历史正确率</span><b>{accuracy === null ? "暂无记录" : `${accuracy}%`}</b></div></section></main>;
}
