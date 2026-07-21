"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Check,
  CircleAlert,
  Clock3,
  Layers3,
  ListTodo,
  NotebookPen,
  Play,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { dateKey } from "@/lib/learning";
import { calculateDailyPlanProgress } from "@/lib/daily-plan";
import { getNextLearningAction } from "@/lib/learning-flow";
import { useLearning } from "@/context/LearningContext";
import { PageHeader, ProgressBar } from "@/components/ui";

export function HomeView() {
  const { snapshot, allWords, allGrammar, allComparisons, rebuildTodayPlan } = useLearning();
  const today = dateKey(new Date());
  const todayRecord = snapshot.dailyRecords.find((item) => item.date === today);
  const todayPlan = snapshot.dailyPlans.find((item) => item.date === today);
  const planProgress = todayPlan
    ? calculateDailyPlanProgress(todayPlan, todayRecord)
    : {
        total: 0,
        completed: 0,
        remaining: 0,
        percent: 0,
        newCompleted: 0,
        reviewCompleted: 0,
        grammarCompleted: 0,
        testCompleted: 0,
      };
  const mistakeCount = snapshot.mistakes.filter((item) => item.active).length;
  const metrics = [
    { label: "今日进度", value: Math.round(planProgress.percent), suffix: "%", icon: Check, tone: "blue" },
    { label: "已逾期复习", value: todayPlan?.overdueWordIds.length ?? 0, suffix: "个", icon: Clock3, tone: "purple" },
    { label: "活跃错题", value: mistakeCount, suffix: "道", icon: CircleAlert, tone: "amber" },
  ];
  const nextAction = getNextLearningAction(snapshot, today);
  const todayComplete = nextAction.step === "complete" && Boolean(todayPlan);

  return (
    <div className="page-stack home-page">
      <PageHeader
        eyebrow="今日学习"
        title={todayComplete ? "今天的学习已经完成" : "按到期优先级稳步推进"}
        description={todayComplete ? "做得很好。你可以自由学习，或让记忆在下一次到期前休息。" : "计划每天只生成一次；刷新页面不会重复添加任务。"}
        actions={<details className="header-more"><summary>更多</summary><button className="text-button" onClick={() => void rebuildTodayPlan()}><RefreshCw size={17} />按当前设置重算计划</button></details>}
      />

      <section className="metric-grid" aria-label="今日概览">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return <article className="metric-card" key={metric.label}><span className={`metric-icon tone-${metric.tone}`}><Icon size={20} aria-hidden="true" /></span><div><p>{metric.label}</p><strong>{metric.value}<small>{metric.suffix}</small></strong></div></article>;
        })}
      </section>

      <section className="today-layout single-column">
        <article className={`card today-card${todayComplete ? " plan-complete" : ""}`}>
          <div className="card-heading-row">
            <div><span className="section-kicker">DAILY PLAN · {today}</span><h2>{todayComplete ? "今日学习完成" : "今日自动计划"}</h2><p>{todayPlan ? `${todayPlan.studyMode === "combined" ? "日英对照" : todayPlan.studyMode === "japanese" ? "日语" : "英语"}模式 · 以到期复习优先` : "正在生成今日计划"}</p></div>
            <span className="round-badge">{Math.round(planProgress.percent)}%</span>
          </div>
          <ProgressBar value={planProgress.percent} label="今日计划进度" />
          {todayPlan && (
            <div className="task-list">
              <Link className="task-row" href={`/words?review=1&mode=${todayPlan.studyMode}`}><span className="task-icon review"><Layers3 size={20} /></span><div><strong>到期复习</strong><small>其中逾期 {todayPlan.overdueWordIds.length} 个</small></div><span>{todayPlan.reviewWordIds.length} 个</span></Link>
              <Link className="task-row" href={`/words?plan=new&mode=${todayPlan.studyMode}`}><span className="task-icon japanese"><BookOpenText size={20} /></span><div><strong>今日新词</strong><small>已完成 {planProgress.newCompleted}</small></div><span>{todayPlan.newWordIds.length} 个</span></Link>
              <Link className="task-row" href="/grammar?today=1"><span className="task-icon grammar"><NotebookPen size={20} /></span><div><strong>今日语法</strong><small>已完成 {planProgress.grammarCompleted}</small></div><span>{todayPlan.grammarIds.length} 个</span></Link>
              <Link className="task-row" href="/test?source=today&start=1"><span className="task-icon test"><ListTodo size={20} /></span><div><strong>今日测试</strong><small>已完成 {planProgress.testCompleted}</small></div><span>{todayPlan.testTarget} 题</span></Link>
              {mistakeCount > 0 && <Link className="task-row" href="/mistakes?review=1"><span className="task-icon mistake"><CircleAlert size={20} /></span><div><strong>本次错题巩固</strong><small>测试后集中处理</small></div><span>{mistakeCount} 道</span></Link>}
            </div>
          )}
          <div className="next-action-block"><p>{nextAction.description}</p><Link className="button button-primary button-large" href={nextAction.href}><Play size={18} fill="currentColor" />{nextAction.label}<ArrowRight size={18} /></Link></div>
        </article>
      </section>

      <details className="free-study-section card compact-details">
        <summary><span><strong>自由学习与内容工具</strong><small>按需浏览词库、语法、测试或 AI 内容</small></span><ArrowRight size={18} /></summary>
        <div className="free-study-grid">
          <Link href="/words" className="study-entry"><span className="study-entry-icon japanese"><BookOpenText size={22} /></span><div><strong>单词与检索</strong><small>{allWords.length} 组 · 三种学习模式</small></div><ArrowRight size={18} /></Link>
          <Link href="/grammar" className="study-entry"><span className="study-entry-icon grammar"><NotebookPen size={22} /></span><div><strong>语法与对比</strong><small>{allGrammar.length} 个语法 · {allComparisons.length} 组对比</small></div><ArrowRight size={18} /></Link>
          <Link href="/test" className="study-entry"><span className="study-entry-icon test"><CircleAlert size={22} /></span><div><strong>自定义测试</strong><small>语言、来源、难度和反馈方式</small></div><ArrowRight size={18} /></Link>
          <Link href="/ai" className="study-entry"><span className="study-entry-icon grammar"><Sparkles size={22} /></span><div><strong>AI 内容</strong><small>生成并管理词卡、语法和练习题</small></div><ArrowRight size={18} /></Link>
        </div>
      </details>
    </div>
  );
}
