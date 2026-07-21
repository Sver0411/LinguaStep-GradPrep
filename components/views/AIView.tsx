"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FileQuestion,
  History,
  Languages,
  LoaderCircle,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  WifiOff,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAI } from "@/context/AIContext";
import { useLearning } from "@/context/LearningContext";
import type {
  AIGenerationKind,
  AIGenerationRecord,
  AIContentReport,
  GrammarLanguage,
  TestMode,
  TestSourceFilter,
} from "@/lib/models";
import { Button, EmptyState, PageHeader } from "@/components/ui";

type AITab = "words" | "grammar" | "quiz" | "history";

const KIND_LABEL: Record<AIGenerationKind, string> = {
  words: "单词生成",
  grammar: "语法生成",
  quiz: "练习题生成",
  explanation: "错因解释",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function statusLabel(status: string): string {
  if (status === "succeeded") return "成功";
  if (status === "partial") return "部分成功";
  if (status === "cancelled") return "已取消";
  if (status === "failed") return "失败";
  return "处理中";
}

export function AIView() {
  const {
    settings,
    online,
    busyOperation,
    error,
    transientResult,
    usageSummary,
    generateWords,
    generateGrammar,
    generateQuiz,
    saveTransient,
    saveQuizCollection,
    undoLastSave,
    cancel,
  } = useAI();
  const {
    snapshot,
    allWords,
    allGrammar,
    allComparisons,
    removeAIContent,
    undoAIGeneration,
    removeAIGeneration,
    saveAIArtifacts,
  } = useLearning();
  const [tab, setTab] = useState<AITab>("words");
  const [wordCount, setWordCount] = useState<1 | 5 | 10>(settings.defaultWordCount);
  const [japaneseLevel, setJapaneseLevel] = useState(settings.defaultJapaneseLevel);
  const [englishLevel, setEnglishLevel] = useState(settings.defaultEnglishLevel);
  const [frequency, setFrequency] = useState(settings.defaultFrequency);
  const [purpose, setPurpose] = useState(settings.defaultPurpose);
  const [grammarCount, setGrammarCount] = useState<1 | 2 | 3>(1);
  const [grammarLanguage, setGrammarLanguage] = useState<GrammarLanguage | "comparison">("japanese");
  const [grammarLevel, setGrammarLevel] = useState("N2");
  const [grammarTopic, setGrammarTopic] = useState("");
  const [quizCount, setQuizCount] = useState(10);
  const [quizMode, setQuizMode] = useState<TestMode>("mixed");
  const [quizSource, setQuizSource] = useState<TestSourceFilter>("all-learned");
  const [collectionTitle, setCollectionTitle] = useState("");
  const [historyKind, setHistoryKind] = useState<AIGenerationKind | "all">("all");
  const [historyStatus, setHistoryStatus] = useState("all");

  const result = transientResult && transientResult.kind !== "explanation" ? transientResult : null;
  const history = useMemo(
    () => [...snapshot.aiGenerations]
      .filter((item) => historyKind === "all" || item.kind === historyKind)
      .filter((item) => historyStatus === "all" || item.status === historyStatus)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [historyKind, historyStatus, snapshot.aiGenerations],
  );

  const generateCurrent = async () => {
    if (tab === "words") {
      await generateWords({ count: wordCount, japaneseLevel, englishLevel, frequency, purpose, quality: settings.defaultQuality, qualityReview: settings.qualityReview });
    } else if (tab === "grammar") {
      await generateGrammar({ count: grammarCount, language: grammarLanguage, level: grammarLevel, topic: grammarTopic.trim() || undefined, quality: settings.defaultQuality, qualityReview: settings.qualityReview });
    } else if (tab === "quiz") {
      await generateQuiz({ count: quizCount, mode: quizMode, sourceFilter: quizSource, quality: settings.defaultQuality });
    }
  };

  const reportContent = async (contentType: AIContentReport["contentType"], contentId: string, generationId: string) => {
    const reason = window.prompt("请简要说明这条内容的问题：");
    if (!reason?.trim()) return;
    await saveAIArtifacts({ reports: [{ id: `ai-report-${crypto.randomUUID()}`, contentType, contentId, generationId, reason: reason.trim(), createdAt: new Date().toISOString(), status: "open" }] });
  };

  const retryFromHistory = (record: AIGenerationRecord) => {
    if (record.kind === "explanation") return;
    const parameters = record.parameters ?? {};
    if (record.kind === "words") {
      if (parameters.count === 1 || parameters.count === 5 || parameters.count === 10) setWordCount(parameters.count);
      if (parameters.japaneseLevel === "N3" || parameters.japaneseLevel === "N2" || parameters.japaneseLevel === "N1") setJapaneseLevel(parameters.japaneseLevel);
      if (parameters.englishLevel === "高中基础" || parameters.englishLevel === "四级" || parameters.englishLevel === "六级" || parameters.englishLevel === "TOEIC 过渡") setEnglishLevel(parameters.englishLevel);
      if (parameters.frequency === "高频" || parameters.frequency === "常用" || parameters.frequency === "普通") setFrequency(parameters.frequency);
      if (parameters.purpose === "日常" || parameters.purpose === "考试" || parameters.purpose === "综合") setPurpose(parameters.purpose);
    }
    if (record.kind === "grammar") {
      if (parameters.count === 1 || parameters.count === 2 || parameters.count === 3) setGrammarCount(parameters.count);
      if (parameters.language === "japanese" || parameters.language === "english" || parameters.language === "comparison") setGrammarLanguage(parameters.language);
      if (typeof parameters.level === "string") setGrammarLevel(parameters.level);
      if (typeof parameters.topic === "string") setGrammarTopic(parameters.topic);
    }
    if (record.kind === "quiz") {
      if (typeof parameters.count === "number") setQuizCount(parameters.count);
      if (parameters.mode === "mixed" || parameters.mode === "japanese" || parameters.mode === "english") setQuizMode(parameters.mode);
      if (parameters.sourceFilter === "all-learned" || parameters.sourceFilter === "today" || parameters.sourceFilter === "recent-7" || parameters.sourceFilter === "mistakes" || parameters.sourceFilter === "favorites" || parameters.sourceFilter === "due") setQuizSource(parameters.sourceFilter);
    }
    setTab(record.kind);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const busy = busyOperation === tab;
  const configurationUnavailable = !settings.enabled || !online;

  return (
    <div className="page-stack ai-page">
      <PageHeader
        eyebrow="第三阶段 · DeepSeek AI"
        title="生成内容，也守住学习数据的质量边界"
        description="AI 返回内容必须经过结构、重复与语言校验；合格词汇与语法会持续追加到本地学习库，不会替换已有内容。"
        actions={<Link className="button button-secondary" href="/settings#deepseek-ai">AI 设置</Link>}
      />

      {!online && <div className="inline-alert"><WifiOff size={18} /><span>当前离线。已有词库、语法、测试和 AI 历史仍可使用，生成能力会在联网后恢复。</span></div>}

      <section className="ai-overview-grid">
        <article className="card ai-generator-card">
          <div className="ai-tab-list" role="tablist" aria-label="AI 功能">
            <button role="tab" className={tab === "words" ? "active" : ""} onClick={() => setTab("words")}><BookOpenText size={18} />生成单词</button>
            <button role="tab" className={tab === "grammar" ? "active" : ""} onClick={() => setTab("grammar")}><Languages size={18} />生成语法</button>
            <button role="tab" className={tab === "quiz" ? "active" : ""} onClick={() => setTab("quiz")}><FileQuestion size={18} />生成练习题</button>
            <button role="tab" className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><History size={18} />历史记录</button>
          </div>

          {tab === "words" && (
            <div className="ai-generator-form">
              <div><span className="section-kicker">WORD GENERATOR</span><h2>生成日英对应词卡</h2><p>同时生成词义、读音、词性、例句、搭配、等级和学习说明。</p></div>
              <div className="ai-form-grid">
                <label><span>数量</span><select value={wordCount} onChange={(event) => setWordCount(Number(event.target.value) as 1 | 5 | 10)}><option value={1}>1 组</option><option value={5}>5 组</option><option value={10}>10 组</option></select></label>
                <label><span>JLPT</span><select value={japaneseLevel} onChange={(event) => setJapaneseLevel(event.target.value as typeof japaneseLevel)}><option>N3</option><option>N2</option><option>N1</option></select></label>
                <label><span>英语等级</span><select value={englishLevel} onChange={(event) => setEnglishLevel(event.target.value as typeof englishLevel)}><option>高中基础</option><option>四级</option><option>六级</option><option>TOEIC 过渡</option></select></label>
                <label><span>频率</span><select value={frequency} onChange={(event) => setFrequency(event.target.value as typeof frequency)}><option>高频</option><option>常用</option><option>普通</option></select></label>
                <label><span>用途</span><select value={purpose} onChange={(event) => setPurpose(event.target.value as typeof purpose)}><option>综合</option><option>日常</option><option>考试</option></select></label>
              </div>
            </div>
          )}

          {tab === "grammar" && (
            <div className="ai-generator-form">
              <div><span className="section-kicker">GRAMMAR GENERATOR</span><h2>生成语法知识点或日英对比</h2><p>对比模式与 N1 内容会自动使用质量模型和思考模式。</p></div>
              <div className="ai-form-grid">
                <label><span>类型</span><select value={grammarLanguage} onChange={(event) => setGrammarLanguage(event.target.value as typeof grammarLanguage)}><option value="japanese">日语语法</option><option value="english">英语语法</option><option value="comparison">日英语义对比</option></select></label>
                <label><span>数量</span><select value={grammarCount} onChange={(event) => setGrammarCount(Number(event.target.value) as 1 | 2 | 3)}><option value={1}>1 个</option><option value={2}>2 个</option><option value={3}>3 个</option></select></label>
                <label><span>难度</span><input value={grammarLevel} onChange={(event) => setGrammarLevel(event.target.value)} placeholder={grammarLanguage === "english" ? "四级" : "N2"} maxLength={20} /></label>
                <label className="wide"><span>主题（可选）</span><input value={grammarTopic} onChange={(event) => setGrammarTopic(event.target.value)} placeholder="例如：条件表达、职场邮件" maxLength={80} /></label>
              </div>
            </div>
          )}

          {tab === "quiz" && (
            <div className="ai-generator-form">
              <div><span className="section-kicker">QUIZ GENERATOR</span><h2>根据已学内容生成四选一练习</h2><p>只发送最小化的内容摘要，不上传完整学习历史。</p></div>
              <div className="ai-form-grid">
                <label><span>题数</span><input type="number" min={1} max={30} value={quizCount} onChange={(event) => setQuizCount(Math.max(1, Math.min(30, Number(event.target.value) || 1)))} /></label>
                <label><span>语言</span><select value={quizMode} onChange={(event) => setQuizMode(event.target.value as TestMode)}><option value="mixed">日英混合</option><option value="japanese">日语</option><option value="english">英语</option></select></label>
                <label><span>内容来源</span><select value={quizSource} onChange={(event) => setQuizSource(event.target.value as TestSourceFilter)}><option value="all-learned">所有已学内容</option><option value="today">今日学过</option><option value="recent-7">最近 7 天</option><option value="mistakes">错题专项</option><option value="favorites">收藏专项</option><option value="due">到期复习</option></select></label>
              </div>
            </div>
          )}

          {tab !== "history" && (
            <div className="ai-generate-actions">
              <div><strong>{settings.defaultQuality === "quality" ? "Quality · deepseek-v4-pro" : "Fast · deepseek-v4-flash"}</strong><span>{tab === "quiz" ? "生成后先预览" : "校验后追加到学习库，不替换旧内容"}{settings.qualityReview ? " · 启用质量复核" : ""}</span></div>
              {busy ? <Button variant="secondary" onClick={cancel}><X size={17} />取消生成</Button> : <Button disabled={configurationUnavailable || busyOperation !== null} onClick={() => void generateCurrent()}><Sparkles size={18} />{tab === "words" ? "生成并加入词库" : tab === "grammar" ? "生成并加入语法库" : "开始生成"}</Button>}
            </div>
          )}

          {tab === "history" && (
            <div className="ai-history-section">
              <div className="ai-history-filters"><label>类型 <select value={historyKind} onChange={(event) => setHistoryKind(event.target.value as typeof historyKind)}><option value="all">全部</option><option value="words">单词</option><option value="grammar">语法</option><option value="quiz">练习题</option><option value="explanation">错因解释</option></select></label><label>状态 <select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}><option value="all">全部</option><option value="succeeded">成功</option><option value="partial">部分成功</option><option value="failed">失败</option><option value="cancelled">已取消</option></select></label></div>
              {history.length === 0 ? <EmptyState title="还没有 AI 生成记录" description="完成一次生成后，模型、耗时、token、校验和保存状态会记录在这里。" /> : <div className="ai-history-list">{history.map((item) => { const usage = snapshot.aiUsage.find((row) => row.id === item.usageId); return <article className="ai-history-row" key={item.id}><span className={`ai-status-dot ${item.status}`} /><div><strong>{KIND_LABEL[item.kind]} · {statusLabel(item.status)}</strong><p>{item.previewLabels.join("、") || item.errorMessage || "无内容预览"}</p><small>{formatDate(item.completedAt)} · {item.model} · {item.acceptedCount}/{item.requestedCount} 通过 · {item.saveMode === "saved" ? "已保存" : "临时"} · 校验 {item.validationStatus}{usage ? ` · ${usage.durationMs}ms · ${usage.totalTokens} tokens · 重试 ${usage.retryCount}` : ""}</small></div><div className="ai-history-actions">{item.kind !== "explanation" && <button className="text-button" onClick={() => retryFromHistory(item)}><RotateCcw size={15} />复用参数</button>}{item.saveMode === "saved" && <button className="text-button" onClick={() => { if (window.confirm("将这批 AI 内容移出学习库并恢复为临时记录？相关学习记录也会被移除。")) void undoAIGeneration(item.id); }}><Undo2 size={15} />移出内容库</button>}<button className="text-button danger-text" onClick={() => { if (window.confirm(item.saveMode === "saved" ? "删除历史记录？已保存的生成内容默认保留。" : "删除这条历史记录？")) void removeAIGeneration(item.id, false); }}><Trash2 size={15} />删除记录</button></div></article>; })}</div>}
            </div>
          )}
        </article>

        <aside className="ai-usage-column">
          <article className="card ai-usage-card"><span className="section-kicker">USAGE</span><h2>AI 使用概览</h2><div className="ai-usage-grid"><div><span>今日请求</span><strong>{usageSummary.todayRequests}</strong></div><div><span>本月请求</span><strong>{usageSummary.monthRequests}</strong></div><div><span>今日 token</span><strong>{usageSummary.todayTokens}</strong></div><div><span>成功率</span><strong>{usageSummary.successRate}%</strong></div></div><p>平均耗时 {usageSummary.averageDurationMs} ms{usageSummary.lastError ? ` · 最近错误：${usageSummary.lastError}` : ""}</p></article>
          <article className="card ai-privacy-card"><BrainCircuit size={24} /><h3>发送什么？</h3><p>生成词汇和语法只发送表单参数与去重摘要；出题只发送最多 100 条相关学习内容摘要；密钥仅随加密的单次服务端动作传输，不进入学习数据库。</p><Link href="/settings#deepseek-ai">查看连接与密钥设置</Link></article>
        </aside>
      </section>

      {busy && <section className="card ai-generation-progress" role="status"><LoaderCircle className="spin" size={24} /><div><strong>DeepSeek 正在生成并校验内容</strong><p>请求可能包含结构修复或质量复核；你可以安全取消。</p></div><button className="text-button" onClick={cancel}><X size={16} />取消</button></section>}
      {error && !busy && <section className="inline-alert error" role="alert"><AlertTriangle size={19} /><div><strong>本次生成没有完成</strong><p>{error.message}</p></div><Button variant="secondary" disabled={busyOperation !== null} onClick={() => void generateCurrent()}><RotateCcw size={16} />重试</Button></section>}

      {result && result.kind === tab && (
        <section className="ai-result-section">
          <div className="section-title-row"><div><span className="section-kicker">VALIDATED RESULT</span><h2>{result.kind === "words" ? `本次新增 ${result.payload.words?.length ?? 0} 组词汇` : result.kind === "grammar" ? `本次新增 ${(result.payload.grammar?.length ?? 0) + (result.payload.comparisons?.length ?? 0)} 个语法内容` : result.payload.generation.status === "partial" ? "部分内容通过校验" : "生成与校验已完成"}</h2><p>{result.payload.generation.acceptedCount} 项通过 · {result.payload.generation.rejectedCount} 项拒绝 · {result.payload.generation.model}{result.kind === "words" ? ` · 当前总词库 ${allWords.length} 组（AI ${snapshot.aiWords.length}）` : result.kind === "grammar" ? ` · 当前语法库 ${allGrammar.length + allComparisons.length} 项（AI ${snapshot.aiGrammar.length + snapshot.aiComparisons.length}）` : ""}</p></div><div className="page-actions">{!result.saved && result.kind !== "quiz" && <Button onClick={() => void saveTransient()}><Save size={17} />保存到学习库</Button>}{result.saved && result.kind === "words" && <Link className="button button-secondary" href="/words"><Play size={17} />去背新增单词</Link>}{result.saved && result.kind === "grammar" && <Link className="button button-secondary" href="/grammar"><Play size={17} />去学新增语法</Link>}{result.saved && result.kind !== "quiz" && <Button variant="secondary" onClick={() => void undoLastSave()}><Undo2 size={17} />撤销本批新增</Button>}</div></div>

          {result.payload.rejectedReasons && result.payload.rejectedReasons.length > 0 && <details className="ai-rejection-details"><summary><AlertTriangle size={16} />查看未通过项的原因</summary><ul>{result.payload.rejectedReasons.map((reason, index) => <li key={`${reason}-${index}`}>{reason}</li>)}</ul></details>}

          {result.payload.words && <div className="ai-preview-grid">{result.payload.words.map((word) => <article className="card ai-preview-card" key={word.id}><div className="tag-row"><span>已加入词库</span><span>{word.japanese.difficulty}</span><span>{word.english.difficulty}</span><span>{word.frequency}</span></div><h3>{word.meaningZh}</h3><p><b>日</b> {word.japanese.term} <small>{word.japanese.reading}</small></p><p><b>英</b> {word.english.term} <small>{word.english.phonetic}</small></p><p>{word.note}</p><div className="ai-card-actions"><button className="text-button" onClick={() => void reportContent("word", word.id, word.aiMetadata?.generationId ?? result.payload.generation.id)}>反馈问题</button>{result.saved && <button className="text-button danger-text" onClick={() => void removeAIContent([`word:${word.id}`])}><Trash2 size={14} />删除</button>}</div></article>)}</div>}
          {result.payload.grammar && <div className="ai-preview-grid">{result.payload.grammar.map((point) => <article className="card ai-preview-card" key={point.id}><div className="tag-row"><span>已加入语法库</span><span>{point.language === "japanese" ? "日语" : "英语"}</span><span>{point.level}</span></div><h3>{point.title}</h3><p>{point.explanation}</p><strong>{point.structure}</strong><div className="ai-card-actions"><button className="text-button" onClick={() => void reportContent("grammar", point.id, point.aiMetadata?.generationId ?? result.payload.generation.id)}>反馈问题</button>{result.saved && <button className="text-button danger-text" onClick={() => void removeAIContent([`grammar:${point.id}`])}><Trash2 size={14} />删除</button>}</div></article>)}</div>}
          {result.payload.comparisons && <div className="ai-preview-grid">{result.payload.comparisons.map((item) => <article className="card ai-preview-card" key={item.id}><div className="tag-row"><span>已加入语法库</span><span>日英对比</span><span>{item.level}</span></div><h3>{item.semantic}</h3><p><b>日</b> {item.japanese}</p><p><b>英</b> {item.english}</p><p>{item.difference}</p><div className="ai-card-actions"><button className="text-button" onClick={() => void reportContent("comparison", item.id, item.aiMetadata?.generationId ?? result.payload.generation.id)}>反馈问题</button>{result.saved && <button className="text-button danger-text" onClick={() => void removeAIContent([`comparison:${item.id}`])}><Trash2 size={14} />删除</button>}</div></article>)}</div>}
          {result.payload.questions && <div className="ai-quiz-preview"><div className="ai-collection-save"><label><span>练习集名称</span><input value={collectionTitle} onChange={(event) => setCollectionTitle(event.target.value)} placeholder="例如：本周错题强化" maxLength={60} /></label>{result.kind === "quiz" && !result.collection && <Button onClick={() => void saveQuizCollection(collectionTitle)}><Save size={17} />保存练习集</Button>}{result.kind === "quiz" && result.collection && <Link className="button button-primary" href={`/test?collection=${encodeURIComponent(result.collection.id)}`}><Play size={17} />开始练习</Link>}</div>{result.payload.questions.map((question, index) => <article className="card ai-question-preview" key={question.id}><span>{index + 1}</span><div><strong>{question.prompt}</strong><ol>{question.options.map((option, optionIndex) => <li className={optionIndex === question.correctIndex ? "correct-text" : ""} key={`${option}-${optionIndex}`}>{option}</li>)}</ol><p>{question.explanation}</p></div></article>)}</div>}
          <div className="ai-result-meta"><CheckCircle2 size={17} /><span>Schema 与本地内容规则已校验 · Prompt {result.payload.generation.promptName} {result.payload.generation.promptVersion}</span><Clock3 size={16} /><span>{formatDate(result.payload.generation.completedAt)}</span></div>
        </section>
      )}
    </div>
  );
}
