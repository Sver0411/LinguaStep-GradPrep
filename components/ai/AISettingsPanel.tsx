"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Server,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { useAI } from "@/context/AIContext";
import { useLearning, type AIClearScope } from "@/context/LearningContext";
import type { AISecretPersistence } from "@/lib/models";
import { Button } from "@/components/ui";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" className={`switch${checked ? " active" : ""}`} role="switch" aria-checked={checked} aria-label={label} onClick={onChange}><span /></button>;
}

function SecretEditor({ kind, label, persistence }: { kind: "apiKey" | "proxyToken"; label: string; persistence: AISecretPersistence }) {
  const { setSecret, clearSecret, getSecretStatus } = useAI();
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [storage, setStorage] = useState<AISecretPersistence>(persistence);
  const status = getSecretStatus(kind);
  return (
    <div className="ai-secret-editor">
      <div className="ai-secret-heading"><strong>{label}</strong><span className={status.configured ? "status-ok" : "status-muted"}>{status.configured ? `已配置 · ${status.masked}` : "未配置"}</span></div>
      <div className="ai-secret-input">
        <KeyRound size={17} />
        <input type={visible ? "text" : "password"} value={value} onChange={(event) => setValue(event.target.value)} placeholder={kind === "apiKey" ? "sk-…" : "输入代理访问令牌"} autoComplete="off" spellCheck={false} />
        <button type="button" className="icon-button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "隐藏密钥" : "显示密钥"}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </div>
      <div className="ai-secret-actions">
        <label>保存范围 <select value={storage} onChange={(event) => setStorage(event.target.value as AISecretPersistence)}><option value="session">仅本次会话（推荐）</option><option value="device">保存在此设备</option></select></label>
        <Button variant="secondary" disabled={!value.trim()} onClick={() => { setSecret(kind, value, storage); setValue(""); }}>保存</Button>
        {status.configured && <button className="text-button danger-text" type="button" onClick={() => clearSecret(kind)}><Trash2 size={15} />清除</button>}
      </div>
      <p className="field-help">密钥只写入浏览器的会话或本地存储，不进入 IndexedDB、导出数据、URL 或日志。{storage === "device" ? " 保存在此设备会延长暴露时间，只建议在可信的个人设备使用。" : " 关闭当前浏览器会话后会自动失效。"}</p>
    </div>
  );
}

export function AISettingsPanel() {
  const {
    settings,
    health,
    online,
    busyOperation,
    error,
    updateSettings,
    testConnection,
    resetAISettings,
    clearAllSecrets,
  } = useAI();
  const { snapshot, clearAIData } = useLearning();

  const clearData = async (scope: AIClearScope, message: string) => {
    if (window.confirm(message)) await clearAIData(scope);
  };

  return (
    <section className="settings-section card ai-settings-panel">
      <div className="settings-section-heading">
        <span className="settings-icon ai"><ShieldCheck size={21} /></span>
        <div><h2>DeepSeek AI</h2><p>服务器代理与个人 API Key 两种安全接入方式</p></div>
        <span className={`ai-connection-badge ${online ? "online" : "offline"}`}>{online ? <Wifi size={14} /> : <WifiOff size={14} />}{online ? "网络可用" : "当前离线"}</span>
      </div>

      <div className="ai-settings-grid">
        <div className="ai-setting-block">
          <div className="ai-setting-title"><div><strong>启用 AI 功能</strong><p>关闭后不会发起任何 AI 网络请求。</p></div><Toggle checked={settings.enabled} label="启用 AI" onChange={() => updateSettings({ enabled: !settings.enabled })} /></div>
          <div className="ai-setting-title"><div><strong>连接方式</strong><p>服务器模式由部署环境保管 DeepSeek Key；BYOK 由浏览器按次发送给同源代理。</p></div></div>
          <div className="segmented-control"><button type="button" className={settings.connectionMode === "server" ? "active" : ""} onClick={() => updateSettings({ connectionMode: "server" })}><Server size={16} />服务器代理</button><button type="button" className={settings.connectionMode === "byok" ? "active" : ""} onClick={() => updateSettings({ connectionMode: "byok" })}><KeyRound size={16} />个人 API Key</button></div>
          {settings.connectionMode === "byok" ? <SecretEditor kind="apiKey" label="DeepSeek API Key" persistence={settings.apiKeyPersistence} /> : <SecretEditor kind="proxyToken" label="代理访问令牌（部署端启用保护时需要）" persistence={settings.proxyTokenPersistence} />}
          <div className="ai-connection-test">
            <Button variant="secondary" disabled={!online || busyOperation !== null || !settings.enabled} onClick={() => void testConnection()}>{busyOperation === "connection" ? <LoaderCircle className="spin" size={17} /> : <Wifi size={17} />}测试连接</Button>
            {health && <span><CheckCircle2 size={16} />Fast: {health.fastModel} · Quality: {health.qualityModel}</span>}
            {error && <span className="error-text">{error.message}</span>}
          </div>
        </div>

        <div className="ai-setting-block">
          <h3>生成默认值</h3>
          <div className="ai-form-grid compact">
            <label><span>单词数量</span><select value={settings.defaultWordCount} onChange={(event) => updateSettings({ defaultWordCount: Number(event.target.value) as 1 | 5 | 10 })}><option value={1}>1</option><option value={5}>5</option><option value={10}>10</option></select></label>
            <label><span>日语等级</span><select value={settings.defaultJapaneseLevel} onChange={(event) => updateSettings({ defaultJapaneseLevel: event.target.value as typeof settings.defaultJapaneseLevel })}><option>N3</option><option>N2</option><option>N1</option></select></label>
            <label><span>英语等级</span><select value={settings.defaultEnglishLevel} onChange={(event) => updateSettings({ defaultEnglishLevel: event.target.value as typeof settings.defaultEnglishLevel })}><option>高中基础</option><option>四级</option><option>六级</option><option>TOEIC 过渡</option></select></label>
            <label><span>默认模型</span><select value={settings.defaultQuality} onChange={(event) => updateSettings({ defaultQuality: event.target.value as "fast" | "quality" })}><option value="fast">Fast · 日常生成</option><option value="quality">Quality · 复杂任务</option></select></label>
            <label><span>每日软限制</span><input type="number" min={1} max={200} value={settings.dailyRequestSoftLimit} onChange={(event) => updateSettings({ dailyRequestSoftLimit: Math.max(1, Math.min(200, Number(event.target.value) || 1)) })} /></label>
            <label><span>最大重试</span><input type="number" min={0} max={5} value={settings.maxRetries} disabled={!settings.autoRetry} onChange={(event) => updateSettings({ maxRetries: Math.max(0, Math.min(5, Number(event.target.value) || 0)) })} /></label>
          </div>
          <div className="ai-toggle-list">
            <div><span><strong>词汇与语法固定追加保存</strong><small>每批合格内容都会加入现有学习库；新生成不会替换旧内容，重复项会自动跳过并补足。</small></span><CheckCircle2 className="status-ok" size={20} /></div>
            <div><span><strong>质量复核</strong><small>额外调用质量模型检查内容，耗时和 token 会增加。</small></span><Toggle checked={settings.qualityReview} label="质量复核" onChange={() => updateSettings({ qualityReview: !settings.qualityReview })} /></div>
            <div><span><strong>自动重试</strong><small>只重试限流、超时、网络与服务繁忙等瞬时错误。</small></span><Toggle checked={settings.autoRetry} label="自动重试" onChange={() => updateSettings({ autoRetry: !settings.autoRetry })} /></div>
          </div>
        </div>
      </div>

      <div className="ai-data-actions">
        <span>AI 内容 {snapshot.aiWords.length + snapshot.aiGrammar.length + snapshot.aiComparisons.length} · 历史 {snapshot.aiGenerations.length} · 解释缓存 {snapshot.aiExplanations.length}</span>
        <button type="button" className="text-button" onClick={() => void clearData("history", "确认清除全部 AI 生成历史与用量记录？已保存内容会保留。")}>清历史</button>
        <button type="button" className="text-button" onClick={() => void clearData("explanations", "确认清除全部 AI 错因解释缓存？")}>清解释缓存</button>
        <button type="button" className="text-button danger-text" onClick={() => void clearData("content", "确认删除全部 AI 生成内容和练习集？关联的学习记录也会被清理。")}>删 AI 内容</button>
        <button type="button" className="text-button danger-text" onClick={() => { if (window.confirm("确认恢复 AI 默认设置并清除当前设备上的全部 AI 密钥？")) { resetAISettings(); clearAllSecrets(); } }}>重置 AI 设置与密钥</button>
      </div>
    </section>
  );
}
