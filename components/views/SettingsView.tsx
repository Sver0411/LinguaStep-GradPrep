"use client";

import {
  Check,
  Database,
  Info,
  Laptop,
  Moon,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION } from "@/lib/constants";
import type {
  FontSize,
  RevealOrder,
  StudyMode,
  ThemeMode,
  WeekendAdjustment,
} from "@/lib/models";
import { useLearning, type ResetScope } from "@/context/LearningContext";
import { Button, PageHeader } from "@/components/ui";
import { AISettingsPanel } from "@/components/ai/AISettingsPanel";
import { useAI } from "@/context/AIContext";

const resetCopy: Record<
  ResetScope,
  { title: string; description: string; button: string }
> = {
  progress: {
    title: "重置学习进度？",
    description: "将清除单词、语法、测试、每日记录和每日计划；错题与收藏会保留。",
    button: "确认重置学习进度",
  },
  tests: {
    title: "清空测试记录？",
    description: "将删除所有测试结果；学习进度、错题和收藏不受影响。",
    button: "确认清空测试",
  },
  mistakes: {
    title: "清空错题记录？",
    description: "将删除活跃、巩固、掌握和归档的全部错题历史。",
    button: "确认清空错题",
  },
  favorites: {
    title: "清空全部收藏？",
    description: "将取消单词、语法和日英对比收藏，不会删除内容和学习进度。",
    button: "确认清空收藏",
  },
  all: {
    title: "重置全部数据？",
    description: "将清除全部本地记录、每日计划、错题、收藏和个性化设置。此操作无法撤销。",
    button: "确认重置全部数据",
  },
};

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="setting-row">
      <div><strong>{title}</strong><p>{description}</p></div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

function NumberControl({
  value,
  options,
  min,
  max,
  label,
  onChange,
}: {
  value: number;
  options: number[];
  min: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="number-options">
      {options.map((count) => (
        <button
          className={value === count ? "active" : ""}
          onClick={() => onChange(count)}
          key={count}
        >{count}</button>
      ))}
      <label><span>自定义</span><input aria-label={label} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))} /></label>
    </div>
  );
}

function Switch({ value, label, onChange }: { value: boolean; label: string; onChange: () => void }) {
  return <button className={`switch${value ? " active" : ""}`} role="switch" aria-label={label} aria-checked={value} onClick={onChange}><span /></button>;
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b > 0) [a, b] = [b, a % b];
  return Math.max(1, a);
}

export function SettingsView() {
  const { settings, updateSettings, resetData, rebuildTodayPlan } = useLearning();
  const { resetAISettings, clearAllSecrets } = useAI();
  const [resetScope, setResetScope] = useState<ResetScope | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const confirmCheckboxRef = useRef<HTMLInputElement>(null);
  const resetTriggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLElement>(null);

  const closeReset = () => {
    setResetScope(null);
    setConfirmed(false);
    window.setTimeout(() => resetTriggerRef.current?.focus(), 0);
  };

  const openReset = (scope: ResetScope) => {
    resetTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirmed(false);
    setResetScope(scope);
  };

  useEffect(() => {
    if (!resetScope) return;
    confirmCheckboxRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !resetting) {
        setResetScope(null);
        setConfirmed(false);
        window.setTimeout(() => resetTriggerRef.current?.focus(), 0);
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = [
        ...modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [resetScope, resetting]);

  const runReset = async () => {
    if (!resetScope || !confirmed) return;
    setResetting(true);
    try {
      await resetData(resetScope);
      if (resetScope === "all") {
        resetAISettings();
        clearAllSecrets();
      }
      closeReset();
    } finally {
      setResetting(false);
    }
  };

  const themes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "浅色", icon: Sun },
    { value: "dark", label: "深色", icon: Moon },
    { value: "system", label: "跟随系统", icon: Laptop },
  ];
  const modes: Array<{ value: StudyMode; label: string }> = [
    { value: "combined", label: "日英对照" },
    { value: "japanese", label: "只学日语" },
    { value: "english", label: "只学英语" },
  ];
  const planDivisor = greatestCommonDivisor(
    greatestCommonDivisor(settings.dailyNewWords, settings.dailyGrammarCount),
    settings.dailyTestQuestions,
  );
  const planRatio = [
    settings.dailyNewWords / planDivisor,
    settings.dailyGrammarCount / planDivisor,
    settings.dailyTestQuestions / planDivisor,
  ];

  return (
    <div className="page-stack settings-page">
      <PageHeader eyebrow="第三阶段 · 设置" title="把计划、AI 和显示调成你的节奏" description="学习设置与 AI 非敏感设置保存在当前浏览器；密钥使用独立存储，不进入学习数据库。" actions={<Button variant="secondary" onClick={() => void rebuildTodayPlan()}><RotateCcw size={17} />重算今日计划</Button>} />

      <section className="settings-section card">
        <div className="settings-section-heading"><span className="settings-icon"><SlidersHorizontal size={20} /></span><div><h2>学习与每日计划</h2><p>控制模式、任务数量和复习优先级</p></div></div>
        <SettingRow title="默认学习模式" description="进入单词学习和生成每日计划时优先使用。"><div className="segmented-control">{modes.map((mode) => <button className={settings.defaultStudyMode === mode.value ? "active" : ""} onClick={() => updateSettings({ defaultStudyMode: mode.value })} key={mode.value}>{mode.label}</button>)}</div></SettingRow>
        <SettingRow title="答案揭示" description="单语言模式只揭示对应语言；对照模式可同时或分步。"><div className="segmented-control"><button className={settings.revealMode === "together" ? "active" : ""} onClick={() => updateSettings({ revealMode: "together" })}>同时</button><button className={settings.revealMode === "step-by-step" ? "active" : ""} onClick={() => updateSettings({ revealMode: "step-by-step" })}>分步</button></div></SettingRow>
        <SettingRow title="分步揭示顺序" description="随机顺序按词条稳定分配，避免同一张卡刷新后跳变。"><div className="segmented-control">{([{ value:"japanese-first", label:"日语优先" }, { value:"english-first", label:"英语优先" }, { value:"random", label:"随机" }] as Array<{ value: RevealOrder; label: string }>).map((item) => <button className={settings.revealOrder === item.value ? "active" : ""} onClick={() => updateSettings({ revealOrder: item.value })} key={item.value}>{item.label}</button>)}</div></SettingRow>
        <SettingRow title="每日新单词" description="支持 10、20、30 或自定义。"><NumberControl value={settings.dailyNewWords} options={[10,20,30]} min={1} max={100} label="每日新单词" onChange={(value) => updateSettings({ dailyNewWords:value })} /></SettingRow>
        <SettingRow title="每日复习上限" description="到期内容优先安排，超出上限的项目保留到后续。"><NumberControl value={settings.dailyReviewLimit} options={[30,50,80]} min={1} max={300} label="每日复习上限" onChange={(value) => updateSettings({ dailyReviewLimit:value })} /></SettingRow>
        <SettingRow title="每轮学习数量" description="自由学习和计划学习都会使用这个轮次大小。"><NumberControl value={settings.studyRoundSize} options={[10,20,30]} min={1} max={100} label="每轮单词" onChange={(value) => updateSettings({ studyRoundSize:value })} /></SettingRow>
        <SettingRow title="每日语法数量" description="自动计划优先选择尚未学习的语法。"><NumberControl value={settings.dailyGrammarCount} options={[1,2,3]} min={1} max={10} label="每日语法" onChange={(value) => updateSettings({ dailyGrammarCount:value })} /></SettingRow>
        <SettingRow title="每日测试题数" description="首页计划和测试页默认值。"><NumberControl value={settings.dailyTestQuestions} options={[10,20,30]} min={1} max={100} label="每日测试题数" onChange={(value) => updateSettings({ dailyTestQuestions:value })} /></SettingRow>
        <SettingRow title="单词 / 语法 / 测试比例" description="由上方三个每日目标实时换算；调整任一数量即可改变计划重心。"><div className="ratio-summary" aria-label={`单词、语法、测试比例 ${planRatio.join(" 比 ")}`}><span>单词 <b>{planRatio[0]}</b></span><i>:</i><span>语法 <b>{planRatio[1]}</b></span><i>:</i><span>测试 <b>{planRatio[2]}</b></span></div></SettingRow>
        <SettingRow title="语法练习题数" description="每个语法点最多提供 5 道配套题。"><NumberControl value={settings.grammarExerciseCount} options={[3,5]} min={1} max={5} label="语法练习题数" onChange={(value) => updateSettings({ grammarExerciseCount:value })} /></SettingRow>
        <SettingRow title="错题优先" description="开启后每日计划会列出全部活跃错题。"><Switch value={settings.prioritizeMistakes} label="错题优先" onChange={() => updateSettings({ prioritizeMistakes:!settings.prioritizeMistakes })} /></SettingRow>
        <SettingRow title="自动补足计划" description="优先接续过去计划中仍未完成的新词和语法，再用新内容填足。"><Switch value={settings.autoFillPlan} label="自动补足计划" onChange={() => updateSettings({ autoFillPlan:!settings.autoFillPlan })} /></SettingRow>
        <SettingRow title="周末任务量" description="按本地日期判断周末；轻量约为 70%，加强约为 130%。"><div className="segmented-control">{([{ value:"lighter", label:"轻量" }, { value:"same", label:"不变" }, { value:"heavier", label:"加强" }] as Array<{ value:WeekendAdjustment; label:string }>).map((item) => <button className={settings.weekendAdjustment === item.value ? "active" : ""} onClick={() => updateSettings({ weekendAdjustment:item.value })} key={item.value}>{item.label}</button>)}</div></SettingRow>
        <SettingRow title="错题掌握阈值" description="连续答对达到该次数后移入已掌握。"><NumberControl value={settings.masteryStreak} options={[2,3,4]} min={1} max={10} label="错题连续答对次数" onChange={(value) => updateSettings({ masteryStreak:value })} /></SettingRow>
        <SettingRow title="测试即时反馈" description="开启后每题立即显示正确答案和解析。"><Switch value={settings.immediateTestFeedback} label="测试即时反馈" onChange={() => updateSettings({ immediateTestFeedback:!settings.immediateTestFeedback })} /></SettingRow>
      </section>

      <section className="settings-section card">
        <div className="settings-section-heading"><span className="settings-icon"><Sun size={20} /></span><div><h2>外观与可访问性</h2><p>主题、信息密度、字体和动态效果</p></div></div>
        <SettingRow title="主题" description="跟随系统会自动匹配设备外观。"><div className="theme-options">{themes.map((theme) => { const Icon=theme.icon; return <button className={settings.theme === theme.value ? "active" : ""} onClick={() => updateSettings({ theme:theme.value })} key={theme.value}><Icon size={18} /><span>{theme.label}</span>{settings.theme === theme.value && <Check size={16} />}</button>; })}</div></SettingRow>
        <SettingRow title="单词显示" description="完整版显示例句、翻译、搭配、等级和说明。"><div className="segmented-control"><button className={settings.displayDensity === "compact" ? "active" : ""} onClick={() => updateSettings({ displayDensity:"compact" })}>简洁版</button><button className={settings.displayDensity === "full" ? "active" : ""} onClick={() => updateSettings({ displayDensity:"full" })}>完整版</button></div></SettingRow>
        <SettingRow title="字体大小" description="较大字体会提高正文和表单的基础字号。"><div className="segmented-control">{([{ value:"standard", label:"标准" }, { value:"large", label:"较大" }] as Array<{ value:FontSize; label:string }>).map((item) => <button className={settings.fontSize === item.value ? "active" : ""} onClick={() => updateSettings({ fontSize:item.value })} key={item.value}>{item.label}</button>)}</div></SettingRow>
        <SettingRow title="基础动画" description="关闭后移除卡片和反馈动画。"><Switch value={settings.animations} label="基础动画" onChange={() => updateSettings({ animations:!settings.animations })} /></SettingRow>
        <SettingRow title="减少动态效果" description="强制减少运动，优先于基础动画开关。"><Switch value={settings.reduceMotion} label="减少动态效果" onChange={() => updateSettings({ reduceMotion:!settings.reduceMotion })} /></SettingRow>
      </section>

      <div id="deepseek-ai"><AISettingsPanel /></div>

      <section className="settings-section card">
        <div className="settings-section-heading"><span className="settings-icon"><Database size={20} /></span><div><h2>本地数据</h2><p>每项危险操作都需要再次勾选确认</p></div></div>
        <div className="reset-actions">
          <button onClick={() => openReset("progress")}><RotateCcw size={18} /><span><strong>重置学习进度</strong><small>保留错题与收藏</small></span></button>
          <button onClick={() => openReset("tests")}><X size={18} /><span><strong>清空测试记录</strong><small>保留学习进度</small></span></button>
          <button onClick={() => openReset("mistakes")}><X size={18} /><span><strong>清空错题</strong><small>保留其他数据</small></span></button>
          <button onClick={() => openReset("favorites")}><X size={18} /><span><strong>清空收藏</strong><small>保留学习进度</small></span></button>
          <button className="danger" onClick={() => openReset("all")}><Database size={18} /><span><strong>重置全部数据</strong><small>包括计划、设置与收藏</small></span></button>
        </div>
      </section>

      <section className="about-card card"><span className="settings-icon"><Info size={20} /></span><div><strong>LinguaStep 日英阶梯</strong><p>数据库 v3 · 复习算法 v2 · DeepSeek AI 安全代理</p></div><span>版本 {APP_VERSION} · 第三阶段</span></section>

      {resetScope && (
        <div className="modal-backdrop" role="presentation" onClick={closeReset}>
          <section ref={modalRef} className="confirm-modal card" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" onClick={(event) => event.stopPropagation()}>
            <span className="modal-warning-icon"><Database size={24} /></span>
            <h2 id="reset-title">{resetCopy[resetScope].title}</h2>
            <p>{resetCopy[resetScope].description}</p>
            <label className="confirm-check"><input ref={confirmCheckboxRef} type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>我已了解影响，并确认继续</span></label>
            <div className="modal-actions"><Button variant="secondary" onClick={closeReset}>取消</Button><Button variant="danger" disabled={!confirmed || resetting} onClick={() => void runReset()}>{resetting ? "正在重置…" : resetCopy[resetScope].button}</Button></div>
          </section>
        </div>
      )}
    </div>
  );
}
