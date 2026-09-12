"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { useLearning } from "@/context/learning";
import { BOOK_VOCAB_SECTIONS, BOOK_VOCAB_WORDS } from "@/data/book-vocab-data";
import { SpeakButton } from "@/components/SpeakButton";
import { getWordModeState } from "@/lib/learning";
import { mobileHref, navigateTo } from "../navigation";
import { MobileSubHeader } from "../ui/MobileSubHeader";

export function MobileWordLibrary() {
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
