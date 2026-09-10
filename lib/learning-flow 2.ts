import { calculateDailyPlanProgress } from "./daily-plan";
import type { LearningSnapshot } from "./models";

export type LearningFlowStep =
  | "review"
  | "new-words"
  | "grammar"
  | "test"
  | "mistakes"
  | "complete";

export interface LearningNextAction {
  step: LearningFlowStep;
  href: string;
  label: string;
  description: string;
}

export function getNextLearningAction(
  snapshot: LearningSnapshot,
  date: string,
): LearningNextAction {
  const plan = snapshot.dailyPlans.find((item) => item.date === date);
  const record = snapshot.dailyRecords.find((item) => item.date === date);
  const activeMistakes = snapshot.mistakes.filter((item) => item.active).length;

  if (!plan) {
    return {
      step: "complete",
      href: "/",
      label: "返回今日首页",
      description: "今日计划正在准备中。",
    };
  }

  const progress = calculateDailyPlanProgress(plan, record);
  if (progress.reviewCompleted < plan.reviewWordIds.length) {
    return {
      step: "review",
      href: `/words?review=1&mode=${plan.studyMode}`,
      label: "继续：到期复习",
      description: `还剩 ${plan.reviewWordIds.length - progress.reviewCompleted} 个到期单词`,
    };
  }
  if (progress.newCompleted < plan.newWordIds.length) {
    return {
      step: "new-words",
      href: `/words?plan=new&mode=${plan.studyMode}`,
      label: "继续：今日新词",
      description: `还剩 ${plan.newWordIds.length - progress.newCompleted} 个新词`,
    };
  }
  if (progress.grammarCompleted < plan.grammarIds.length) {
    return {
      step: "grammar",
      href: "/grammar?today=1",
      label: "继续：今日语法",
      description: `还剩 ${plan.grammarIds.length - progress.grammarCompleted} 个语法点`,
    };
  }
  if (progress.testCompleted < plan.testTarget) {
    return {
      step: "test",
      href: "/test?source=today&start=1",
      label: "继续：今日测试",
      description: `还剩 ${plan.testTarget - progress.testCompleted} 道测试题`,
    };
  }
  if (activeMistakes > 0) {
    return {
      step: "mistakes",
      href: "/mistakes?review=1",
      label: "继续：本次错题巩固",
      description: `${activeMistakes} 道活跃错题待巩固`,
    };
  }
  return {
    step: "complete",
    href: "/",
    label: "今日学习已完成",
    description: "今天的计划与错题巩固均已完成。",
  };
}
