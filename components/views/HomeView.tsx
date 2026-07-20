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
} from "lucide-react";
import { WORD_PAIRS } from "@/data/words";
import { calculateStreak, dateKey, needsWordReview } from "@/lib/learning";
import { useLearning } from "@/context/LearningContext";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { PageHeader, ProgressBar } from "@/components/ui";

export function HomeView() {
  const { snapshot, settings } = useLearning();
  const today = dateKey(new Date());
  const todayRecord = snapshot.dailyRecords.find((item) => item.date === today);
  const todayCompleted =
    (todayRecord?.wordsStudied ?? 0) +
    (todayRecord?.grammarStudied ?? 0) +
    (todayRecord?.questionsAnswered ?? 0);
  const now = useCurrentTime();
  const reviewCount = snapshot.wordProgress.filter(
    (item) => needsWordReview(item, now ?? Number.NEGATIVE_INFINITY),
  ).length;
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
  const unlearnedCount = Math.max(
    0,
    WORD_PAIRS.length - snapshot.wordProgress.length,
  );
  const newWordsCompleted =
    todayRecord?.newWordsStudied ?? todayRecord?.wordsStudied ?? 0;
  const newWordTarget = Math.min(settings.dailyNewWords, unlearnedCount + newWordsCompleted);
  const newWordsRemaining = Math.max(0, newWordTarget - newWordsCompleted);
  const reviewRemaining = reviewCount;
  const grammarRemaining = Math.max(0, 1 - (todayRecord?.grammarStudied ?? 0));
  const testRemaining = Math.max(0, 10 - (todayRecord?.questionsAnswered ?? 0));
  const todayRemaining =
    newWordsRemaining +
    reviewRemaining +
    mistakeCount +
    grammarRemaining +
    testRemaining;
  const goalTotal = Math.max(1, todayCompleted + todayRemaining);
  const goalProgress = Math.min(100, (todayCompleted / goalTotal) * 100);

  const metrics = [
    {
      label: "今日剩余任务",
      value: todayRemaining,
      suffix: "项",
      icon: ListTodo,
      tone: "green",
    },
    {
      label: "今日已完成",
      value: todayCompleted,
      suffix: "项",
      icon: Check,
      tone: "blue",
    },
    {
      label: "待复习单词",
      value: reviewCount,
      suffix: "个",
      icon: Clock3,
      tone: "purple",
    },
    {
      label: "活跃错题",
      value: mistakeCount,
      suffix: "道",
      icon: CircleAlert,
      tone: "amber",
    },
    {
      label: "连续学习",
      value: streak,
      suffix: "天",
      icon: Flame,
      tone: "coral",
    },
  ];

  return (
    <div className="page-stack home-page">
      <PageHeader
        eyebrow="今日学习"
        title="今天也向前走一小步"
        description="先完成一轮日英单词，再用短测验巩固记忆。"
      />

      <section className="metric-grid" aria-label="今日概览">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="metric-card" key={metric.label}>
              <span className={`metric-icon tone-${metric.tone}`}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <div>
                <p>{metric.label}</p>
                <strong>
                  {metric.value}<small>{metric.suffix}</small>
                </strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className="today-layout">
        <article className="card today-card">
          <div className="card-heading-row">
            <div>
              <span className="section-kicker">TODAY&apos;S STEP</span>
              <h2>今日学习阶梯</h2>
              <p>约 25 分钟 · 以单词学习为主</p>
            </div>
            <span className="round-badge">{Math.round(goalProgress)}%</span>
          </div>

          <ProgressBar value={goalProgress} label="今日总进度" />

          <div className="task-list">
            <div className="task-row primary-task">
              <span className="task-icon japanese"><BookOpenText size={20} /></span>
              <div>
                <strong>新单词</strong>
                <small>日英对照学习</small>
              </div>
              <span>{newWordsRemaining} 个</span>
            </div>
            <Link className="task-row" href="/words?review=1">
              <span className="task-icon review"><Layers3 size={20} /></span>
              <div>
                <strong>复习单词</strong>
                <small>优先处理模糊与到期内容</small>
              </div>
              <span>{reviewRemaining} 个</span>
            </Link>
            {mistakeCount > 0 && (
              <Link className="task-row" href="/mistakes">
                <span className="task-icon mistake"><CircleAlert size={20} /></span>
                <div>
                  <strong>错题再练</strong>
                  <small>连续答对 3 次后移出活跃列表</small>
                </div>
                <span>{mistakeCount} 道</span>
              </Link>
            )}
            <div className="task-row">
              <span className="task-icon grammar"><NotebookPen size={20} /></span>
              <div>
                <strong>语法与测试</strong>
                <small>1 个知识点 · 10 道题</small>
              </div>
              <span>约 10 分钟</span>
            </div>
          </div>

          <Link className="button button-primary button-large" href="/words?study=1">
            <Play size={18} fill="currentColor" />
            开始今日学习
            <ArrowRight size={18} />
          </Link>
        </article>

        <aside className="card next-up-card">
          <span className="section-kicker">FOCUS</span>
          <h2>先做最重要的事</h2>
          <p>学习一轮 {settings.studyRoundSize} 个单词，系统会自动保存掌握状态。</p>
          <div className="focus-preview" aria-hidden="true">
            <span>理解 · 掌握</span>
            <strong>把握</strong>
            <div>
              <span className="language-chip jp">把握する</span>
              <span className="language-chip en">grasp</span>
            </div>
          </div>
          <p className="keyboard-note"><kbd>Space</kbd> 揭示答案 · <kbd>1–3</kbd> 记录掌握度</p>
        </aside>
      </section>

      <section className="free-study-section">
        <div className="section-title-row">
          <div>
            <span className="section-kicker">FREE STUDY</span>
            <h2>自由学习</h2>
          </div>
          <p>按自己的节奏选择内容</p>
        </div>
        <div className="free-study-grid">
          <Link href="/words" className="study-entry">
            <span className="study-entry-icon japanese"><BookOpenText size={22} /></span>
            <div><strong>单词卡组</strong><small>100 组日英对应词</small></div>
            <ArrowRight size={18} />
          </Link>
          <Link href="/grammar" className="study-entry">
            <span className="study-entry-icon grammar"><NotebookPen size={22} /></span>
            <div><strong>语法知识点</strong><small>14 个日语 · 6 个英语</small></div>
            <ArrowRight size={18} />
          </Link>
          <Link href="/test" className="study-entry">
            <span className="study-entry-icon test"><CircleAlert size={22} /></span>
            <div><strong>日英混合测试</strong><small>只测试已经学过的内容</small></div>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
