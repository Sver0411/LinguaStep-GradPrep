"use client";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Heart, NotebookPen, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLearning } from "@/context/learning";
import { GrammarReading } from "./GrammarReading";
import { GRAMMAR_COURSES, grammarCourse, grammarInCourse } from "@/lib/grammar-courses";
import { shuffled } from "@/lib/shuffle";
import { dateKey } from "@/lib/learning";
import type { GrammarPoint } from "@/lib/models";
import type { NavParams } from "@/components/mobile/navigation";
const name = (point: GrammarPoint) => point.structure || point.title.split("：")[0];

export function GrammarWorkspace({ mobile = false, params }: { mobile?: boolean; params?: NavParams }) {
  const { allGrammar, snapshot, settings, ready, updateSettings, rebuildTodayPlan, isFavorite, toggleFavorite } = useLearning();
  const [courseId, setCourseId] = useState(() => grammarCourse(settings.grammarCourse).id);
  const [choosing, setChoosing] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [order, setOrder] = useState(settings.grammarStudyOrder ?? "sequential");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const initialized = useRef(false);
  const course = grammarCourse(courseId);
  const progress = useMemo(() => new Map(snapshot.grammarProgress.map((item) => [item.grammarId, item])), [snapshot.grammarProgress]);
  const points = useMemo(() => allGrammar.filter((point) => grammarInCourse(point, courseId)), [allGrammar, courseId]);
  const selected = allGrammar.find((point) => point.id === selectedId);
  const learned = points.filter((point) => progress.has(point.id)).length;
  const fresh = points.filter((point) => !progress.has(point.id));
  const due = points.filter((point) => {
    const state = progress.get(point.id);
    return state && Date.parse(state.nextReviewAt) <= Date.now();
  }).sort((a,b) => (progress.get(a.id)?.nextReviewAt ?? "").localeCompare(progress.get(b.id)?.nextReviewAt ?? ""));
  const filtered = useMemo(() => points.filter((point) => {
    const state = progress.get(point.id);
    if (status === "new" && state || status === "learned" && !state || status === "mastered" && state?.status !== "mastered") return false;
    const text = query.trim().toLowerCase();
    return !text || [point.title, point.connection, ...point.examples.flatMap((example) => [example.text, example.translationZh])].some((value) => value.toLowerCase().includes(text));
  }), [points, progress, query, status]);

  useEffect(() => {
    if (ready === false || initialized.current) return;
    const search = params ?? new URLSearchParams(window.location.search);
    const id = search.get("id");
    const today = snapshot.dailyPlans.find((plan) => plan.date === dateKey(new Date()));
    const todayCount = Math.max(0, (snapshot.dailyRecords.find((record) => record.date === dateKey(new Date()))?.grammarStudied ?? 0) - (today?.completedBeforePlan?.grammar ?? 0));
    const direct = allGrammar.find((point) => point.id === (id ?? (search.get("today") === "1" ? today?.grammarIds[todayCount] : undefined)));
    const timer = window.setTimeout(() => {
      if (initialized.current) return;
      initialized.current = true;
      setOrder(settings.grammarStudyOrder ?? "sequential");
      if (direct) {
        setCourseId(GRAMMAR_COURSES.find((item) => grammarInCourse(direct, item.id))?.id ?? courseId);
        setSelectedId(direct.id);
      } else setCourseId(grammarCourse(settings.grammarCourse).id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [allGrammar, courseId, params, ready, settings.grammarCourse, settings.grammarStudyOrder, snapshot.dailyPlans, snapshot.dailyRecords]);

  useEffect(() => {
    const exit = () => { setSelectedId(null); setRemaining([]); };
    window.addEventListener("linguastep:exit-session", exit);
    return () => window.removeEventListener("linguastep:exit-session", exit);
  }, []);
  const changeCourse = (id: string) => {
    initialized.current = true; setCourseId(id); setChoosing(false); setBrowsing(false); setQuery(""); setStatus("all"); setNotice("");
    updateSettings({ grammarCourse: id }); void rebuildTodayPlan();
  };
  const open = (point: GrammarPoint) => { initialized.current = true; setSelectedId(point.id); setRemaining([]); setNotice(""); };
  const start = (review = false) => {
    const candidates = review ? due : order === "random" ? shuffled(fresh) : fresh;
    if (!candidates.length) { setNotice(review ? "暂无到期复习。" : "本册已学完，可浏览目录或复习到期内容。"); return; }
    const size = Math.max(1, settings.dailyGrammarCount);
    const queue = candidates.slice(0, size);
    setSelectedId(queue[0].id); setRemaining(queue.slice(1).map((point) => point.id)); setNotice("");
  };
  const close = () => { setSelectedId(null); setRemaining([]); };
  const next = () => {
    if (remaining.length) { setSelectedId(remaining[0]); setRemaining(remaining.slice(1)); }
    else { setSelectedId(null); setNotice("本轮学习已完成。"); }
  };


  if (selected) return <main className={`grammar-workspace learning-workspace grammar-reading${mobile ? " grammar-mobile" : ""}`}>
    <header className="grammar-reading-header"><button className="text-button" onClick={close}><ArrowLeft size={17} />返回语法</button><button type="button" className={`favorite-button${isFavorite("grammar",selected.id) ? " active" : ""}`} onClick={() => void toggleFavorite("grammar",selected.id)} aria-label={isFavorite("grammar",selected.id) ? "取消收藏语法" : "收藏语法"}><Heart size={20} fill={isFavorite("grammar",selected.id) ? "currentColor" : "none"} /></button></header>
    <GrammarReading key={selected.id} point={selected} onRead={next} status={progress.get(selected.id)?.status === "mastered" ? "已掌握" : progress.has(selected.id) ? "学习中" : "未学习"} />
  </main>;

  return <main className={`grammar-workspace learning-workspace${mobile ? " grammar-mobile" : ""}`}>
    {choosing ? <><header className="grammar-section-heading"><h1>选择语法</h1><button className="text-button" onClick={() => setChoosing(false)}>取消</button></header><div className="grammar-course-grid">{GRAMMAR_COURSES.map((item) => {
      const list = allGrammar.filter((point) => grammarInCourse(point,item.id));
      return <button key={item.id} type="button" onClick={() => changeCourse(item.id)} className={`grammar-course-option${item.id === courseId ? " current" : ""}`}><span>{item.label}</span><h2>{item.title}</h2><p>{list.length} 条 · 已学 {list.filter((point) => progress.has(point.id)).length}</p>{item.id === courseId && <Check size={18} />}</button>;
    })}</div></> : <>
      <section className="grammar-current-course learning-overview"><button className="grammar-course-mark learning-cover" onClick={() => setBrowsing((value) => !value)} aria-label="浏览本册语法" aria-expanded={browsing}>{course.label}</button><div><h1>{course.title}</h1><p>{points.length} 条 · 已学 {learned}</p><div className="book-progress-track"><span style={{width:`${learned/Math.max(1,points.length)*100}%`}} /></div><div className="grammar-course-actions"><button className="text-button" onClick={() => setBrowsing((value) => !value)}>{browsing ? "收起目录" : "浏览语法"}</button><button className="text-button" onClick={() => {initialized.current = true; setChoosing(true);}}>切换</button></div></div></section>
      <details className="grammar-settings learning-settings card"><summary><span>学习设置</span><span>{order === "random" ? "随机" : "顺序"} · 每轮 {settings.dailyGrammarCount} 条</span></summary><div><label><span>学习顺序</span><select aria-label="语法学习顺序" value={order} onChange={(event) => { const value = event.target.value === "random" ? "random" : "sequential"; setOrder(value); updateSettings({grammarStudyOrder:value}); void rebuildTodayPlan(); }}><option value="sequential">顺序</option><option value="random">随机</option></select></label><label><span>每轮数量</span><select aria-label="每轮语法数量" value={settings.dailyGrammarCount} onChange={(event) => { updateSettings({dailyGrammarCount:Number(event.target.value)}); void rebuildTodayPlan(); }}>{[1,2,3,5,10].map((value) => <option key={value} value={value}>{value} 条</option>)}</select></label></div></details>
      <div className="grammar-study-actions learning-actions"><button className="button button-primary" onClick={() => start()}><NotebookPen size={18} />{learned ? "继续学习" : "开始学习"}<ArrowRight size={18} /></button><button className="button button-secondary" onClick={() => start(true)}>到期复习{due.length > 0 ? ` · ${due.length}` : ""}</button></div>
      {browsing && <section className="grammar-catalog" aria-label="语法目录"><div className="grammar-catalog-filters"><label className="search-field"><Search size={18} /><input aria-label="搜索语法" placeholder="搜索句型、含义或例句" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select aria-label="语法学习状态" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部</option><option value="new">未学习</option><option value="learned">已学习</option><option value="mastered">已掌握</option></select></div><div className="grammar-catalog-list">{filtered.map((point) => <button key={point.id} onClick={() => open(point)}><div><strong>{name(point)}</strong><p>{point.summary ?? point.explanation}</p></div><span>{progress.get(point.id)?.status === "mastered" ? "已掌握" : progress.has(point.id) ? "学习中" : "未学习"}</span><ChevronRight size={17} /></button>)}{!filtered.length && <p className="empty-state">没有找到匹配的语法。</p>}</div></section>}
    </>}
    {notice && <p className="grammar-notice" role="status">{notice}</p>}
  </main>;
}
