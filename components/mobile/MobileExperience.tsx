"use client";

/* Ported from the standalone LinguaStep-移动端 build and re-wired onto the main
   app's LearningContext, so the phone experience now shares one IndexedDB store
   with the desktop UI instead of keeping its own separate storage. */

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  CloudSun,
  Flame,
  Home,
  Languages,
  ListChecks,
  MapPin,
  MessageCircle,
  NotebookPen,
  Play,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  SquarePen,
  Timer,
  UserRound,
  X,
} from "lucide-react";
import { useLearning } from "@/context/LearningContext";
import {
  HIRAGANA_ROWS,
  KANA_TOTAL,
  KATAKANA_ROWS,
  REFERENCE_TOPICS,
  type ReferenceTopic,
} from "@/data/reference";
import {
  BOOK_VOCAB_SECTIONS,
  BOOK_VOCAB_WORDS,
} from "@/data/book-vocab-data";
import { SpeakButton } from "@/components/SpeakButton";
import {
  EXAM_QUESTIONS,
  EXAM_SECTION_LABELS,
  type ExamLanguage,
  type ExamQuestion,
  type ExamSection,
} from "@/data/exam-questions";
import { calculateDailyPlanProgress } from "@/lib/daily-plan";
import {
  calculateStreak,
  dateKey,
  getWordModeState,
  isAnswerCorrect,
} from "@/lib/learning";
import type { GrammarPoint, MasteryRating, StudyMode, TestAnswer, WordPair } from "@/lib/models";

const RESOURCE_TOPICS = REFERENCE_TOPICS;
type ResourceTopic = ReferenceTopic;
type NavParams = { get(name: string): string | null };

const KANA_TOPIC: ResourceTopic = {
  id: "kana",
  title: "五十音图",
  subtitle: "平假名与片假名的发音基础",
  tone: "lavender",
  entries: [],
};

let appRouter: ReturnType<typeof useRouter> | null = null;

function navigateTo(url: string) {
  if (appRouter) appRouter.push(url);
  else window.location.assign(url);
}

function mobileHref(path: string, values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

function modeLabel(mode: StudyMode) {
  if (mode === "japanese") return "日语词汇";
  if (mode === "english") return "英语词汇";
  return "日英混合";
}

function MobileHomeScreen() {
  const { snapshot, settings, allWords, allGrammar, rebuildTodayPlan } = useLearning();
  const [mode, setMode] = useState<StudyMode>(settings.defaultStudyMode);
  const [rebuilding, setRebuilding] = useState(false);
  const today = dateKey(new Date());
  const plan = snapshot.dailyPlans.find((item) => item.date === today);
  const record = snapshot.dailyRecords.find((item) => item.date === today);
  const progress = plan
    ? calculateDailyPlanProgress(plan, record)
    : { total: 0, completed: 0, percent: 0, reviewCompleted: 0, newCompleted: 0, testCompleted: 0 };
  const activityDates = snapshot.dailyRecords
    .filter((item) => item.wordsStudied + item.grammarStudied + item.questionsAnswered > 0)
    .map((item) => item.date);
  const streak = calculateStreak(activityDates, today);
  const wordMap = useMemo(() => new Map(allWords.map((word) => [word.id, word])), [allWords]);
  const grammarMap = useMemo(() => new Map(allGrammar.map((point) => [point.id, point])), [allGrammar]);
  const recentWord = [...snapshot.wordProgress]
    .filter((item) => item.lastStudiedAt)
    .sort((left, right) => right.lastStudiedAt.localeCompare(left.lastStudiedAt))
    .map((item) => wordMap.get(item.wordId))
    .find((item): item is WordPair => Boolean(item));
  const recentGrammar = [...snapshot.grammarProgress]
    .filter((item) => item.lastStudiedAt)
    .sort((left, right) => right.lastStudiedAt.localeCompare(left.lastStudiedAt))
    .map((item) => grammarMap.get(item.grammarId))
    .find((item) => Boolean(item));
  const reviewCount = plan?.reviewWordIds.length ?? 0;
  const newCount = plan?.newWordIds.length ?? settings.dailyNewWords;
  const testCount = plan?.testTarget ?? settings.dailyTestQuestions;
  const startStudy = async () => {
    if (!plan) {
      setRebuilding(true);
      try {
        await rebuildTodayPlan();
      } finally {
        setRebuilding(false);
      }
    }
    navigateTo(mobileHref("/words", { mobile: "study", source: "new", mode }));
  };
  const flow = [
    { label: "复习", complete: reviewCount > 0 && progress.reviewCompleted >= reviewCount },
    { label: "新词", complete: newCount > 0 && progress.newCompleted >= newCount },
    { label: "测试", complete: testCount > 0 && progress.testCompleted >= testCount },
  ];

  return (
    <main className="m2-page m2-home-page">
      <header className="m2-home-header">
        <div>
          <p className="m2-brand">LINGUASTEP</p>
          <h1>今天想学点什么？</h1>
          <span className="m2-streak"><Flame size={15} fill="currentColor" />{streak > 0 ? `连续学习 ${streak} 天` : "从今天开始学习"}</span>
        </div>
        <img className="m2-header-avatar" src="/mobile-art/profile-avatar-v2.jpg" alt="学习者头像" />
      </header>

      <section className="m2-study-hero" aria-label="今日学习计划">
        <img className="m2-study-hero-art" src="/mobile-art/home-fuji-v2.jpg" alt="富士山与晨光插画" />
        <div className="m2-study-hero-content">
          <div className="m2-card-title"><span>今日学习</span><small>{modeLabel(mode)}</small></div>
          <div className="m2-mode-switch" role="tablist" aria-label="学习语言">
            {(["japanese", "english", "combined"] as StudyMode[]).map((item) => <button className={mode === item ? "active" : ""} key={item} onClick={() => setMode(item)} role="tab" aria-selected={mode === item} type="button">{modeLabel(item)}</button>)}
          </div>
          <div className="m2-study-hero-focus">
            <span>{plan ? "今日计划" : "为你准备的默认计划"}</span>
            <strong>{plan ? `${progress.completed} / ${progress.total}` : `${newCount} 个新词`}</strong>
            <p>{plan ? `还剩 ${Math.max(0, progress.total - progress.completed)} 项任务` : "生成计划后即可开始"}</p>
          </div>
          <div className="m2-progress"><span style={{ width: `${plan ? progress.percent : 0}%` }} /></div>
          <div className="m2-study-summary"><span>待复习<b>{reviewCount}</b></span><span>新词<b>{newCount}</b></span><button disabled={rebuilding} onClick={() => void startStudy()} type="button"><Play size={17} fill="currentColor" />{rebuilding ? "准备中…" : "开始学习"}<ArrowRight size={17} /></button></div>
        </div>
      </section>

      <section className="m2-rhythm-card">
        <div className="m2-section-title"><h2>今日节奏</h2><span>{flow.filter((item) => item.complete).length} / 3</span></div>
        <div className="m2-rhythm-steps">{flow.map((item, index) => <div className={item.complete ? "done" : ""} key={item.label}><i>{item.complete ? "✓" : index + 1}</i><small>{item.label}</small></div>)}</div>
      </section>

      <section>
        <div className="m2-section-title"><h2>快速入口</h2></div>
        <div className="m2-quick-grid">
          <button onClick={() => navigateTo(mobileHref("/resources", { mobile: "topic", topic: "kana" }))} type="button"><span className="kana">あ</span><b>五十音</b></button>
          <button onClick={() => navigateTo(mobileHref("/resources", { mobile: "topic", topic: "expressions" }))} type="button"><span className="lavender"><MessageCircle size={25} /></span><b>常用表达</b></button>
          <button onClick={() => navigateTo(mobileHref("/mistakes", { mobile: "list" }))} type="button"><span className="coral"><CircleAlert size={25} /></span><b>错题本</b></button>
          <button onClick={() => navigateTo("/grammar")} type="button"><span className="mint"><NotebookPen size={25} /></span><b>语法练习</b></button>
        </div>
      </section>

      <section className="m2-recent-card">
        <div className="m2-section-title"><h2>最近学习</h2><button onClick={() => navigateTo(mobileHref("/words", { mobile: "library" }))} type="button">查看全部 <ChevronRight size={16} /></button></div>
        {recentWord || recentGrammar ? <div className="m2-recent-list">
          {recentGrammar && <button onClick={() => navigateTo(mobileHref("/grammar", { mobile: "practice", id: recentGrammar.id }))} className="m2-recent-row" type="button"><span className="m2-recent-icon kana">あ</span><div><b>{recentGrammar.title}</b><small>语法</small></div><ChevronRight size={17} /></button>}
          {recentWord && <button onClick={() => navigateTo(mobileHref("/words", { mobile: "study", word: recentWord.id, mode }))} className="m2-recent-row" type="button"><span className="m2-recent-icon mint">En</span><div><b>{mode === "japanese" ? recentWord.japanese.term : recentWord.english.term}</b><small>{recentWord.meaningZh}</small></div><ChevronRight size={17} /></button>}
        </div> : <div className="m2-empty-inline">还没有学习记录，完成第一组学习后会显示在这里。</div>}
      </section>
    </main>
  );
}

function MobilePracticeScreen() {
  const { snapshot, settings } = useLearning();
  const today = dateKey(new Date());
  const plan = snapshot.dailyPlans.find((item) => item.date === today);
  const record = snapshot.dailyRecords.find((item) => item.date === today);
  const target = plan?.testTarget ?? settings.dailyTestQuestions;
  const answered = Math.min(target, record?.questionsAnswered ?? 0);
  const remaining = Math.max(0, target - answered);
  const percent = target > 0 ? Math.round(answered / target * 100) : 0;
  const answers = snapshot.testResults.flatMap((item) => item.answers);
  const accuracy = answers.length > 0 ? Math.round(answers.filter((item) => item.isCorrect).length / answers.length * 100) : null;
  const mistakes = snapshot.mistakes.filter((item) => item.active).length;
  const quizLang = settings.defaultStudyMode === "english" ? "english" : "japanese";
  const quizLevel = settings.defaultStudyMode === "english" ? "CET-4" : "N3";
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const item = snapshot.dailyRecords.find((recordItem) => recordItem.date === dateKey(date));
    return (item?.questionsAnswered ?? 0) + (item?.wordsStudied ?? 0);
  });
  const maxWeekValue = Math.max(1, ...week);

  return (
    <main className="m2-page m2-practice-page">
      <header className="m2-topline"><div><p className="m2-brand">PRACTICE</p><h1>练习</h1></div><button onClick={() => navigateTo(mobileHref("/stats", { mobile: "stats" }))} type="button"><Timer size={19} />练习记录</button></header>
      <section className="m2-practice-hero">
        <img className="m2-practice-art" src="/mobile-art/practice-clipboard-v2.jpg" alt="练习剪贴板插画" />
        <div className="m2-card-title"><span>今日练习</span><small>{target} 题目标</small></div>
        <div className="m2-practice-count"><span>还剩</span><strong>{remaining}</strong><span>题</span></div>
        <div className="m2-progress"><span style={{ width: `${percent}%` }} /></div>
        <p>{answered} / {target} 已完成</p>
        <button onClick={() => navigateTo(mobileHref("/test", { mobile: "quiz", lang: quizLang, level: quizLevel, section: "characters", count: target }))} type="button"><Play size={17} fill="currentColor" />{remaining > 0 ? "继续练习" : "再练一组"}</button>
      </section>
      <section>
        <div className="m2-section-title"><h2>选择练习</h2></div>
        <div className="m2-practice-options">
          <button onClick={() => navigateTo(mobileHref("/test", { mobile: "setup" }))} type="button"><span className="mint"><Timer size={25} /></span><div><b>快速测验</b><small>{target} 题 · 根据你的计划</small></div><em>开始</em></button>
          <button onClick={() => navigateTo(mobileHref("/mistakes", { mobile: "list" }))} type="button"><span className="lavender"><CircleAlert size={25} /></span><div><b>错题巩固</b><small>{mistakes > 0 ? `${mistakes} 道需要处理` : "暂时没有活跃错题"}</small></div><em className="lavender">去巩固</em></button>
          <button onClick={() => navigateTo("/grammar")} type="button"><span className="coral"><NotebookPen size={25} /></span><div><b>语法即时练习</b><small>根据语法卡片完成小测</small></div><em className="coral">开始</em></button>
        </div>
      </section>
      <section className="m2-performance-card">
        <div><h2>本周表现</h2><b>{accuracy === null ? "暂无答题记录" : `正确率 ${accuracy}%`}</b><small>{accuracy === null ? "完成第一组练习后显示真实正确率" : `累计完成 ${answers.length} 题`}</small></div>
        <div className="m2-bars" aria-label="本周学习量">{week.map((value, index) => <span className={index === 6 ? "active" : ""} key={index} style={{ height: `${value === 0 ? 0 : value / maxWeekValue * 100}%` }} />)}</div>
      </section>
    </main>
  );
}

function ResourceGlyph({ id }: { id: string }) {
  if (id === "weekday-time") return <CalendarDays size={22} />;
  if (id === "numbers-units") return <Languages size={22} />;
  if (id === "expressions") return <MessageCircle size={22} />;
  if (id === "weather") return <CloudSun size={22} />;
  if (id === "places") return <MapPin size={22} />;
  if (id === "food-shopping") return <ShoppingBag size={22} />;
  return <NotebookPen size={22} />;
}

function MobileResourcesScreen() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => RESOURCE_TOPICS.filter((topic) => !query.trim() || [topic.title, topic.subtitle, ...topic.entries.flatMap((entry) => [entry.term, entry.meaning])].join(" ").toLowerCase().includes(query.trim().toLowerCase())), [query]);
  return <main className="m2-page m2-resources-page">
    <header className="m2-topline"><div><p className="m2-brand">REFERENCE</p><h1>资料</h1><small>随时查，随手学</small></div><button onClick={() => setSearchOpen((value) => !value)} type="button"><Search size={23} /></button></header>
    {searchOpen && <label className="m2-search"><Search size={17} /><input autoFocus onChange={(event) => setQuery(event.target.value)} placeholder="搜索五十音、星期或常用表达" value={query} /></label>}
    <button className="m2-kana-hero" onClick={() => navigateTo(mobileHref("/resources", { mobile: "topic", topic: "kana" }))} type="button"><img className="m2-kana-art" src="/mobile-art/resources-kana-v2.jpg" alt="五十音资料插画" /><div><h2>五十音图</h2><p>平假名与片假名</p><span>共 {KANA_TOTAL} 个基础假名</span><b>开始学习 <ArrowRight size={16} /></b></div></button>
    <section><div className="m2-section-title"><h2>日常日语</h2><span>{filtered.length} 组资料</span></div><div className="m2-resource-list">{filtered.slice(0, 3).map((topic) => <ResourceListRow key={topic.id} onOpen={() => navigateTo(mobileHref("/resources", { mobile: "topic", topic: topic.id }))} topic={topic} />)}</div></section>
    <section><div className="m2-section-title"><h2>更多资料</h2></div><div className="m2-resource-grid">{filtered.slice(3).map((topic) => <ResourceListRow key={topic.id} onOpen={() => navigateTo(mobileHref("/resources", { mobile: "topic", topic: topic.id }))} topic={topic} />)}</div></section>
  </main>;
}

function ResourceListRow({ topic, onOpen }: { topic: ResourceTopic; onOpen: () => void }) {
  return <button className="m2-resource-row" onClick={onOpen} type="button"><span className={`m2-topic-icon ${topic.tone}`}><ResourceGlyph id={topic.id} /></span><div><b>{topic.title}</b><small>{topic.subtitle}</small></div><ChevronRight size={19} /></button>;
}

function KanaColumn({ title, caption, rows }: { title: string; caption: string; rows: { character: string; romaji: string }[][] }) {
  return <section><div><h2>{title}</h2><span>{caption}</span></div><div className="m2-kana-detail-grid">{rows.flat().map((cell) => <span key={`${title}-${cell.character}`}>{cell.character}<small>{cell.romaji}</small></span>)}</div></section>;
}

function MobileResourceDetail({ topicId }: { topicId: string | null }) {
  const active = topicId === "kana" ? KANA_TOPIC : RESOURCE_TOPICS.find((topic) => topic.id === topicId);
  if (!active) return <main className="m3-page"><MobileSubHeader detail="REFERENCE" onBack={() => navigateTo("/resources")} title="资料不存在" /><div className="m3-empty-card"><BookOpen size={28} /><p>回到资料页选择一组内容。</p></div></main>;
  const activeIcon = active.id === "kana" ? <BookOpen size={22} /> : <ResourceGlyph id={active.id} />;
  return <main className="m3-page m2-resource-detail"><button className="m2-back" onClick={() => navigateTo("/resources")} type="button"><ChevronLeft size={19} />返回资料</button><header><span className={`m2-topic-icon ${active.tone}`}>{activeIcon}</span><div><p className="m2-brand">REFERENCE</p><h1>{active.title}</h1><small>{active.subtitle}</small></div></header>{active.id === "kana" ? <div className="m2-kana-detail-groups"><KanaColumn title="平假名" caption="46 个基础假名" rows={HIRAGANA_ROWS} /><KanaColumn title="片假名" caption="46 个基础假名" rows={KATAKANA_ROWS} /></div> : <div className="m2-entry-list">{active.entries.map((entry) => <article key={entry.term}><b>{entry.term}</b><span>{entry.meaning}</span></article>)}</div>}</main>;
}

function MobileProfileScreen() {
  const { snapshot, settings } = useLearning();
  const today = dateKey(new Date());
  const activeDates = snapshot.dailyRecords.filter((record) => record.wordsStudied + record.grammarStudied + record.questionsAnswered > 0).map((record) => record.date);
  const streak = calculateStreak(activeDates, today);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const record = snapshot.dailyRecords.find((item) => item.date === dateKey(date));
    return { label: "日一二三四五六"[date.getDay()], value: (record?.wordsStudied ?? 0) + (record?.questionsAnswered ?? 0) + (record?.grammarStudied ?? 0) };
  });
  const weekDays = week.filter((item) => item.value > 0).length;
  const totalQuestions = snapshot.dailyRecords.reduce((total, item) => total + item.questionsAnswered, 0);
  const maxWeekValue = Math.max(1, ...week.map((item) => item.value));
  return <main className="m2-page m2-profile-page">
    <header className="m2-topline"><div><p className="m2-brand">PROFILE</p><h1>我的</h1></div><button onClick={() => navigateTo(mobileHref("/settings", { mobile: "settings" }))} type="button">设置</button></header>
    <button className="m2-profile-card" onClick={() => navigateTo(mobileHref("/settings", { mobile: "settings" }))} type="button"><img src="/mobile-art/profile-avatar-v2.jpg" alt="学习者头像" /><div><b>LinguaStep 学习者</b><span>{streak > 0 ? `连续学习 ${streak} 天` : "开始记录你的学习节奏"}</span>{streak > 0 && <em><Flame size={14} fill="currentColor" />坚持中</em>}</div><ChevronRight size={21} /></button>
    <section><div className="m2-section-title"><h2>学习概览</h2><button onClick={() => navigateTo(mobileHref("/stats", { mobile: "stats" }))} type="button">查看学习记录 <ChevronRight size={16} /></button></div><article className="m2-overview-card"><div className="m2-overview-metrics"><span><CalendarDays size={17} /><small>本周学习</small><b>{weekDays} <i>天</i></b></span><span><BookOpen size={17} /><small>已学词汇</small><b>{snapshot.wordProgress.length} <i>个</i></b></span><span><ListChecks size={17} /><small>完成题目</small><b>{totalQuestions} <i>题</i></b></span></div><div className="m2-line-chart">{week.map((item, index) => <i className={index === 6 ? "active" : ""} key={`${item.label}-${index}`} style={{ height: `${item.value === 0 ? 0 : item.value / maxWeekValue * 100}%` }} />)}</div><div className="m2-chart-labels">{week.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}</div></article></section>
    <section><div className="m2-section-title"><h2>我的目标</h2><button onClick={() => navigateTo(mobileHref("/settings", { mobile: "settings" }))} type="button">调整目标 <ChevronRight size={16} /></button></div><article className="m2-goal-card"><div className="m2-goal-mark">{settings.defaultStudyMode === "english" ? "En" : settings.defaultStudyMode === "japanese" ? "日" : "日英"}</div><div><b>{modeLabel(settings.defaultStudyMode)}</b><small>每日 {settings.dailyNewWords} 个新词</small><div className="m2-goal-progress"><span style={{ width: `${Math.min(100, weekDays / 7 * 100)}%` }} /></div><p>本周完成 {weekDays} / 7 天</p></div></article></section>
    <section><div className="m2-section-title"><h2>偏好与管理</h2></div><div className="m2-profile-menu"><button onClick={() => navigateTo(mobileHref("/settings", { mobile: "settings" }))} type="button"><Settings size={19} />学习设置<ChevronRight size={18} /></button><button onClick={() => navigateTo(mobileHref("/stats", { mobile: "stats" }))} type="button"><ChartNoAxesCombined size={19} />学习统计<ChevronRight size={18} /></button><button onClick={() => navigateTo(mobileHref("/favorites", { mobile: "favorites" }))} type="button"><Clock3 size={19} />我的收藏<ChevronRight size={18} /></button></div></section>
  </main>;
}

function MobileSubHeader({ title, detail, onBack }: { title: string; detail: string; onBack: () => void }) {
  return <header className="m3-sub-header"><button aria-label="返回" className="m3-back" onClick={onBack} type="button"><ChevronLeft size={20} /></button><div><p>{detail}</p><h1>{title}</h1></div><span /></header>;
}

function MobileWordLibrary() {
  const { allWords, snapshot, isFavorite, toggleFavorite } = useLearning();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("core");
  const [limit, setLimit] = useState(36);
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  const progress = useMemo(() => new Map(snapshot.wordProgress.map((item) => [item.wordId, item])), [snapshot.wordProgress]);
  const matched = useMemo(
    () =>
      allWords.filter(
        (word) =>
          !normalized ||
          [word.japanese.term, word.english.term, word.meaningZh].some((value) =>
            value.toLocaleLowerCase("zh-CN").includes(normalized),
          ),
      ),
    [allWords, normalized],
  );
  const matchedBook = useMemo(() => {
    if (section === "core") return [];
    return BOOK_VOCAB_WORDS.filter((word) => word.section === section).filter(
      (word) =>
        !normalized ||
        [word.term, word.reading, word.meaningZh].some((value) =>
          value.toLocaleLowerCase("zh-CN").includes(normalized),
        ),
    );
  }, [normalized, section]);
  const totalCount = section === "core" ? matched.length : matchedBook.length;
  const visibleWords = matched.slice(0, limit);
  const visibleBook = matchedBook.slice(0, limit);
  const remaining = Math.max(0, totalCount - limit);
  const sectionLabel =
    BOOK_VOCAB_SECTIONS.find((item) => item.id === section)?.label ?? "核心词库";
  return (
    <main className="m3-page">
      <MobileSubHeader detail="WORD LIBRARY" onBack={() => navigateTo("/")} title="单词库" />
      <label className="m3-search">
        <Search size={17} />
        <input
          autoFocus
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(36);
          }}
          placeholder={section === "core" ? "搜索日语、英语或中文" : "搜索词书词汇、读音或释义"}
          value={query}
        />
      </label>
      <label className="m3-section-select">
        <span>来源分区</span>
        <select
          onChange={(event) => {
            setSection(event.target.value);
            setLimit(36);
          }}
          value={section}
        >
          <option value="core">核心词库（可背词）</option>
          {BOOK_VOCAB_SECTIONS.map((item) => (
            <option key={item.id} value={item.id}>{item.label}（查阅）</option>
          ))}
        </select>
      </label>
      <div className="m3-section-heading">
        <h2>{normalized ? "搜索结果" : section === "core" ? "全部词汇" : sectionLabel}</h2>
        <span>{totalCount} 条</span>
      </div>
      {section === "core" ? (
        <section className="m3-word-list">
          {visibleWords.map((word) => {
            const state = getWordModeState(progress.get(word.id), "japanese");
            return (
              <button
                key={word.id}
                onClick={() => navigateTo(mobileHref("/words", { mobile: "study", word: word.id, mode: "japanese" }))}
                type="button"
              >
                <span>{word.japanese.term}</span>
                <div>
                  <b>{word.meaningZh}</b>
                  <small>{word.english.term} · {state ? (state.status === "mastered" ? "已掌握" : "学习中") : "未学习"}</small>
                </div>
                <ChevronRight size={18} />
              </button>
            );
          })}
        </section>
      ) : (
        <section className="m3-book-vocab-list">
          {visibleBook.map((word) => (
            <article className="m3-book-vocab-card" key={word.id}>
              <div className="m3-book-vocab-head">
                <div>
                  <b>{word.term}</b>
                  <small>{word.reading}</small>
                </div>
                <div className="m3-book-vocab-actions">
                  <SpeakButton language="ja-JP" label={`朗读 ${word.term}`} text={word.term} />
                  <button
                    aria-label={`${isFavorite("vocab", word.id) ? "取消收藏" : "收藏"}${word.meaningZh}`}
                    className={`favorite-button${isFavorite("vocab", word.id) ? " active" : ""}`}
                    onClick={() => void toggleFavorite("vocab", word.id)}
                    type="button"
                  >
                    ♥
                  </button>
                </div>
              </div>
              <p>{word.meaningZh}</p>
              {word.english && <p className="m3-book-vocab-english"><span>英</span> {word.english}</p>}
              {word.exampleJp && <p className="m3-book-vocab-example">{word.exampleJp}</p>}
              {word.exampleEn && <p className="m3-book-vocab-example en">{word.exampleEn}</p>}
              <small>{word.pos ? `${word.pos} · ${word.source}` : word.source}</small>
            </article>
          ))}
        </section>
      )}
      {totalCount === 0 && <p className="m3-empty">没有找到匹配的词汇。</p>}
      {remaining > 0 && (
        <button className="m3-load-more" onClick={() => setLimit(limit + 36)} type="button">
          加载更多（还有 {remaining} 条）
        </button>
      )}
    </main>
  );
}

function selectedStudyWords(allWords: WordPair[], snapshot: ReturnType<typeof useLearning>["snapshot"], mode: StudyMode, source: string | null, wordId: string | null, roundSize: number) {
  if (wordId) return allWords.filter((word) => word.id === wordId);
  const plan = snapshot.dailyPlans.find((item) => item.date === dateKey(new Date()));
  if (source === "review") {
    const ids = plan?.reviewWordIds;
    const candidates = ids
      ? allWords.filter((word) => ids.includes(word.id))
      : allWords.filter((word) => {
          const state = getWordModeState(snapshot.wordProgress.find((item) => item.wordId === word.id), mode);
          return state !== undefined && state.status !== "mastered";
        });
    return candidates.slice(0, roundSize);
  }
  if (source === "favorites") {
    return allWords.filter((word) => snapshot.favorites.includes(`word:${word.id}`)).slice(0, roundSize);
  }
  const ids = plan?.newWordIds;
  const candidates = ids
    ? allWords.filter((word) => ids.includes(word.id))
    : allWords.filter((word) => !getWordModeState(snapshot.wordProgress.find((item) => item.wordId === word.id), mode));
  return candidates.slice(0, roundSize);
}

function MobileWordStudy({ params }: { params: NavParams }) {
  const { allWords, snapshot, settings, studyWord } = useLearning();
  const rawMode = params.get("mode");
  const mode: StudyMode = rawMode === "japanese" || rawMode === "english" ? rawMode : "combined";
  const words = useMemo(() => selectedStudyWords(allWords, snapshot, mode, params.get("source"), params.get("word"), settings.studyRoundSize), [allWords, mode, params, settings.studyRoundSize, snapshot]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ratings, setRatings] = useState<MasteryRating[]>([]);
  const word = words[index];
  const rate = async (rating: MasteryRating) => {
    if (!word || saving) return;
    setSaving(true);
    try {
      await studyWord(word.id, rating, mode);
      setRatings((value) => [...value, rating]);
      setIndex((value) => value + 1);
      setRevealed(false);
    } finally { setSaving(false); }
  };
  if (words.length === 0) return <main className="m3-page"><MobileSubHeader detail="WORD STUDY" onBack={() => navigateTo(mobileHref("/words", { mobile: "library" }))} title="没有可学习的单词" /><div className="m3-empty-card"><BookOpen size={28} /><h2>先从词库选择单词</h2><button className="m3-primary" onClick={() => navigateTo(mobileHref("/words", { mobile: "library" }))} type="button">浏览词库</button></div></main>;
  if (!word) return <main className="m3-page"><MobileSubHeader detail="WORD STUDY" onBack={() => navigateTo("/")} title="本轮完成" /><div className="m3-complete"><CheckCircle2 size={36} /><h2>完成 {ratings.length} 个单词</h2><p>已同步更新你的学习记录与复习安排。</p><button className="m3-primary" onClick={() => navigateTo("/")} type="button">回到首页</button><button className="m3-secondary" onClick={() => navigateTo(mobileHref("/words", { mobile: "library" }))} type="button">继续选词</button></div></main>;
  const primary = mode === "english" ? word.english : word.japanese;
  const primaryReading = mode === "japanese" ? word.japanese.reading : mode === "english" ? word.english.phonetic : undefined;
  return <main className="m3-page m3-study-session"><header className="m3-session-header"><button onClick={() => navigateTo("/")} type="button"><X size={19} />结束</button><span>{index + 1} / {words.length}</span></header><div className="m3-session-progress"><span style={{ width: `${(index + 1) / words.length * 100}%` }} /></div><article className="m3-flashcard"><span>{mode === "japanese" ? "日语词汇" : mode === "english" ? "英语词汇" : "日英对照"}</span><h1>{primary.term}</h1>{primaryReading && <p>{primaryReading}</p>}{mode === "combined" && <strong>{word.english.term}</strong>}{revealed && <div className="m3-answer"><b>{word.meaningZh}</b><p>{primary.example}</p><small>{primary.exampleZh}</small></div>}</article>{!revealed ? <button className="m3-primary m3-reveal" onClick={() => setRevealed(true)} type="button">揭示答案</button> : <div className="m3-rating-row"><button className="unknown" disabled={saving} onClick={() => void rate("unknown")} type="button">不认识</button><button className="fuzzy" disabled={saving} onClick={() => void rate("fuzzy")} type="button">模糊</button><button className="known" disabled={saving} onClick={() => void rate("known")} type="button">认识</button></div>}</main>;
}

function MobileGrammarHub({ params }: { params: NavParams }) {
  const { allGrammar, snapshot } = useLearning();
  const plan = snapshot.dailyPlans.find((item) => item.date === dateKey(new Date()));
  const planned = plan?.grammarIds.map((id) => allGrammar.find((item) => item.id === id)).filter((item): item is GrammarPoint => Boolean(item)) ?? [];
  const points = planned.length > 0 ? planned : allGrammar.slice(0, 16);
  if (params.get("mobile") === "practice") return <MobileGrammarPractice params={params} points={points} />;
  return <main className="m3-page"><MobileSubHeader detail="GRAMMAR" onBack={() => navigateTo("/")} title="语法练习" /><p className="m3-lead">从今天的语法计划开始，也可以任选一个知识点练习。</p><section className="m3-grammar-list">{points.map((point) => <button key={point.id} onClick={() => navigateTo(mobileHref("/grammar", { mobile: "practice", id: point.id }))} type="button"><span>{point.level}</span><div><b>{point.title}</b><small>{point.structure}</small></div><ChevronRight size={18} /></button>)}</section></main>;
}

function MobileGrammarPractice({ params, points }: { params: NavParams; points: GrammarPoint[] }) {
  const { completeGrammar } = useLearning();
  const point = points.find((item) => item.id === params.get("id")) ?? points[0];
  const questions = point?.exercises ?? [];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [complete, setComplete] = useState(false);
  const question = questions[index];
  const submit = async () => {
    if (!point || !question || selected === null) return;
    const nextAnswers = [...answers, { question, selectedIndex: selected, isCorrect: isAnswerCorrect(question, selected) }];
    if (index >= questions.length - 1) { await completeGrammar(point.id, nextAnswers); setAnswers(nextAnswers); setComplete(true); return; }
    setAnswers(nextAnswers); setIndex((value) => value + 1); setSelected(null);
  };
  if (!point || questions.length === 0) return <main className="m3-page"><MobileSubHeader detail="GRAMMAR" onBack={() => navigateTo("/grammar")} title="暂时没有练习题" /><div className="m3-empty-card"><NotebookPen size={28} /><p>换一个语法知识点再试试。</p></div></main>;
  if (complete) return <main className="m3-page"><MobileSubHeader detail="GRAMMAR" onBack={() => navigateTo("/grammar")} title="语法练习完成" /><div className="m3-complete"><CheckCircle2 size={36} /><h2>{point.title}</h2><p>答对 {answers.filter((item) => item.isCorrect).length} / {answers.length} 题，学习进度已保存。</p><button className="m3-primary" onClick={() => navigateTo("/grammar")} type="button">返回语法</button></div></main>;
  return <main className="m3-page m3-question-page"><header className="m3-session-header"><button onClick={() => navigateTo("/grammar")} type="button"><X size={19} />退出</button><span>{index + 1} / {questions.length}</span></header><div className="m3-session-progress"><span style={{ width: `${(index + 1) / questions.length * 100}%` }} /></div><article className="m3-question-card"><span>{point.title}</span><h1>{question.prompt}</h1><div className="m3-options">{question.options.map((option, optionIndex) => <button className={selected === optionIndex ? "selected" : ""} key={option} onClick={() => setSelected(optionIndex)} type="button"><i>{String.fromCharCode(65 + optionIndex)}</i>{option}</button>)}</div></article><button className="m3-primary" disabled={selected === null} onClick={() => void submit()} type="button">{index >= questions.length - 1 ? "完成练习" : "下一题"}<ArrowRight size={17} /></button></main>;
}

function MobileMistakes({ params }: { params: NavParams }) {
  const { snapshot, answerMistake } = useLearning();
  const mistakes = useMemo(() => snapshot.mistakes.filter((item) => item.active).sort((left, right) => right.priority - left.priority || right.lastWrongAt.localeCompare(left.lastWrongAt)), [snapshot.mistakes]);
  const selectedId = params.get("id");
  const active = mistakes.find((item) => item.id === selectedId) ?? mistakes[0];
  const [choice, setChoice] = useState<number | null>(null);
  const [saved, setSaved] = useState<boolean | null>(null);
  const review = params.get("mobile") === "review";
  const submit = async () => {
    if (!active || choice === null || saved !== null) return;
    await answerMistake(active.id, choice);
    setSaved(isAnswerCorrect(active.question, choice));
  };
  if (!review) return <main className="m3-page"><MobileSubHeader detail="MISTAKES" onBack={() => navigateTo("/test")} title="错题本" /><p className="m3-lead">只保留仍需要巩固的题目，掌握后会自动移出。</p>{mistakes.length === 0 ? <div className="m3-empty-card"><CheckCircle2 size={28} /><h2>暂时没有活跃错题</h2><button className="m3-primary" onClick={() => navigateTo("/test")} type="button">去做练习</button></div> : <section className="m3-mistake-list">{mistakes.map((item) => <button key={item.id} onClick={() => navigateTo(mobileHref("/mistakes", { mobile: "review", id: item.id }))} type="button"><span>#{item.priority}</span><div><b>{item.question.prompt}</b><small>累计错误 {item.errorCount} 次 · 正确连击 {item.correctStreak}</small></div><ChevronRight size={18} /></button>)}</section>}</main>;
  if (!active) return <main className="m3-page"><MobileSubHeader detail="MISTAKES" onBack={() => navigateTo(mobileHref("/mistakes", { mobile: "list" }))} title="没有待复习错题" /><div className="m3-empty-card"><CheckCircle2 size={28} /><p>继续保持。</p></div></main>;
  const question = active.question;
  return <main className="m3-page m3-question-page"><header className="m3-session-header"><button onClick={() => navigateTo(mobileHref("/mistakes", { mobile: "list" }))} type="button"><X size={19} />退出</button><span>错题巩固</span></header><article className="m3-question-card"><span>已错 {active.errorCount} 次</span><h1>{question.prompt}</h1><div className="m3-options">{question.options.map((option, index) => <button className={`${choice === index ? "selected" : ""}${saved !== null && index === question.correctIndex ? " correct" : ""}`} key={option} disabled={saved !== null} onClick={() => setChoice(index)} type="button"><i>{String.fromCharCode(65 + index)}</i>{option}</button>)}</div>{saved !== null && <div className={`m3-feedback ${saved ? "good" : "wrong"}`}><b>{saved ? "回答正确" : "再复习一次"}</b><p>{question.explanation}</p></div>}</article>{saved === null ? <button className="m3-primary" disabled={choice === null} onClick={() => void submit()} type="button">确认答案</button> : <button className="m3-primary" onClick={() => navigateTo(mobileHref("/mistakes", { mobile: "list" }))} type="button">返回错题本</button>}</main>;
}

function shuffledQuestions(pool: readonly ExamQuestion[], count: number) {
  const values = [...pool];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values.slice(0, count);
}

function MobileTestSetup() {
  const { settings } = useLearning();
  const [language, setLanguage] = useState<ExamLanguage>("japanese");
  const [level, setLevel] = useState("N3");
  const [section, setSection] = useState<ExamSection>("characters");
  const [count, setCount] = useState(settings.dailyTestQuestions);
  const levels = language === "japanese" ? ["N3", "N2", "N1"] : ["CET-4", "CET-6", "TOEIC"];
  const available = EXAM_QUESTIONS.filter((item) => item.examLanguage === language && item.examLevel === level && (language === "english" || item.examSection === section)).length;
  const availableReal = EXAM_QUESTIONS.filter((item) => item.examLanguage === language && item.examLevel === level && (language === "english" || item.examSection === section) && !item.id.includes("generated")).length;
  const launch = () => navigateTo(mobileHref("/test", { mobile: "quiz", lang: language, level, section, count: Math.min(count, available) }));
  return <main className="m3-page"><MobileSubHeader detail="PRACTICE SETUP" onBack={() => navigateTo("/test")} title="设置练习" /><section className="m3-card"><h2>练习语言</h2><div className="m3-segments"><button className={language === "japanese" ? "active" : ""} onClick={() => { setLanguage("japanese"); setLevel("N3"); }} type="button">日语</button><button className={language === "english" ? "active" : ""} onClick={() => { setLanguage("english"); setLevel("CET-4"); }} type="button">英语</button></div></section><section className="m3-card"><h2>等级</h2><div className="m3-chip-row">{levels.map((item) => <button className={level === item ? "active" : ""} key={item} onClick={() => setLevel(item)} type="button">{item}</button>)}</div>{language === "japanese" && <><h2 className="m3-card-subtitle">题型</h2><div className="m3-chip-row">{(["characters", "grammar", "reading"] as ExamSection[]).map((item) => <button className={section === item ? "active" : ""} key={item} onClick={() => setSection(item)} type="button">{EXAM_SECTION_LABELS[item]}</button>)}</div></>}</section><section className="m3-card"><h2>本次题数</h2><div className="m3-chip-row">{[10, 20, 30, 50].filter((item) => item <= Math.max(10, available)).map((item) => <button className={count === item ? "active" : ""} key={item} onClick={() => setCount(item)} type="button">{item} 题</button>)}</div><p className="m3-muted">本档共 {available} 题（真题 {availableReal} · 复习题 {available - availableReal}）</p></section><button className="m3-primary" disabled={available === 0} onClick={launch} type="button"><Play size={17} fill="currentColor" />开始练习</button></main>;
}

function MobileQuiz({ params }: { params: NavParams }) {
  const { completeTest } = useLearning();
  const language: ExamLanguage = params.get("lang") === "english" ? "english" : "japanese";
  const level = params.get("level") ?? (language === "japanese" ? "N3" : "CET-4");
  const rawSection = params.get("section");
  const section: ExamSection = rawSection === "grammar" || rawSection === "reading" ? rawSection : "characters";
  const requested = Number(params.get("count")) || 10;
  const pool = useMemo(() => EXAM_QUESTIONS.filter((item) => item.examLanguage === language && item.examLevel === level && (language === "english" || item.examSection === section)), [language, level, section]);
  const [questions] = useState(() => shuffledQuestions(pool, requested));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());
  const question = questions[index];
  const submit = async () => {
    if (!question || selected === null) return;
    const nextAnswers = [...answers, { question, selectedIndex: selected, isCorrect: isAnswerCorrect(question, selected) }];
    if (index >= questions.length - 1) { const stored = await completeTest(nextAnswers, { mode: language, sourceFilter: "all-learned", startedAt }); setResult({ correct: stored.correctCount, total: stored.answers.length }); return; }
    setAnswers(nextAnswers); setIndex((value) => value + 1); setSelected(null);
  };
  if (questions.length === 0) return <main className="m3-page"><MobileSubHeader detail="PRACTICE" onBack={() => navigateTo(mobileHref("/test", { mobile: "setup" }))} title="当前条件没有题目" /><div className="m3-empty-card"><CircleAlert size={28} /><p>请更换练习等级或题型。</p></div></main>;
  if (result) return <main className="m3-page"><MobileSubHeader detail="PRACTICE RESULT" onBack={() => navigateTo("/test")} title="练习完成" /><div className="m3-complete"><CheckCircle2 size={36} /><h2>{Math.round(result.correct / Math.max(1, result.total) * 100)}% 正确率</h2><p>答对 {result.correct} / {result.total} 题；错误题目已进入错题本。</p><button className="m3-primary" onClick={() => navigateTo("/test")} type="button">回到练习</button><button className="m3-secondary" onClick={() => navigateTo(mobileHref("/mistakes", { mobile: "list" }))} type="button">查看错题</button></div></main>;
  return <main className="m3-page m3-question-page"><header className="m3-session-header"><button onClick={() => navigateTo("/test")} type="button"><X size={19} />退出</button><span>{index + 1} / {questions.length}</span></header><div className="m3-session-progress"><span style={{ width: `${(index + 1) / questions.length * 100}%` }} /></div><article className="m3-question-card"><span>{language === "japanese" ? `${level} · ${EXAM_SECTION_LABELS[question.examSection]}` : level}</span>{question.context && <p className="m3-context">{question.context}</p>}<h1>{question.prompt}</h1><div className="m3-options">{question.options.map((option, optionIndex) => <button className={selected === optionIndex ? "selected" : ""} key={`${option}-${optionIndex}`} onClick={() => setSelected(optionIndex)} type="button"><i>{String.fromCharCode(65 + optionIndex)}</i>{option}</button>)}</div></article><button className="m3-primary" disabled={selected === null} onClick={() => void submit()} type="button">{index >= questions.length - 1 ? "提交练习" : "下一题"}<ArrowRight size={17} /></button></main>;
}

function MobileStats() {
  const { snapshot } = useLearning();
  const today = dateKey(new Date());
  const history = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const record = snapshot.dailyRecords.find((item) => item.date === dateKey(date));
    return { label: "日一二三四五六"[date.getDay()], value: (record?.wordsStudied ?? 0) + (record?.grammarStudied ?? 0) + (record?.questionsAnswered ?? 0) };
  });
  const max = Math.max(1, ...history.map((item) => item.value));
  const answers = snapshot.testResults.flatMap((item) => item.answers);
  const accuracy = answers.length > 0 ? Math.round(answers.filter((item) => item.isCorrect).length / answers.length * 100) : null;
  const todayRecord = snapshot.dailyRecords.find((item) => item.date === today);
  const activeDates = snapshot.dailyRecords.filter((item) => item.wordsStudied + item.grammarStudied + item.questionsAnswered > 0).map((item) => item.date);
  return <main className="m3-page"><MobileSubHeader detail="STATS" onBack={() => navigateTo("/profile")} title="学习记录" /><section className="m3-metric-grid"><article><small>连续学习</small><b>{calculateStreak(activeDates, today)}<i>天</i></b></article><article><small>已学词汇</small><b>{snapshot.wordProgress.length}<i>个</i></b></article><article><small>完成题目</small><b>{snapshot.dailyRecords.reduce((total, item) => total + item.questionsAnswered, 0)}<i>题</i></b></article></section><section className="m3-card"><div className="m3-section-heading"><h2>最近 7 天</h2><span>学习量</span></div><div className="m3-bar-chart">{history.map((item, index) => <div key={`${item.label}-${index}`}><i className={index === 6 ? "active" : ""} style={{ height: `${item.value === 0 ? 0 : item.value / max * 100}%` }} /><span>{item.label}</span></div>)}</div></section><section className="m3-card m3-stat-list"><div><span>今日学习</span><b>{(todayRecord?.wordsStudied ?? 0) + (todayRecord?.grammarStudied ?? 0)} 项</b></div><div><span>今日答题</span><b>{todayRecord?.questionsAnswered ?? 0} 题</b></div><div><span>历史正确率</span><b>{accuracy === null ? "暂无记录" : `${accuracy}%`}</b></div></section></main>;
}

function MobileSettings() {
  const { settings, updateSettings } = useLearning();
  return <main className="m3-page"><MobileSubHeader detail="SETTINGS" onBack={() => navigateTo("/profile")} title="学习设置" /><section className="m3-card"><div className="m3-section-heading"><h2>默认学习语言</h2></div><div className="m3-segments"><button className={settings.defaultStudyMode === "japanese" ? "active" : ""} onClick={() => updateSettings({ defaultStudyMode: "japanese" })} type="button">日语</button><button className={settings.defaultStudyMode === "english" ? "active" : ""} onClick={() => updateSettings({ defaultStudyMode: "english" })} type="button">英语</button><button className={settings.defaultStudyMode === "combined" ? "active" : ""} onClick={() => updateSettings({ defaultStudyMode: "combined" })} type="button">日英</button></div></section><section className="m3-card"><div className="m3-section-heading"><h2>每日新词</h2><span>{settings.dailyNewWords} 个</span></div><div className="m3-chip-row">{[10, 20, 30].map((count) => <button className={settings.dailyNewWords === count ? "active" : ""} key={count} onClick={() => updateSettings({ dailyNewWords: count })} type="button">{count} 个</button>)}</div></section><section className="m3-card"><div className="m3-section-heading"><h2>每日练习</h2><span>{settings.dailyTestQuestions} 题</span></div><div className="m3-chip-row">{[10, 20, 30, 50].map((count) => <button className={settings.dailyTestQuestions === count ? "active" : ""} key={count} onClick={() => updateSettings({ dailyTestQuestions: count })} type="button">{count} 题</button>)}</div></section><section className="m3-card m3-setting-note"><SlidersHorizontal size={20} /><div><b>设置会在生成下一份学习计划时生效</b><p>今天已生成的学习任务不会重复或遗漏。</p></div></section></main>;
}

function MobileFavorites() {
  const { allGrammar, allWords, snapshot } = useLearning();
  const words = allWords.filter((item) => snapshot.favorites.includes(`word:${item.id}`));
  const grammar = allGrammar.filter((item) => snapshot.favorites.includes(`grammar:${item.id}`));
  return <main className="m3-page"><MobileSubHeader detail="FAVORITES" onBack={() => navigateTo("/profile")} title="我的收藏" />{words.length + grammar.length === 0 ? <div className="m3-empty-card"><BookOpen size={28} /><h2>还没有收藏内容</h2><p>在单词或语法页收藏后会显示在这里。</p><button className="m3-primary" onClick={() => navigateTo(mobileHref("/words", { mobile: "library" }))} type="button">浏览词库</button></div> : <section className="m3-favorite-list">{words.map((word) => <button key={word.id} onClick={() => navigateTo(mobileHref("/words", { mobile: "study", word: word.id, mode: "japanese" }))} type="button"><span>词</span><div><b>{word.japanese.term}</b><small>{word.meaningZh}</small></div><ChevronRight size={18} /></button>)}{grammar.map((point) => <button key={point.id} onClick={() => navigateTo(mobileHref("/grammar", { mobile: "practice", id: point.id }))} type="button"><span>语</span><div><b>{point.title}</b><small>{point.structure}</small></div><ChevronRight size={18} /></button>)}</section>}</main>;
}

const TAB_ITEMS = [
  { href: "/", label: "首页", icon: Home },
  { href: "/test", label: "练习", icon: SquarePen },
  { href: "/resources", label: "资料", icon: BookOpenText },
  { href: "/profile", label: "我的", icon: UserRound },
] as const;

export function MobileApp() {
  const pathname = usePathname();
  return (
    <div className="m2-app">
      <Suspense fallback={null}>
        <MobileExperience />
      </Suspense>
      <nav className="m2-tabbar" aria-label="移动端主导航">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link aria-current={active ? "page" : undefined} className={`m2-tabbar-item${active ? " active" : ""}`} href={item.href} key={item.href}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function MobileExperience() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    appRouter = router;
  }, [router]);
  const section = pathname.split("/").filter(Boolean)[0] ?? "home";
  const params = searchParams ?? new URLSearchParams();
  if (section === "home") return <MobileHomeScreen />;
  if (section === "words") return params.get("mobile") === "study" ? <MobileWordStudy params={params} /> : <MobileWordLibrary />;
  if (section === "grammar") return <MobileGrammarHub params={params} />;
  if (section === "mistakes") return <MobileMistakes params={params} />;
  if (section === "test") return params.get("mobile") === "setup" ? <MobileTestSetup /> : params.get("mobile") === "quiz" ? <MobileQuiz params={params} /> : <MobilePracticeScreen />;
  if (section === "resources") return params.get("mobile") === "topic" ? <MobileResourceDetail topicId={params.get("topic")} /> : <MobileResourcesScreen />;
  if (section === "profile") return <MobileProfileScreen />;
  if (section === "stats") return <MobileStats />;
  if (section === "settings") return <MobileSettings />;
  if (section === "favorites") return <MobileFavorites />;
  return <MobileHomeScreen />;
}
