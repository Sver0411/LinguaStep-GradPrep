"use client";

import { SlidersHorizontal } from "lucide-react";
import { useLearning } from "@/context/learning";
import { navigateTo } from "../navigation";
import { MobileSubHeader } from "../ui/MobileSubHeader";

export function MobileSettings() {
  const { settings, updateSettings } = useLearning();
  return <main className="m3-page"><MobileSubHeader detail="SETTINGS" onBack={() => navigateTo("/profile")} title="学习设置" /><section className="m3-card"><div className="m3-section-heading"><h2>默认学习语言</h2></div><div className="m3-segments"><button className={settings.defaultStudyMode === "japanese" ? "active" : ""} onClick={() => updateSettings({ defaultStudyMode: "japanese" })} type="button">日语</button><button className={settings.defaultStudyMode === "english" ? "active" : ""} onClick={() => updateSettings({ defaultStudyMode: "english" })} type="button">英语</button><button className={settings.defaultStudyMode === "combined" ? "active" : ""} onClick={() => updateSettings({ defaultStudyMode: "combined" })} type="button">日英</button></div></section><section className="m3-card"><div className="m3-section-heading"><h2>每日新词</h2><span>{settings.dailyNewWords} 个</span></div><div className="m3-chip-row">{[10, 20, 30].map((count) => <button className={settings.dailyNewWords === count ? "active" : ""} key={count} onClick={() => updateSettings({ dailyNewWords: count })} type="button">{count} 个</button>)}</div></section><section className="m3-card"><div className="m3-section-heading"><h2>每日练习</h2><span>{settings.dailyTestQuestions} 题</span></div><div className="m3-chip-row">{[10, 20, 30, 50].map((count) => <button className={settings.dailyTestQuestions === count ? "active" : ""} key={count} onClick={() => updateSettings({ dailyTestQuestions: count })} type="button">{count} 题</button>)}</div></section><section className="m3-card m3-setting-note"><SlidersHorizontal size={20} /><div><b>设置会在生成下一份学习计划时生效</b><p>今天已生成的学习任务不会重复或遗漏。</p></div></section></main>;
}
