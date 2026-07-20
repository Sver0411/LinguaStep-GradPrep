"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Check,
  CircleAlert,
  Clock3,
  Flame,
  Layers3,
  ListTodo,
  NotebookPen,
  Play,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { dateKey, calculateStreak } from "@/lib/learning";
import { calculateDailyPlanProgress } from "@/lib/daily-plan";
import { useLearning } from "@/context/LearningContext";
import { PageHeader, ProgressBar } from "@/components/ui";

export function HomeView() {
  const { snapshot, settings, rebuildTodayPlan } = useLearning();
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
  const streak = calculateStreak(
    snapshot.dailyRecords
      .filter(
        (item) =>
          item.wordsStudied + item.grammarStudied + item.questionsAnswered > 0,
      )
      .map((item) => item.date),
    today,
  );
  const lastProgress = [...snapshot.wordProgress].sort((left, right) =>
    right.lastStudiedAt.localeCompare(left.lastStudiedAt),
  )[0];
  const lastMode = lastProgress
    ? (Object.entries(lastProgress.modes).sort((left, right) =>
        (right[1]?.lastStudiedAt ?? "").localeCompare(
          left[1]?.lastStudiedAt ?? "",
        ),
      )[0]?.[0] ?? settings.defaultStudyMode)
    : settings.defaultStudyMode;
  const modeLabel =
    lastMode === "japanese"
      ? "只学日语"
      : lastMode === "english"
        ? "只学英语"
        : "日英对照";

  const metrics = [
    { label: "今日计划", value: planProgress.total, suffix: "项", icon: ListTodo, tone: "green" },
    { label: "今日已完成", value: planProgress.completed, suffix: "项", icon: Check, tone: "blue" },
    { label: "已逾期复习", value: todayPlan?.overdueWordIds.length ?? 0, suffix: "个", icon: Clock3, tone: "purple" },
    { label: "活跃错题", value: mistakeCount, suffix: "道", icon: CircleAlert, tone: "amber" },
    { label: "连续学习", value: streak, suffix: "天", icon: Flame, tone: "coral" },
  ];

  const nextAction =
    todayPlan && planProgress.reviewCompleted < todayPlan.reviewWordIds.length
      ? { href: `/words?review=1&mode=${todayPlan.studyMode}`, label: "处理到期复习" }
      : todayPlan && planProgress.newCompleted < todayPlan.newWordIds.length
        ? { href: `/words?plan=new&mode=${todayPlan.studyMode}`, label: "开始今日新单词" }
        : todayPlan && planProgress.grammarCompleted < todayPlan.grammarIds.length
          ? { href: "/grammar", label: "完成今日语法" }
        : mistakeCount > 0
          ? { href: "/mistakes", label: "巩固活跃错题" }
          : { href: "/test?source=today", label: "完成今日测试" };

  return (
    <div className="page-stack home-page">
      <PageHeader
        eyebrow="第二阶段 · 今日学习"
        title={planProgress.percent >= 100 ? "今天的计划已经完成" : "按到期优先级稳步推进"}
        description={planProgress.percent >= 100 ? "做得很好。你可以自由学习，或让记忆在下一次到期前休息。" : "计划每天只生成一次；刷新页面不会重复添加任务。"}
        actions={<button className="button button-secondary" onClick={() => void rebuildTodayPlan()}><RefreshCw size={17} />按当前设置重算</button>}
      />

      <section className="metric-grid" aria-label="今日概览">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return <article className="metric-card" key={metric.label}><span className={`metric-icon tone-${metric.tone}`}><Icon size={20} aria-hidden="true" /></span><div><p>{metric.label}</p><strong>{metric.value}<small>{metric.suffix}</small></strong></div></article>;
        })}
      </section>

      <section className="today-layout">
        <article className={`card today-card${planProgress.percent >= 100 ? " plan-complete" : ""}`}>
          <div className="card-heading-row">
            <div><span className="section-kicker">DAILY PLAN · {today}</span><h2>{planProgress.percent >= 100 ? "计划完成" : "今日自动计划"}</h2><p>{todayPlan ? `${todayPlan.studyMode === "combined" ? "日英对照" : todayPlan.studyMode === "japanese" ? "日语" : "英语"}模式 · 以到期复习优先` : "正在生成今日计划"}</p></div>
            <span className="round-badge">{Math.round(planProgress.percent)}%</span>
          </div>
          <ProgressBar value={planProgress.percent} label="今日计划进度" />
          {todayPlan && (
            <div className="task-list">
              <Link className="task-row primary-task" href={`/words?plan=new&mode=${todayPlan.studyMode}`}><span className="task-icon japanese"><BookOpenText size={20} /></span><div><strong>新单词</strong><small>已完成 {planProgress.newCompleted}</small></div><span>{todayPlan.newWordIds.length} 个</span></Link>
              <Link className="task-row" href={`/words?review=1&mode=${todayPlan.studyMode}`}><span className="task-icon review"><Layers3 size={20} /></span><div><strong>到期复习</strong><small>其中逾期 {todayPlan.overdueWordIds.length} 个</small></div><span>{todayPlan.reviewWordIds.length} 个</span></Link>
              {todayPlan.mistakeIds.length > 0 && <Link className="task-row" href="/mistakes"><span className="task-icon mistake"><CircleAlert size={20} /></span><div><strong>错题巩固</strong><small>按错误次数和最近时间排序</small></div><span>{todayPlan.mistakeIds.length} 道</span></Link>}
              <Link className="task-row" href="/grammar"><span className="task-icon grammar"><NotebookPen size={20} /></span><div><strong>语法学习</strong><small>已完成 {planProgress.grammarCompleted}</small></div><span>{todayPlan.grammarIds.length} 个</span></Link>
              <Link className="task-row" href="/test?source=today"><span className="task-icon test"><ListTodo size={20} /></span><div><strong>综合测试</strong><small>已完成 {planProgress.testCompleted}</small></div><span>{todayPlan.testTarget} 题</span></Link>
            </div>
          )}
          <Link className="button button-primary button-large" href={nextAction.href}><Play size={18} fill="currentColor" />{nextAction.label}<ArrowRight size={18} /></Link>
        </article>

        <aside className="card next-up-card">
          <span className="section-kicker">CONTINUE</span>
          <h2>{lastProgress ? "继续上次学习" : "从默认模式开始"}</h2>
          <p>{lastProgress ? `上次学习的是 ${modeLabel} 模式，记录已保存。` : `默认使用${modeLabel}模式，每轮 ${settings.studyRoundSize} 个。`}</p>
          <div className="focus-preview" aria-hidden="true"><span>独立记忆轨迹</span><strong>{modeLabel}</strong><div><span className="language-chip jp">日语</span><span className="language-chip en">English</span></div></div>
          <Link className="button button-secondary" href={`/words?study=1&mode=${lastMode}`}><RotateCcw size={17} />继续学习</Link>
          <p className="keyboard-note"><kbd>Space</kbd> 揭示 · <kbd>1–3</kbd> 评分 · <kbd>Esc</kbd> 退出专注</p>
        </aside>
      </section>

      <section className="free-study-section">
        <div className="section-title-row"><div><span className="section-kicker">FREE STUDY</span><h2>自由学习</h2></div><p>跳过计划，自行选择模式、数量和范围</p></div>
        <div className="free-study-grid">
          <Link href="/words" className="study-entry"><span className="study-entry-icon japanese"><BookOpenText size={22} /></span><div><strong>单词与检索</strong><small>300 组 · 三种学习模式</small></div><ArrowRight size={18} /></Link>
          <Link href="/grammar" className="study-entry"><span className="study-entry-icon grammar"><NotebookPen size={22} /></span><div><strong>语法与对比</strong><small>50 个语法 · 15 组对比</small></div><ArrowRight size={18} /></Link>
          <Link href="/test" className="study-entry"><span className="study-entry-icon test"><CircleAlert size={22} /></span><div><strong>自定义测试</strong><small>语言、来源、难度和反馈方式</small></div><ArrowRight size={18} /></Link>
        </div>
      </section>
    </div>
  );
}
