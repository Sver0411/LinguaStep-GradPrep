"use client";

import {
  BarChart3,
  BookOpenText,
  CheckCircle2,
  CircleAlert,
  Flame,
  NotebookPen,
  Target,
} from "lucide-react";
import { WORD_PAIRS } from "@/data/words";
import { GRAMMAR_POINTS } from "@/data/grammar";
import { useLearning } from "@/context/LearningContext";
import { calculateStreak, dateKey } from "@/lib/learning";
import { EmptyState, PageHeader, ProgressBar } from "@/components/ui";

export function StatsView() {
  const { snapshot } = useLearning();
  const today = dateKey(new Date());
  const todayRecord = snapshot.dailyRecords.find((item) => item.date === today);
  const allAnswers = snapshot.testResults.flatMap((result) => result.answers);
  const correctAnswers = allAnswers.filter((answer) => answer.isCorrect).length;
  const accuracy = allAnswers.length > 0 ? Math.round((correctAnswers / allAnswers.length) * 100) : 0;
  const streak = calculateStreak(snapshot.dailyRecords.map((item) => item.date), today);
  const activeMistakes = snapshot.mistakes.filter((item) => item.active).length;
  const learnedWords = snapshot.wordProgress.length;
  const learnedGrammar = snapshot.grammarProgress.length;
  const todayTotal = (todayRecord?.wordsStudied ?? 0) + (todayRecord?.grammarStudied ?? 0) + (todayRecord?.questionsAnswered ?? 0);

  const metrics = [
    { label: "今日学习", value: todayTotal, suffix: "项", icon: Target, tone: "blue" },
    { label: "累计单词", value: learnedWords, suffix: "组", icon: BookOpenText, tone: "purple" },
    { label: "已学语法", value: learnedGrammar, suffix: "个", icon: NotebookPen, tone: "green" },
    { label: "测试次数", value: snapshot.testResults.length, suffix: "次", icon: CheckCircle2, tone: "cyan" },
    { label: "总体正确率", value: accuracy, suffix: "%", icon: BarChart3, tone: "blue" },
    { label: "活跃错题", value: activeMistakes, suffix: "道", icon: CircleAlert, tone: "amber" },
    { label: "连续学习", value: streak, suffix: "天", icon: Flame, tone: "coral" },
  ];

  return (
    <div className="page-stack stats-page">
      <PageHeader
        eyebrow="学习统计"
        title="看见积累，不被数字打扰"
        description="第一阶段只保留最有用的总览；7 天与 30 天趋势将在后续版本加入。"
      />

      <section className="stats-metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="stat-card card" key={metric.label}>
              <span className={`metric-icon tone-${metric.tone}`}><Icon size={20} /></span>
              <span>{metric.label}</span>
              <strong>{metric.value}<small>{metric.suffix}</small></strong>
            </article>
          );
        })}
      </section>

      <section className="stats-detail-grid">
        <article className="card progress-overview-card">
          <div className="card-heading-row"><div><span className="section-kicker">CONTENT PROGRESS</span><h2>内容学习进度</h2></div></div>
          <div className="progress-overview-list">
            <ProgressBar value={(learnedWords / WORD_PAIRS.length) * 100} label={`日英单词 ${learnedWords} / ${WORD_PAIRS.length}`} />
            <ProgressBar value={(learnedGrammar / GRAMMAR_POINTS.length) * 100} label={`语法知识点 ${learnedGrammar} / ${GRAMMAR_POINTS.length}`} />
            <ProgressBar value={accuracy} label={`测试正确率 ${correctAnswers} / ${allAnswers.length}`} />
          </div>
        </article>

        <article className="card today-breakdown-card">
          <div className="card-heading-row"><div><span className="section-kicker">TODAY</span><h2>今日明细</h2></div><span className="date-chip">{today}</span></div>
          <div className="today-breakdown">
            <div><span>单词学习</span><strong>{todayRecord?.wordsStudied ?? 0}</strong></div>
            <div><span>语法学习</span><strong>{todayRecord?.grammarStudied ?? 0}</strong></div>
            <div><span>答题数量</span><strong>{todayRecord?.questionsAnswered ?? 0}</strong></div>
            <div><span>答对数量</span><strong>{todayRecord?.correctAnswers ?? 0}</strong></div>
          </div>
        </article>
      </section>

      {snapshot.testResults.length === 0 ? (
        <EmptyState title="完成一次测试后，这里会更丰富" description="统计数据会随着真实学习逐步积累，不会预先填充虚假的示例成绩。" />
      ) : (
        <section className="recent-tests">
          <div className="section-title-row"><div><span className="section-kicker">RECENT TESTS</span><h2>最近测试</h2></div></div>
          <div className="recent-test-list">
            {[...snapshot.testResults].reverse().slice(0, 5).map((result) => {
              const percent = Math.round((result.correctCount / Math.max(1, result.answers.length)) * 100);
              return <article className="recent-test-row card" key={result.id}><span className="result-mini-ring">{percent}</span><div><strong>日英混合测试</strong><small>{new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(result.completedAt))}</small></div><span>{result.correctCount} / {result.answers.length} 正确</span></article>;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
