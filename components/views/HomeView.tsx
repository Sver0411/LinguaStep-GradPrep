"use client";
/* eslint-disable @next/next/no-img-element */
import { STANDALONE_TESTS_ENABLED } from "@/lib/features";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, Settings2 } from "lucide-react";
import { useLearning } from "@/context/learning";
import { calculateDailyPlanProgress } from "@/lib/daily-plan";
import { calculateStreak, dateKey } from "@/lib/learning";
import { getNextLearningAction } from "@/lib/learning-flow";
import { getWordBook, validWordBook } from "@/lib/word-books";
import { mobileHref, mobileHrefForStep } from "@/components/mobile/navigation";

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/+$/, "");
export function HomeView({ mobile = false }: { mobile?: boolean }) {
  const { snapshot, settings, rebuildTodayPlan } = useLearning();
  const today = dateKey(new Date());
  const plan = snapshot.dailyPlans.find((item) => item.date === today);
  const record = snapshot.dailyRecords.find((item) => item.date === today);
  const book = getWordBook(validWordBook(settings.studyWordBook))!;
  const progress = plan ? calculateDailyPlanProgress(plan, record) : null;
  const next = getNextLearningAction(snapshot, today);
  const finished = Boolean(plan) && next.step === "complete";
  const mode = plan?.studyMode ?? settings.defaultStudyMode;
  const bookQuery = `book=${book.id}&mode=${mode}`;
  const wordHref = (source: string) => `/words?${bookQuery}&${source}${mobile ? "&mobile=study" : ""}`;
  const libraryHref = mobile ? mobileHref("/words", { mobile: "library" }) : "/words";
  const nextHref = !plan || finished ? libraryHref : mobile ? mobileHrefForStep(next, mode) : next.href;
  const streak = calculateStreak(snapshot.dailyRecords.filter((item) => item.wordsStudied + item.grammarStudied + item.questionsAnswered > 0).map((item) => item.date), today);
  const tasks = [
    { label: "到期复习", done: progress?.reviewCompleted ?? 0, total: plan?.reviewWordIds.length ?? 0, href: wordHref("review=1") },
    { label: "今日新词", done: progress?.newCompleted ?? 0, total: plan?.newWordIds.length ?? 0, href: wordHref("plan=new") },
    { label: "语法", done: progress?.grammarCompleted ?? 0, total: plan?.grammarIds.length ?? 0, href: mobile ? "/grammar?mobile=practice&today=1" : "/grammar?today=1" },
    { label: "测试", done: progress?.testCompleted ?? 0, total: plan?.testTarget ?? 0, href: mobile ? "/test?mobile=practice" : "/test?source=today&start=1" },
  ].filter((task) => STANDALONE_TESTS_ENABLED || task.label !== "测试");
  const mistakeCount = snapshot.mistakes.filter((item) => item.active).length;
  return <main className={`home-simple${mobile ? " home-simple-mobile" : ""}`}>
    <header className="home-simple-header"><div><h1>今日</h1><time dateTime={today}>{today.replaceAll("-", ".")}</time></div><Link className="home-settings-link" href="/settings" aria-label="学习设置"><Settings2 size={20} /></Link></header>
    <section className="home-current-book" aria-label="当前词书">
      <img src={`${BASE_PATH}${book.cover}`} alt={`${book.title}封面`} />
      <div className="home-current-content"><div className="home-current-title"><h2>{book.title}</h2><Link href={libraryHref}>换书<ChevronRight size={15} /></Link></div><p>{book.wordCount.toLocaleString()} 词 · {mode === "combined" ? "日英对照" : mode === "japanese" ? "日语" : "英语"}</p><Link className="button button-primary" href={nextHref}>{finished ? "选择单词" : !plan ? "开始背词" : next.label.replace("继续：", "")}<ArrowRight size={18} /></Link></div>
    </section>
    <section className="home-today-tasks" aria-label="今日任务">
      <div className="home-section-heading"><h2>今日任务</h2><Link href="/settings">调整计划</Link></div>
      {plan ? <><div className="home-task-progress" role="progressbar" aria-label="今日任务进度" aria-valuenow={Math.round(progress?.percent ?? 0)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress?.percent ?? 0}%` }} /></div><div className="home-task-rows">{tasks.map((task) => <Link href={task.href} key={task.label}><span>{task.label}</span><strong>{Math.min(task.done, task.total)}<small> / {task.total}</small></strong><ChevronRight size={17} /></Link>)}</div></> : <button className="button button-secondary" onClick={() => void rebuildTodayPlan()}>生成今日计划</button>}
    </section>
    <div className="home-record-line" aria-label="今日学习记录"><span>已学 <b>{record?.wordsStudied ?? 0}</b> 词</span><span>已答 <b>{record?.questionsAnswered ?? 0}</b> 题</span><span>连续 <b>{streak}</b> 天</span></div>
    <nav className="home-shortcuts" aria-label="学习工具"><Link href={libraryHref}><BookOpen size={19} />词书<ChevronRight size={16} /></Link><Link href="/mistakes">错题本{mistakeCount > 0 && <span>{mistakeCount}</span>}<ChevronRight size={16} /></Link><Link href="/stats">学习记录<ChevronRight size={16} /></Link><Link href="/resources">资料<ChevronRight size={16} /></Link></nav>
  </main>;
}
