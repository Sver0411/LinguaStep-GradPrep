"use client";
import { useState } from "react";
import { useLearning } from "@/context/learning";
import { GOAL_LABELS, STUDY_GOALS } from "@/lib/study-goals";
export function LearningGoalSettings() {
  const { settings, updateSettings, rebuildTodayPlan } = useLearning();
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  return <section className="card m3-card goal-settings"><h2>学习目标与时间</h2><label>主要学习目标<select value={settings.primaryGoal ?? "general"} onChange={(event) => {
    const goal = event.target.value;
    updateSettings({ primaryGoal: goal, ...(goal === "general" ? {} : /^N/.test(goal) ? { defaultStudyMode: "japanese", studyJapaneseLevel: `JLPT ${goal}`, studyEnglishLevel: "all" } : { defaultStudyMode: "english", studyEnglishLevel: goal, studyJapaneseLevel: "all" }) });
  }}>{STUDY_GOALS.map((goal) => <option key={goal} value={goal}>{GOAL_LABELS[goal]}</option>)}</select></label>
  <label>每日时间预算<select value={settings.dailyMinutes ?? 0} onChange={(event) => updateSettings({ dailyMinutes: Number(event.target.value) })}><option value={0}>按任务数量</option>{[10, 20, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} 分钟</option>)}</select></label>
  <label>目标考试日期（可选）<input type="date" value={settings.targetExamDate ?? ""} onChange={(event) => updateSettings({ targetExamDate: event.target.value })} /></label>
  <p>新计划按目标筛选内容；预计用时会根据最近的学习记录调整，供安排每天的学习量参考。</p>
  <button type="button" className="button button-secondary" disabled={busy} onClick={async () => { setBusy(true); try { await rebuildTodayPlan(); setMessage("今日计划已按最新设置重算，已完成记录保留。"); } catch { setMessage("重算失败，请重试。"); } finally { setBusy(false); } }}>{busy ? "调整中…" : "应用到今日计划"}</button>
  {message && <p role="status">{message}</p>}
  </section>;
}
