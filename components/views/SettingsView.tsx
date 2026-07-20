"use client";

import {
  Bot,
  Check,
  Database,
  Info,
  Laptop,
  LockKeyhole,
  Moon,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION } from "@/lib/constants";
import type { ThemeMode } from "@/lib/models";
import { useLearning } from "@/context/LearningContext";
import { Button, PageHeader } from "@/components/ui";

type ResetScope = "progress" | "mistakes" | "all";

const resetCopy: Record<ResetScope, { title: string; description: string; button: string }> = {
  progress: { title: "重置学习进度？", description: "将清除单词、语法、测试和每日学习记录；错题与收藏会保留。", button: "确认重置学习进度" },
  mistakes: { title: "清空错题记录？", description: "将删除活跃错题与历史错题记录，学习进度和收藏不受影响。", button: "确认清空错题" },
  all: { title: "重置全部数据？", description: "将清除所有本地学习记录、错题、收藏和个性化设置。此操作无法撤销。", button: "确认重置全部数据" },
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

export function SettingsView() {
  const { settings, updateSettings, resetData } = useLearning();
  const [resetScope, setResetScope] = useState<ResetScope | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const confirmCheckboxRef = useRef<HTMLInputElement>(null);
  const resetTriggerRef = useRef<HTMLElement | null>(null);

  const closeReset = () => {
    setResetScope(null);
    setConfirmed(false);
    window.setTimeout(() => resetTriggerRef.current?.focus(), 0);
  };

  const openReset = (scope: ResetScope) => {
    resetTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setConfirmed(false);
    setResetScope(scope);
  };

  useEffect(() => {
    if (!resetScope) return;
    confirmCheckboxRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !resetting) {
        setResetScope(null);
        setConfirmed(false);
        window.setTimeout(() => resetTriggerRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [resetScope, resetting]);

  const chooseTheme = (theme: ThemeMode) => updateSettings({ theme });
  const runReset = async () => {
    if (!resetScope || !confirmed) return;
    setResetting(true);
    try {
      await resetData(resetScope);
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

  return (
    <div className="page-stack settings-page">
      <PageHeader
        eyebrow="设置"
        title="调整适合你的学习节奏"
        description="显示偏好保存在浏览器设置中，学习记录则由独立的本地数据库保存。"
      />

      <section className="settings-section card">
        <div className="settings-section-heading"><span className="settings-icon"><Sun size={20} /></span><div><h2>外观与显示</h2><p>选择主题和单词卡的信息密度</p></div></div>
        <SettingRow title="主题" description="跟随系统会自动匹配设备的浅色或深色外观。">
          <div className="theme-options">
            {themes.map((theme) => {
              const Icon = theme.icon;
              return <button className={settings.theme === theme.value ? "active" : ""} onClick={() => chooseTheme(theme.value)} key={theme.value}><Icon size={18} /><span>{theme.label}</span>{settings.theme === theme.value && <Check size={16} />}</button>;
            })}
          </div>
        </SettingRow>
        <SettingRow title="单词显示" description="完整版会额外显示音标、罗马音、例句、搭配和标签。">
          <div className="segmented-control"><button className={settings.displayDensity === "compact" ? "active" : ""} onClick={() => updateSettings({ displayDensity: "compact" })}>简洁版</button><button className={settings.displayDensity === "full" ? "active" : ""} onClick={() => updateSettings({ displayDensity: "full" })}>完整版</button></div>
        </SettingRow>
        <SettingRow title="基础动画" description="关闭后会减少卡片切换和答题反馈动画。">
          <button className={`switch${settings.animations ? " active" : ""}`} role="switch" aria-checked={settings.animations} onClick={() => updateSettings({ animations: !settings.animations })}><span /></button>
        </SettingRow>
      </section>

      <section className="settings-section card">
        <div className="settings-section-heading"><span className="settings-icon"><SlidersHorizontal size={20} /></span><div><h2>学习偏好</h2><p>控制每日任务、学习轮次和答案揭示</p></div></div>
        <SettingRow title="答案揭示" description="分步揭示时会先显示日语，再显示英语。">
          <div className="segmented-control"><button className={settings.revealMode === "together" ? "active" : ""} onClick={() => updateSettings({ revealMode: "together" })}>同时揭示</button><button className={settings.revealMode === "step-by-step" ? "active" : ""} onClick={() => updateSettings({ revealMode: "step-by-step" })}>分步揭示</button></div>
        </SettingRow>
        <SettingRow title="每日新单词" description="首页今日任务会使用这个数量。">
          <div className="number-options">
            {[10, 20, 30].map((count) => <button className={settings.dailyNewWords === count ? "active" : ""} onClick={() => updateSettings({ dailyNewWords: count })} key={count}>{count}</button>)}
            <label><span>自定义</span><input aria-label="自定义每日新单词数量" type="number" min={1} max={100} value={settings.dailyNewWords} onChange={(event) => updateSettings({ dailyNewWords: Math.max(1, Math.min(100, Number(event.target.value) || 1)) })} /></label>
          </div>
        </SettingRow>
        <SettingRow title="每轮学习数量" description="固定轮次便于集中注意力并及时结束。">
          <div className="number-options">
            {[10, 20, 30].map((count) => <button className={settings.studyRoundSize === count ? "active" : ""} onClick={() => updateSettings({ studyRoundSize: count })} key={count}>{count}</button>)}
            <label><span>自定义</span><input aria-label="自定义每轮学习数量" type="number" min={1} max={100} value={settings.studyRoundSize} onChange={(event) => updateSettings({ studyRoundSize: Math.max(1, Math.min(100, Number(event.target.value) || 1)) })} /></label>
          </div>
        </SettingRow>
        <SettingRow title="语法练习题数" description="第一阶段每个语法点最多内置 5 道练习。">
          <div className="number-options">
            {[3, 5].map((count) => <button className={settings.grammarExerciseCount === count ? "active" : ""} onClick={() => updateSettings({ grammarExerciseCount: count })} key={count}>{count}</button>)}
            <label><span>自定义</span><input aria-label="自定义语法练习题数" type="number" min={1} max={5} value={settings.grammarExerciseCount} onChange={(event) => updateSettings({ grammarExerciseCount: Math.max(1, Math.min(5, Number(event.target.value) || 1)) })} /></label>
          </div>
        </SettingRow>
      </section>

      <section className="settings-section card disabled-ai-section">
        <div className="settings-section-heading"><span className="settings-icon ai"><Bot size={21} /></span><div><h2>DeepSeek AI</h2><p>第三阶段扩展能力</p></div><span className="coming-soon"><LockKeyhole size={14} />后续版本开放</span></div>
        <div className="disabled-ai-content"><div><strong>AI 内容生成与错题解释</strong><p>未来可通过后端代理或本地 API Key 测试模式接入。本版本不会请求 API，也不需要填写密钥。</p></div><button className="button button-secondary" disabled>配置 DeepSeek</button></div>
      </section>

      <section className="settings-section card">
        <div className="settings-section-heading"><span className="settings-icon"><Database size={20} /></span><div><h2>本地数据</h2><p>谨慎管理保存在当前浏览器中的学习记录</p></div></div>
        <div className="reset-actions">
          <button onClick={() => openReset("progress")}><RotateCcw size={18} /><span><strong>重置学习进度</strong><small>保留错题与收藏</small></span></button>
          <button onClick={() => openReset("mistakes")}><X size={18} /><span><strong>清空错题</strong><small>保留学习进度</small></span></button>
          <button className="danger" onClick={() => openReset("all")}><Database size={18} /><span><strong>重置全部数据</strong><small>包括设置与收藏</small></span></button>
        </div>
      </section>

      <section className="about-card card"><span className="settings-icon"><Info size={20} /></span><div><strong>LinguaStep 日英阶梯</strong><p>日语与英语，一起稳步进阶</p></div><span>版本 {APP_VERSION} · 第一阶段</span></section>

      {resetScope && (
        <div className="modal-backdrop" role="presentation" onClick={closeReset}>
          <section className="confirm-modal card" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" onClick={(event) => event.stopPropagation()}>
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
