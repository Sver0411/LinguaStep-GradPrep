"use client";

import {
  BarChart3,
  BookOpenText,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Flame,
  NotebookPen,
  Target,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { WORD_PAIRS } from "@/data/words";
import { GRAMMAR_POINTS } from "@/data/grammar";
import { useLearning } from "@/context/LearningContext";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { dateKey } from "@/lib/learning";
import {
  buildOverview,
  buildTrend,
  grammarMasteryDistribution,
  wordMasteryDistribution,
} from "@/lib/statistics";
import type { StudyMode } from "@/lib/models";
import { PageHeader } from "@/components/ui";
import { DistributionChart, TrendChart } from "@/components/stats/TrendChart";

export function StatsView() {
  const { snapshot } = useLearning();
  const now = useCurrentTime();
  const [range, setRange] = useState<7 | 30>(7);
  const [mode, setMode] = useState<StudyMode>("combined");
  const today = dateKey(new Date());
  const nowTimestamp = now ?? Number.NEGATIVE_INFINITY;
  const overview = useMemo(
    () => buildOverview(snapshot, today, nowTimestamp),
    [nowTimestamp, snapshot, today],
  );
  const trend = useMemo(
    () => buildTrend(snapshot.dailyRecords, today, range),
    [range, snapshot.dailyRecords, today],
  );
  const wordDistribution = useMemo(
    () =>
      wordMasteryDistribution(
        snapshot.wordProgress,
        WORD_PAIRS.length,
        mode,
        nowTimestamp,
      ),
    [mode, nowTimestamp, snapshot.wordProgress],
  );
  const grammarDistribution = useMemo(
    () =>
      grammarMasteryDistribution(
        snapshot.grammarProgress,
        GRAMMAR_POINTS.length,
        nowTimestamp,
      ),
    [nowTimestamp, snapshot.grammarProgress],
  );

  const metrics = [
    { label:"今日学习", value:overview.today, suffix:"项", icon:Target, tone:"blue" },
    { label:"本周学习", value:overview.week, suffix:"项", icon:BarChart3, tone:"cyan" },
    { label:"累计学习", value:overview.total, suffix:"项", icon:Trophy, tone:"purple" },
    { label:"已学单词", value:overview.learnedWords, suffix:"组", icon:BookOpenText, tone:"purple" },
    { label:"掌握单词", value:overview.masteredWords, suffix:"组", icon:CheckCircle2, tone:"green" },
    { label:"已学语法", value:overview.learnedGrammar, suffix:"个", icon:NotebookPen, tone:"green" },
    { label:"掌握语法", value:overview.masteredGrammar, suffix:"个", icon:CheckCircle2, tone:"cyan" },
    { label:"测试次数", value:overview.tests, suffix:"次", icon:Target, tone:"blue" },
    { label:"总体正确率", value:overview.accuracy, suffix:"%", icon:BarChart3, tone:"blue" },
    { label:"连续学习", value:overview.streak, suffix:"天", icon:Flame, tone:"coral" },
    { label:"最长连续", value:overview.longestStreak, suffix:"天", icon:Trophy, tone:"amber" },
    { label:"待复习", value:overview.due, suffix:"项", icon:Clock3, tone:"purple" },
    { label:"活跃错题", value:overview.mistakes, suffix:"道", icon:CircleAlert, tone:"amber" },
  ];

  return (
    <div className="page-stack stats-page">
      <PageHeader
        eyebrow="第二阶段 · 学习统计"
        title="用趋势看节奏，用分布找下一步"
        description="所有统计都在本机离线计算；没有学习记录时不会填充虚假数据。"
        actions={<div className="segmented-control"><button className={range === 7 ? "active" : ""} onClick={() => setRange(7)}>最近 7 天</button><button className={range === 30 ? "active" : ""} onClick={() => setRange(30)}>最近 30 天</button></div>}
      />

      <section className="stats-metric-grid expanded-metrics">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return <article className="stat-card card" key={metric.label}><span className={`metric-icon tone-${metric.tone}`}><Icon size={20} /></span><span>{metric.label}</span><strong>{metric.value}<small>{metric.suffix}</small></strong></article>;
        })}
      </section>

      <section className="trend-grid">
        <TrendChart points={trend} metric="activity" label={`最近 ${range} 天学习数量`} />
        <TrendChart points={trend} metric="accuracy" label={`最近 ${range} 天正确率`} suffix="%" />
        <TrendChart points={trend} metric="learned-review" label="新学与复习数量" />
        <TrendChart points={trend} metric="languages" label="日语、英语与对照学习" />
      </section>

      <section className="distribution-section">
        <div className="section-title-row"><div><span className="section-kicker">MASTERY DISTRIBUTION</span><h2>掌握分布</h2></div><div className="segmented-control">{(["combined","japanese","english"] as StudyMode[]).map((item) => <button className={mode === item ? "active" : ""} onClick={() => setMode(item)} key={item}>{item === "combined" ? "日英对照" : item === "japanese" ? "日语" : "英语"}</button>)}</div></div>
        <div className="distribution-grid"><DistributionChart title={`单词 · ${mode === "combined" ? "日英对照" : mode === "japanese" ? "日语" : "英语"}`} values={wordDistribution} /><DistributionChart title="语法" values={grammarDistribution} /></div>
      </section>

      {snapshot.testResults.length > 0 && (
        <section className="recent-tests">
          <div className="section-title-row"><div><span className="section-kicker">RECENT TESTS</span><h2>最近测试</h2></div></div>
          <div className="recent-test-list">
            {[...snapshot.testResults].reverse().slice(0, 8).map((result) => {
              const percent = Math.round((result.correctCount / Math.max(1, result.answers.length)) * 100);
              return <article className="recent-test-row card" key={result.id}><span className="result-mini-ring">{percent}</span><div><strong>{result.mode === "mixed" ? "日英混合" : result.mode === "japanese" ? "日语" : "英语"}测试</strong><small>{new Intl.DateTimeFormat("zh-CN", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }).format(new Date(result.completedAt))} · {Math.floor(result.durationSeconds / 60)}分{result.durationSeconds % 60}秒</small></div><span>{result.correctCount} / {result.answers.length} 正确</span></article>;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
