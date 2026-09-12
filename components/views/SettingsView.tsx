"use client";

import {
  Check,
  Database,
  Download,
  Info,
  Laptop,
  Moon,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION } from "@/lib/constants";
import type {
  FontSize,
  RevealOrder,
  StudyMode,
  ThemeMode,
} from "@/lib/models";
import { useLearning, type ResetScope } from "@/context/learning";
import { Button, PageHeader } from "@/components/ui";
import { ENGLISH_STUDY_LEVELS, JAPANESE_STUDY_LEVELS } from "@/lib/word-levels";

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

export function SettingsView() {
  const { settings, updateSettings, resetData, allWords, allGrammar, exportBackup, importBackup } = useLearning();
  const [mobileSection, setMobileSection] = useState<"learning" | "appearance">("learning");
  const [resetScope, setResetScope] = useState<ResetScope | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const confirmCheckboxRef = useRef<HTMLInputElement>(null);
  const resetTriggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ name: string; raw: string } | null>(null);
  const [importConfirmed, setImportConfirmed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const downloadBackup = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `linguastep-backup-${stamp}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const raw = await file.text();
      setImportMessage(null);
      setImportConfirmed(false);
      setPendingImport({ name: file.name, raw });
    } catch {
      setImportMessage({ ok: false, text: "无法读取该文件。" });
    }
  };

  const runImport = async () => {
    if (!pendingImport || !importConfirmed) return;
    setImporting(true);
    try {
      const result = await importBackup(pendingImport.raw);
      setImportMessage({ ok: result.ok, text: result.message });
      setPendingImport(null);
      setImportConfirmed(false);
    } finally {
      setImporting(false);
    }
  };

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
    { value: "combined", label: "日英混合" },
    { value: "japanese", label: "日语" },
    { value: "english", label: "英语" },
  ];
  return (
    <div className="page-stack settings-page">
      <PageHeader eyebrow="设置" title="管理默认学习方式" description="这里的选项作为后续学习默认值；今日计划的临时操作集中在首页。" />

      <div className="mobile-settings-switcher" role="tablist" aria-label="设置分类">
        <button className={mobileSection === "learning" ? "active" : ""} onClick={() => setMobileSection("learning")} role="tab" aria-selected={mobileSection === "learning"}>学习</button>
        <button className={mobileSection === "appearance" ? "active" : ""} onClick={() => setMobileSection("appearance")} role="tab" aria-selected={mobileSection === "appearance"}>外观</button>
      </div>

      <section className={`settings-section card mobile-settings-section${mobileSection === "learning" ? " mobile-open" : ""}`}>
        <div className="settings-section-heading"><span className="settings-icon"><SlidersHorizontal size={20} /></span><div><h2>学习与每日计划</h2><p>控制模式、任务数量和复习优先级</p></div></div>
        <SettingRow title="默认学习模式" description="进入单词学习和生成每日计划时优先使用。"><div className="segmented-control">{modes.map((mode) => <button className={settings.defaultStudyMode === mode.value ? "active" : ""} onClick={() => updateSettings({ defaultStudyMode: mode.value })} key={mode.value}>{mode.label}</button>)}</div></SettingRow>
        <SettingRow title="答案揭示" description="默认分步揭示，减少一次出现过多信息；也可以切换为同时揭示。"><div className="segmented-control"><button className={settings.revealMode === "step-by-step" ? "active" : ""} onClick={() => updateSettings({ revealMode: "step-by-step" })}>分步（首选）</button><button className={settings.revealMode === "together" ? "active" : ""} onClick={() => updateSettings({ revealMode: "together" })}>同时</button></div></SettingRow>
        <SettingRow title="分步揭示顺序" description="随机顺序按词条稳定分配，避免同一张卡刷新后跳变。"><div className="segmented-control">{([{ value:"japanese-first", label:"日语优先" }, { value:"english-first", label:"英语优先" }, { value:"random", label:"随机" }] as Array<{ value: RevealOrder; label: string }>).map((item) => <button className={settings.revealOrder === item.value ? "active" : ""} onClick={() => updateSettings({ revealOrder: item.value })} key={item.value}>{item.label}</button>)}</div></SettingRow>
        <SettingRow title="日语学习范围" description="决定日语单词里包含哪些等级；设一次长期生效，学习页不再每次询问。">
          <select value={settings.studyJapaneseLevel} onChange={(event) => updateSettings({ studyJapaneseLevel: event.target.value })}>
            <option value="all">全部等级</option>
            {JAPANESE_STUDY_LEVELS.map((level) => <option key={level}>{level}</option>)}
          </select>
        </SettingRow>
        <SettingRow title="英语学习范围" description="同上，作用于英语单词。">
          <select value={settings.studyEnglishLevel} onChange={(event) => updateSettings({ studyEnglishLevel: event.target.value })}>
            <option value="all">全部等级</option>
            {ENGLISH_STUDY_LEVELS.map((level) => <option value={level} key={level}>{level === "CET-4" ? "CET-4" : level === "CET-6" ? "CET-6" : level}</option>)}
          </select>
        </SettingRow>
        <SettingRow title="每日新单词" description="支持 10、20、30 或自定义。"><NumberControl value={settings.dailyNewWords} options={[10,20,30]} min={1} max={100} label="每日新单词" onChange={(value) => updateSettings({ dailyNewWords:value })} /></SettingRow>
        <SettingRow title="每轮学习数量" description="自由学习和计划学习都会使用这个轮次大小。"><NumberControl value={settings.studyRoundSize} options={[10,20,30]} min={1} max={100} label="每轮单词" onChange={(value) => updateSettings({ studyRoundSize:value })} /></SettingRow>
        <SettingRow title="每日语法数量" description="自动计划优先选择尚未学习的语法。"><NumberControl value={settings.dailyGrammarCount} options={[1,2,3]} min={1} max={10} label="每日语法" onChange={(value) => updateSettings({ dailyGrammarCount:value })} /></SettingRow>
        <SettingRow title="每日测试题数" description="首页计划和测试页默认值。"><NumberControl value={settings.dailyTestQuestions} options={[10,20,30]} min={1} max={100} label="每日测试题数" onChange={(value) => updateSettings({ dailyTestQuestions:value })} /></SettingRow>
        <SettingRow title="语法练习题数" description="每个语法点最多提供 5 道配套题。"><NumberControl value={settings.grammarExerciseCount} options={[3,5]} min={1} max={5} label="语法练习题数" onChange={(value) => updateSettings({ grammarExerciseCount:value })} /></SettingRow>
        <SettingRow title="测试即时反馈" description="开启后每题立即显示正确答案和解析。"><Switch value={settings.immediateTestFeedback} label="测试即时反馈" onChange={() => updateSettings({ immediateTestFeedback:!settings.immediateTestFeedback })} /></SettingRow>
        <SettingRow title="揭示后自动朗读" description="使用设备自带的语音引擎朗读单词；卡片上始终提供手动朗读按钮。"><Switch value={settings.autoSpeak} label="揭示后自动朗读" onChange={() => updateSettings({ autoSpeak:!settings.autoSpeak })} /></SettingRow>
      </section>

      <section className={`settings-section card mobile-settings-section${mobileSection === "appearance" ? " mobile-open" : ""}`}>
        <div className="settings-section-heading"><span className="settings-icon"><Sun size={20} /></span><div><h2>外观与可访问性</h2><p>主题、信息密度、字体和动态效果</p></div></div>
        <SettingRow title="学习专注模式" description="开启后，开始单词、语法、测试或错题练习时会暂时隐藏导航；关闭后保留普通页面布局。"><Switch value={settings.focusModeEnabled} label="学习专注模式" onChange={() => updateSettings({ focusModeEnabled:!settings.focusModeEnabled })} /></SettingRow>
        <SettingRow title="主题" description="跟随系统会自动匹配设备外观。"><div className="theme-options">{themes.map((theme) => { const Icon=theme.icon; return <button className={settings.theme === theme.value ? "active" : ""} onClick={() => updateSettings({ theme:theme.value })} key={theme.value}><Icon size={18} /><span>{theme.label}</span>{settings.theme === theme.value && <Check size={16} />}</button>; })}</div></SettingRow>
        <SettingRow title="单词显示" description="完整版显示例句、翻译、搭配、等级和说明。"><div className="segmented-control"><button className={settings.displayDensity === "compact" ? "active" : ""} onClick={() => updateSettings({ displayDensity:"compact" })}>简洁版</button><button className={settings.displayDensity === "full" ? "active" : ""} onClick={() => updateSettings({ displayDensity:"full" })}>完整版</button></div></SettingRow>
        <SettingRow title="字体大小" description="较大字体会提高正文和表单的基础字号。"><div className="segmented-control">{([{ value:"standard", label:"标准" }, { value:"large", label:"较大" }] as Array<{ value:FontSize; label:string }>).map((item) => <button className={settings.fontSize === item.value ? "active" : ""} onClick={() => updateSettings({ fontSize:item.value })} key={item.value}>{item.label}</button>)}</div></SettingRow>
      </section>

      <section className="settings-section card backup-section">
        <div className="settings-section-heading"><span className="settings-icon"><Database size={20} /></span><div><h2>备份与恢复</h2><p>学习记录只保存在这台浏览器里，换设备或清缓存前请先导出</p></div></div>
        <div className="backup-actions">
          <button onClick={downloadBackup}><Download size={18} /><span><strong>导出备份</strong><small>下载包含全部进度、错题、收藏和设置的 JSON 文件</small></span></button>
          <button onClick={() => fileInputRef.current?.click()}><Upload size={18} /><span><strong>导入备份</strong><small>用备份文件替换当前设备上的全部数据</small></span></button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="sr-only" aria-label="选择备份文件" onChange={(event) => { void handleImportFile(event.target.files?.[0]); event.target.value = ""; }} />
        </div>
        {pendingImport && (
          <div className="backup-confirm card" role="alertdialog" aria-label="确认导入备份">
            <div><strong>{pendingImport.name}</strong><p>导入会用备份文件里的内容替换当前的全部学习进度和设置，此操作无法撤销。</p></div>
            <label className="confirm-check"><input type="checkbox" checked={importConfirmed} onChange={(event) => setImportConfirmed(event.target.checked)} /><span>我已了解影响，并确认继续</span></label>
            <div className="backup-confirm-actions">
              <Button variant="secondary" onClick={() => { setPendingImport(null); setImportConfirmed(false); }}>取消</Button>
              <Button variant="danger" disabled={!importConfirmed || importing} onClick={() => void runImport()}>{importing ? "正在恢复…" : "确认恢复"}</Button>
            </div>
          </div>
        )}
        {importMessage && <p className={`backup-message${importMessage.ok ? " ok" : ""}`} role="status">{importMessage.text}</p>}
      </section>

      <details className="settings-section card settings-danger-zone compact-details">
        <summary><span><strong>数据与危险操作</strong><small>重置进度、测试、错题、收藏或全部本地数据</small></span></summary>
        <div className="settings-section-heading"><span className="settings-icon"><Database size={20} /></span><div><h2>本地数据</h2><p>每项危险操作都需要再次勾选确认</p></div></div>
        <div className="reset-actions">
          <button onClick={() => openReset("progress")}><RotateCcw size={18} /><span><strong>重置学习进度</strong><small>保留错题与收藏</small></span></button>
          <button onClick={() => openReset("tests")}><X size={18} /><span><strong>清空测试记录</strong><small>保留学习进度</small></span></button>
          <button onClick={() => openReset("mistakes")}><X size={18} /><span><strong>清空错题</strong><small>保留其他数据</small></span></button>
          <button onClick={() => openReset("favorites")}><X size={18} /><span><strong>清空收藏</strong><small>保留学习进度</small></span></button>
          <button className="danger" onClick={() => openReset("all")}><Database size={18} /><span><strong>重置全部数据</strong><small>包括计划、设置与收藏</small></span></button>
        </div>
      </details>

      <section className="about-card card"><span className="settings-icon"><Info size={20} /></span><div><strong>LinguaStep 日英阶梯</strong><p>数据库 v3 · 复习算法 v2 · {allWords.length} 组精选考试词汇 · {allGrammar.length} 个语法点 · 137 组语法对比</p><p>当前单词库只启用人工整理或复核的 N3、N2、N1 与四级、六级、TOEIC 常用考试词，不加载未复核的自动扩充词条。</p></div><span>版本 {APP_VERSION}</span></section>

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
