"use client";
/* eslint-disable @next/next/no-img-element */
import { ArrowRight, BookOpen, Check, ListOrdered, Search, Shuffle, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLearning } from "@/context/learning";
import { BOOK_MEMBERSHIPS, WORD_BOOKS } from "@/data/word-books";
import { chooseBookWords, getWordBook, validWordBook, wordsInBook, type WordStudyOrder } from "@/lib/word-books";
import { dateKey, getWordModeState } from "@/lib/learning";
import type { StudyMode, WordPair } from "@/lib/models";
import { SpeakButton } from "@/components/SpeakButton";
import { WordStudySession } from "./WordStudySession";
import { navigateTo, mobileHref, type NavParams } from "@/components/mobile/navigation";

const PAGE_SIZE = 100;
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/+$/, "");
const MODES: Record<StudyMode, string> = { japanese: "日语", english: "英语", combined: "日英对照" };

export function WordBookshelf({ mobile = false, params }: { mobile?: boolean; params?: NavParams }) {
  const { allWords, snapshot, settings, ready, updateSettings, rebuildTodayPlan, setFocusMode } = useLearning();
  const [bookId, setBookId] = useState<string | null>(() => validWordBook(settings.studyWordBook));
  const [mode, setMode] = useState<StudyMode>(settings.defaultStudyMode);
  const [order, setOrder] = useState<WordStudyOrder>(settings.wordStudyOrder ?? "sequential");
  const [series, setSeries] = useState("all");
  const [level, setLevel] = useState("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<WordPair[] | null>(null);
  const [sessionNumber, setSessionNumber] = useState(0);
  const [notice, setNotice] = useState("");
  const [showWords, setShowWords] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const book = getWordBook(bookId ?? undefined);
  const rememberedBook = validWordBook(settings.studyWordBook);
  const progress = useMemo(() => new Map(snapshot.wordProgress.map((item) => [item.wordId, item])), [snapshot.wordProgress]);
  const bookWords = useMemo(() => wordsInBook(bookId ?? rememberedBook, allWords), [allWords, bookId, rememberedBook]);
  const normalized = query.trim().toLocaleLowerCase();
  const matched = useMemo(() => bookWords.filter((word) => !normalized || [word.japanese.term, word.japanese.reading, word.english.term, word.meaningZh].some((value) => value?.toLocaleLowerCase().includes(normalized))), [bookWords, normalized]);
  const chapters = useMemo(() => new Map(BOOK_MEMBERSHIPS[bookId ?? rememberedBook] ?? []), [bookId, rememberedBook]);
  const positions = useMemo(() => new Map(bookWords.map((word, index) => [word.id, index + 1])), [bookWords]);
  const visibleBooks = WORD_BOOKS.filter((item) => (series === "all" || item.series === series) && (level === "all" || item.level === level));
  const studiedCount = bookWords.filter((word) => getWordModeState(progress.get(word.id), mode)).length;

  const start = useCallback((source: "all" | "new" | "review" | "selected" = "all", selectedOrder = order, words = bookWords, selectedMode = mode) => {
    const next = chooseBookWords({ words, progress: snapshot.wordProgress, mode: selectedMode, order: selectedOrder, source, selectedIds: selected, limit: settings.studyRoundSize });
    if (!next.length) { setNotice(source === "review" ? "这本词书目前没有到期复习的词。" : source === "selected" ? "先勾选想背的词。" : "这一范围已经学完，可以选词重练或复习到期单词。"); return; }
    setMode(selectedMode); setItems(next); setSessionNumber((value) => value + 1); setFocusMode(true); setNotice("");
  }, [bookWords, mode, order, selected, settings.studyRoundSize, snapshot.wordProgress, setFocusMode]);

  useEffect(() => {
    if (initialized.current || ready === false) return;
    const search = params ?? new URLSearchParams(window.location.search);
    const requestedBook = validWordBook(search.get("book") ?? settings.studyWordBook);
    const requestedMode = search.get("mode");
    const useMode = requestedMode === "japanese" || requestedMode === "english" || requestedMode === "combined" ? requestedMode : settings.defaultStudyMode;
    const requestedOrder = search.get("order") === "random" ? "random" : search.get("order") === "sequential" ? "sequential" : settings.wordStudyOrder ?? "sequential";
    const direct = search.get("word");
    const auto = direct || search.get("review") === "1" || search.get("plan") === "new" || search.get("source") || search.get("study") === "1";
    const timer = window.setTimeout(() => {
      if (initialized.current) return;
      initialized.current = true;
      setBookId(requestedBook);
      setMode(useMode); setOrder(requestedOrder);
      if (direct) {
        const word = allWords.find((item) => item.id === direct);
        if (word) { setItems([word]); setMode(useMode); setFocusMode(true); }
        else setNotice("这个词已不在当前词书中，请重新选词。");
      } else if (auto) {
        let words = wordsInBook(requestedBook, allWords);
        const source = search.get("source") ?? (search.get("favorites") === "1" ? "favorites" : null);
        if (source === "favorites") words = allWords.filter((word) => snapshot.favorites.includes(`word:${word.id}`));
        if (search.get("plan") === "new" || source === "new") {
          const plan = snapshot.dailyPlans.find((item) => item.date === dateKey(new Date()));
          if (plan?.wordBookId === requestedBook) {
            const ids = new Set(plan.newWordIds); words = words.filter((word) => ids.has(word.id));
          }
        }
        start(search.get("review") === "1" || source === "review" ? "review" : source === "all" || source === "favorites" ? "all" : "new", requestedOrder, words, useMode);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [allWords, params, ready, settings.defaultStudyMode, settings.studyWordBook, settings.wordStudyOrder, snapshot.dailyPlans, snapshot.favorites, start, setFocusMode]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !showWords || items || !book || limit >= matched.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setLimit((current) => Math.min(current + PAGE_SIZE, matched.length));
    }, { rootMargin: "600px" });
    observer.observe(target); return () => observer.disconnect();
  }, [book, items, limit, matched.length, showWords]);

  const openBook = (id: string) => {
    initialized.current = true;
    setShowWords(false); setBookId(id); setQuery(""); setLimit(PAGE_SIZE); setSelected(new Set()); setNotice("");
    if (settings.studyWordBook !== id) {
      updateSettings({ studyWordBook: id });
      void rebuildTodayPlan();
    }
    window.scrollTo?.({ top: 0 });
  };
  const changeOrder = (next: WordStudyOrder) => { setOrder(next); updateSettings({ wordStudyOrder: next }); void rebuildTodayPlan(); };
  const changeMode = (next: StudyMode) => { setMode(next); updateSettings({ defaultStudyMode: next }); void rebuildTodayPlan(); };
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleRange = () => setSelected((current) => {
    const ids = new Set(matched.map((word) => word.id));
    return matched.every((word) => current.has(word.id))
      ? new Set([...current].filter((id) => !ids.has(id)))
      : new Set([...current, ...ids]);
  });
  const finish = useCallback(() => {
    initialized.current = true;
    setItems(null); setFocusMode(false);
    const search = params ?? new URLSearchParams(window.location.search);
    if (search.get("mobile") === "study" || ["source", "study", "word", "review", "plan", "favorites"].some((key) => search.get(key) !== null)) {
      navigateTo("/words", { replace: true });
    }
  }, [params, setFocusMode]);

  useEffect(() => {
    const exit = () => { if (items) finish(); };
    window.addEventListener("linguastep:exit-session", exit);
    return () => window.removeEventListener("linguastep:exit-session", exit);
  }, [finish, items]);

  if (items) return <WordStudySession key={sessionNumber} items={items} mode={mode} mobile={mobile}
    onFinish={finish} onRestart={() => start("all")}
    onReviewUnknown={(words) => { setItems(words); setSessionNumber((value) => value + 1); }}
    onContinuePlan={(href) => {
      const next = new URL(href, window.location.origin);
      if (next.pathname.endsWith("/words")) start(next.searchParams.get("review") === "1" ? "review" : "new");
      else navigateTo(mobile ? mobileHref(next.pathname, { mobile: "practice" }) : href);
    }} />;

  return <main className={`word-books-page${mobile ? " word-books-mobile m3-page" : " page-stack"}`}>
    {!book ? <>
      <header className="word-books-title"><div><h1>词书</h1></div><BookOpen size={30} /></header>
      <div className="book-shelf-filters">
        <div className="segmented-control" aria-label="词书系列">{[["all", "全部词书"], ["red", "红宝书"], ["green", "绿宝书"]].map(([id, label]) => <button key={id} type="button" className={series === id ? "active" : ""} onClick={() => setSeries(id)}>{label}</button>)}</div>
        <label><span className="sr-only">词书等级</span><select aria-label="词书等级" value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">全部等级</option>{["N5","N4","N3","N2","N1"].map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <section className="word-books-grid" aria-label="词书书架">{visibleBooks.map((item) => {
        const membership = BOOK_MEMBERSHIPS[item.id] ?? [];
        const learned = membership.filter(([id]) => getWordModeState(progress.get(id), settings.defaultStudyMode)).length;
        return <button className={`word-book-card ${item.series}${item.id === rememberedBook ? " current-book" : ""}`} key={item.id} type="button" onClick={() => openBook(item.id)} aria-label={`浏览${item.title}`}>
          <div className="word-book-cover"><img src={`${BASE_PATH}${item.cover}`} alt={`${item.title}封面`} loading="lazy" /><span>{item.level}</span>{item.id === rememberedBook && <b>正在学习</b>}</div>
          <div className="word-book-caption"><h2>{item.title}</h2><p>{item.wordCount.toLocaleString()} 词 · 已学 {learned.toLocaleString()}</p><div className="book-progress-track"><span style={{ width: `${learned / Math.max(1, item.wordCount) * 100}%` }} /></div><span>浏览选词 <ArrowRight size={14} /></span></div>
        </button>;
      })}</section>

    </> : <>
      <header className={`book-detail-heading book-overview ${book.series}`}>
        <button className="book-cover-button" type="button" aria-label="浏览本册单词" aria-expanded={showWords} onClick={() => setShowWords((value) => !value)}><img src={`${BASE_PATH}${book.cover}`} alt={`${book.title}封面`} /></button>
        <div className="book-overview-info"><h1>{book.title}</h1><p>{bookWords.length.toLocaleString()} 词 · 已学 {studiedCount.toLocaleString()}</p><div className="book-progress-track"><span style={{ width: `${studiedCount / Math.max(1, bookWords.length) * 100}%` }} /></div><div className="book-overview-actions"><button className="text-button" type="button" onClick={() => setShowWords((value) => !value)}>{showWords ? "收起词表" : "浏览单词"}</button><button className="text-button" type="button" onClick={() => { initialized.current = true; setBookId(null); setShowWords(false); setSelected(new Set()); setNotice(""); }}>换书</button></div></div>
      </header>
      <details className="book-study-controls card book-settings"><summary><span>学习设置</span><span>{MODES[mode]} · {order === "random" ? "随机" : "顺序"}</span></summary><div className="book-settings-content">
        <div className="book-control-line"><span>学习语言</span><div className="segmented-control">{(Object.keys(MODES) as StudyMode[]).map((item) => <button key={item} type="button" className={mode === item ? "active" : ""} onClick={() => changeMode(item)}>{MODES[item]}</button>)}</div></div>
        <div className="book-control-line"><span>背诵顺序</span><div className="segmented-control" aria-label="背诵顺序"><button type="button" className={order === "sequential" ? "active" : ""} onClick={() => changeOrder("sequential")}><ListOrdered size={16} />顺序</button><button type="button" className={order === "random" ? "active" : ""} onClick={() => changeOrder("random")}><Shuffle size={16} />随机</button></div></div>
      </div></details>
        <div className="book-start-actions"><button className="button button-primary" type="button" onClick={() => start("all")}><BookOpen size={17} />{order === "random" ? "随机背诵" : "顺序背诵"}</button><button className="button button-secondary" type="button" onClick={() => start("review")}>复习到期词</button></div>
      {showWords && <section className="book-word-browser" aria-label={`${book.title}全册词汇`}>
        <div className="book-browser-toolbar"><label className="search-field"><Search size={18} /><span className="sr-only">搜索本册词汇</span><input aria-label="搜索本册词汇" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(PAGE_SIZE); }} placeholder="搜索日语、读音、中文或英语" /></label><button className="text-button" type="button" onClick={toggleRange}>{matched.length && matched.every((word) => selected.has(word.id)) ? "取消全选" : "全选当前范围"}</button></div>
        <p className="book-list-count">{normalized ? `找到 ${matched.length} 词` : `全册 ${matched.length} 词，向下滚动浏览`} · 勾选后可单独背诵</p>
        <div className="book-word-list">{matched.slice(0, limit).map((word) => {
          const state = getWordModeState(progress.get(word.id), mode);
          return <article className={`book-word-row${selected.has(word.id) ? " selected" : ""}`} key={word.id}>
            <input id={`pick-${word.id}`} type="checkbox" aria-label={`选择${word.japanese.term}`} checked={selected.has(word.id)} onChange={() => toggle(word.id)} />
            <label htmlFor={`pick-${word.id}`}><span className="book-word-number">{positions.get(word.id)}</span><div><div className="book-word-term"><strong>{mode === "english" ? word.english.term || word.japanese.term : word.japanese.term}</strong><small>{word.japanese.reading}</small></div><p>{word.meaningZh}</p>{mode === "combined" && word.english.term && <span className="book-word-english">{word.english.term}</span>}<small className="book-word-chapter">{chapters.get(word.id)} · {state?.status === "mastered" ? "已掌握" : state ? "学习中" : "未学习"}</small></div></label>
            <SpeakButton text={mode === "english" ? word.english.term : word.japanese.term} language={mode === "english" ? "en-US" : "ja-JP"} audioUrl={mode === "english" ? undefined : word.audioUrl} label={`朗读${word.japanese.term}`} />
          </article>;
        })}</div>
        {!matched.length && <p className="empty-state">没有找到匹配的词。</p>}
        <div ref={sentinel} className="book-scroll-sentinel">{limit < matched.length ? <button className="text-button" onClick={() => setLimit((current) => current + PAGE_SIZE)}>继续浏览 · 已显示 {Math.min(limit, matched.length)} / {matched.length}</button> : <span>{matched.length ? "已到本册末尾" : ""}</span>}</div>
      </section>}
      {selected.size > 0 && <div className="book-selection-bar"><span><Check size={18} />已选 {selected.size} 词</span><button className="text-button" aria-label="清空所选单词" onClick={() => setSelected(new Set())}><X size={16} />清空</button><button className="button button-primary" onClick={() => start("selected")}>背诵所选词<ArrowRight size={16} /></button></div>}
    </>}
    {notice && <p className="book-notice" role="status">{notice}</p>}
  </main>;
}
