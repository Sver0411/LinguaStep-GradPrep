"use client";
import { useRef, useState } from "react";
import { useLearning } from "@/context/learning";
export function BackupPanel() {
  const { exportBackup, importBackup, settings, updateSettings, storageDegraded } = useLearning();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; raw: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const download = () => {
    try {
      const raw = exportBackup(); const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `linguastep-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      updateSettings({ lastBackupAt: new Date().toISOString() }); setMessage("已发起备份下载，请保留下载的 JSON 文件。");
    } catch { setMessage("备份下载失败，请重试。"); }
  };
  return <section className="card m3-card backup-section"><h2>备份与恢复</h2><p>记录仅保存在当前浏览器。手机和电脑之间需手动导出、导入，不会自动同步。</p>
    {storageDegraded && <p role="alert">当前处于临时存储模式，请及时导出备份。</p>}
    <p>最近导出：{settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString("zh-CN") : "尚无导出记录"}</p>
    <div className="backup-actions"><button type="button" onClick={download}>导出备份</button><button type="button" onClick={() => fileRef.current?.click()}>导入备份</button></div>
    <input ref={fileRef} type="file" accept=".json,application/json" aria-label="选择备份文件" className="sr-only" onChange={async (event) => {
      const file = event.target.files?.[0]; event.target.value = ""; setConfirmed(false); if (!file) return;
      try { const raw = await file.text(); JSON.parse(raw); setPending({ name: file.name, raw }); setMessage(""); } catch { setMessage("文件不是可读取的 JSON 备份。"); }
    }} />
    {pending && <div role="alertdialog" aria-label="确认导入备份"><strong>{pending.name}</strong><p>恢复将替换当前进度、收藏和设置。建议先导出当前数据。</p><label className="confirm-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />我已了解替换影响</label><div className="backup-actions"><button type="button" disabled={busy} onClick={() => setPending(null)}>取消</button><button type="button" disabled={!confirmed || busy} onClick={async () => {
      setBusy(true); try { const result = await importBackup(pending.raw); setMessage(result.message); if (result.ok) setPending(null); } catch { setMessage("恢复失败，请检查备份文件。"); } finally { setBusy(false); }
    }}>{busy ? "恢复中…" : "确认恢复"}</button></div></div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
