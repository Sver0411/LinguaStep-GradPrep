"use client";
import Link from "next/link";
import { useLearning } from "@/context/learning";
import { learningInsights } from "@/lib/learning-insights";
const labels: Record<string, string> = { "word-recognition": "词汇对应", characters: "词汇", grammar: "语法选择", reading: "阅读", listening: "听辨", dictation: "听写", cloze: "语法填空" };
export function LearningInsights() {
  const { snapshot, allWords, allGrammar } = useLearning();
  const insights = learningInsights(snapshot);
  return <section className="card m3-card learning-insights"><h2>学习效果</h2><p>自评回忆与客观练习分开统计；历史数据不补造回忆记录。</p>
    <div className="insight-grid">{insights.recognitionWindows.map((window) => <article key={window.days}><h3>近 {window.days} 天隔日词汇选择正确率</h3><strong>{window.percent === null ? "等待隔日练习" : `${window.percent}%`}</strong><p>答对 {window.success} / {window.total} 次；至少间隔 24 小时，同词同模式每天只计首次。</p></article>)}</div>
    <div className="insight-grid">{insights.windows.map((window) => <article key={window.days}><h3>近 {window.days} 天延迟自评回忆率</h3><strong>{window.percent === null ? "等待隔日复习" : `${window.percent}%`}</strong><p>认识 {window.success} / {window.total} 次；至少间隔 24 小时，每词每模式每天只计首次。</p></article>)}</div>
    <h3>题目首次作答</h3><p>{insights.firstTotal ? `${Math.round(insights.firstCorrect / insights.firstTotal * 100)}% · ${insights.firstCorrect} / ${insights.firstTotal}` : "暂无首次作答记录"}；同一道题的重复练习不会提高这一指标。</p>
    <div className="insight-grid">{insights.skills.map((item) => <article key={item.skill}><strong>{labels[item.skill] ?? item.skill}：{item.percent}%</strong><p>{item.correct} / {item.total} 首次答对</p><Link href={item.skill === "word-recognition" ? "/words" : item.skill in { listening: 1, dictation: 1, cloze: 1, reading: 1 } ? `/training?skill=${item.skill}` : "/test"}>练习这一项</Link></article>)}</div>
    <h3>反复出错的知识点</h3>{insights.repeatedMistakes.length ? insights.repeatedMistakes.map((item) => {
      const word = allWords.find((word) => word.id === item.contentRef.sourceId);
      const grammar = allGrammar.find((point) => point.id === item.contentRef.sourceId);
      return <article className="insight-mistake" key={item.id}><b>{word?.japanese.term ?? grammar?.title ?? item.question.prompt}</b><p>错误 {item.errorCount} 次 · {item.question.explanation}</p><Link href="/mistakes?review=1">巩固错题</Link>{word && <Link href={`/words?word=${encodeURIComponent(word.id)}&mobile=study&mode=japanese`}>复习词卡</Link>}{grammar && <Link href={`/grammar?mobile=practice&id=${encodeURIComponent(grammar.id)}`}>查看语法</Link>}</article>;
    }) : <p>暂时没有反复错误。</p>}
    <p>新词汇测验的“已掌握”要求多次隔日答对及足够的记忆稳定性；旧自评记录单独保留。选择题表现不等同于听力、阅读或完整考试能力。</p>
  </section>;
}
