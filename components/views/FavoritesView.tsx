"use client";

import Link from "next/link";
import {
  BookOpenText,
  Heart,
  Languages,
  NotebookPen,
  Play,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useLearning } from "@/context/learning";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { BOOK_VOCAB_WORDS } from "@/data/book-vocab-data";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { FilterPanel } from "@/components/filters/FilterPanel";

type FavoriteLanguage = "all" | "japanese" | "english" | "comparison";

export function FavoritesView() {
  const {
    snapshot,
    allWords,
    allGrammar,
    allComparisons,
    toggleFavorite,
    removeFavorites,
  } = useLearning();
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<FavoriteLanguage>("all");
  const [difficulty, setDifficulty] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const debouncedQuery = useDebouncedValue(query);
  const normalized = debouncedQuery.trim().toLocaleLowerCase("zh-CN");
  const favoriteWords = useMemo(
    () =>
      allWords.filter((word) => {
        if (!snapshot.favorites.includes(`word:${word.id}`)) return false;
        if (language === "comparison") return false;
        if (
          normalized &&
          ![
            word.meaningZh,
            word.japanese.term,
            word.japanese.reading,
            word.english.term,
            word.note,
          ].some((value) => (value ?? "").toLocaleLowerCase("zh-CN").includes(normalized))
        ) return false;
        if (
          difficulty !== "all" &&
          word.japanese.difficulty !== difficulty &&
          word.english.difficulty !== difficulty
        ) return false;
        return true;
      }),
    [allWords, difficulty, language, normalized, snapshot.favorites],
  );
  const favoriteGrammar = useMemo(
    () =>
      allGrammar.filter((point) => {
        if (!snapshot.favorites.includes(`grammar:${point.id}`)) return false;
        if (language === "comparison") return false;
        if (language !== "all" && point.language !== language) return false;
        if (
          normalized &&
          ![point.title, point.explanation, point.structure].some((value) =>
            value.toLocaleLowerCase("zh-CN").includes(normalized),
          )
        ) return false;
        return difficulty === "all" || point.level === difficulty;
      }),
    [allGrammar, difficulty, language, normalized, snapshot.favorites],
  );
  const favoriteComparisons = useMemo(
    () =>
      allComparisons.filter((item) => {
        if (!snapshot.favorites.includes(`comparison:${item.id}`)) return false;
        if (language !== "all" && language !== "comparison") return false;
        if (
          normalized &&
          ![item.semantic, item.japanese, item.english, item.difference].some(
            (value) => value.toLocaleLowerCase("zh-CN").includes(normalized),
          )
        ) return false;
        return difficulty === "all" || item.level === difficulty;
      }),
    [allComparisons, difficulty, language, normalized, snapshot.favorites],
  );
  const favoriteVocab = useMemo(
    () =>
      BOOK_VOCAB_WORDS.filter((word) => {
        if (!snapshot.favorites.includes(`vocab:${word.id}`)) return false;
        if (language === "english" || language === "comparison") return false;
        if (
          normalized &&
          ![word.term, word.reading, word.meaningZh].some((value) =>
            (value ?? "").toLocaleLowerCase("zh-CN").includes(normalized),
          )
        )
          return false;
        return true;
      }),
    [language, normalized, snapshot.favorites],
  );
  const total =
    favoriteWords.length + favoriteGrammar.length + favoriteComparisons.length + favoriteVocab.length;
  const levels = useMemo(
    () => [
      ...new Set([
        ...allWords.flatMap((word) => [
          word.japanese.difficulty,
          word.english.difficulty,
        ]),
        ...allGrammar.map((point) => point.level),
        ...allComparisons.map((item) => item.level),
      ]),
    ],
    [allComparisons, allGrammar, allWords],
  );

  const toggleSelected = (key: string) =>
    setSelected((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );

  const removeSelected = async () => {
    await removeFavorites(selected);
    setSelected([]);
    setConfirmBulk(false);
  };

  return (
    <div className="page-stack favorites-page">
      <PageHeader
        eyebrow="收藏"
        title="集中学习收藏内容"
        description={`当前收藏 ${snapshot.favorites.length} 项，可按语言、难度和关键词筛选。`}
        actions={<div className="page-actions"><Link className="button button-secondary" href="/words?favorites=1&study=1"><Play size={17} />学习收藏单词</Link><Link className="button button-primary" href="/test?source=favorites&start=1"><Languages size={17} />练习收藏内容</Link></div>}
      />

      <details className="advanced-panel compact-details">
        <summary><span><strong>搜索与批量管理</strong><small>按关键词、语言和难度筛选收藏</small></span></summary>
      <FilterPanel ariaLabel="收藏搜索与筛选">
        <div className="search-field"><Search size={18} /><label className="sr-only" htmlFor="favorite-search">搜索收藏</label><input id="favorite-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索收藏的单词、语法或对比" /></div>
        <div className="filter-grid compact-filters">
          <label><span>语言</span><select value={language} onChange={(event) => setLanguage(event.target.value as FavoriteLanguage)}><option value="all">全部</option><option value="japanese">日语</option><option value="english">英语</option><option value="comparison">日英对比</option></select></label>
          <label><span>难度</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="all">全部</option>{levels.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="filter-toggles"><strong>{total} 个结果</strong>{selected.length > 0 && <Button variant="danger" onClick={() => { setConfirmBulk(true); window.setTimeout(() => confirmRef.current?.focus(), 0); }}><Trash2 size={16} />取消收藏 {selected.length} 项</Button>}</div>
      </FilterPanel>
      </details>

      {total === 0 ? (
        <EmptyState title="没有符合条件的收藏" description="在单词、语法或对比页面点击心形按钮，重要内容就会集中到这里。" action={<Link className="button button-primary" href="/words">浏览单词</Link>} />
      ) : (
        <>
          {favoriteWords.length > 0 && (
            <section>
              <div className="section-title-row"><div><span className="section-kicker">WORDS</span><h2>收藏单词</h2></div><span className="count-label">{favoriteWords.length} 组</span></div>
              <div className="favorite-word-grid">
                {favoriteWords.map((word) => {
                  const key = `word:${word.id}`;
                  return (
                    <article className={`favorite-card card${selected.includes(key) ? " selected-card" : ""}`} key={word.id}>
                      <label className="select-item"><input type="checkbox" checked={selected.includes(key)} onChange={() => toggleSelected(key)} /><span className="sr-only">选择{word.meaningZh}</span></label>
                      <span className="favorite-type-icon word"><BookOpenText size={19} /></span>
                      <button className="favorite-button active" onClick={() => void toggleFavorite("word", word.id)} aria-label={`取消收藏${word.meaningZh}`}><Heart size={18} fill="currentColor" /></button>
                      <span className="word-meaning">{word.meaningZh}</span>
                      <div className="favorite-pair"><p><span className="language-label jp">日</span><strong>{word.japanese.term}</strong><small>{word.japanese.reading}</small></p><p><span className="language-label en">英</span><strong>{word.english.term}</strong><small>{word.english.phonetic}</small></p></div>
                      <p className="favorite-note">{word.note}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {favoriteGrammar.length > 0 && (
            <section>
              <div className="section-title-row"><div><span className="section-kicker">GRAMMAR</span><h2>收藏语法</h2></div><span className="count-label">{favoriteGrammar.length} 个</span></div>
              <div className="favorite-grammar-list">
                {favoriteGrammar.map((point) => {
                  const key = `grammar:${point.id}`;
                  return (
                    <article className={`favorite-grammar-card card${selected.includes(key) ? " selected-card" : ""}`} key={point.id}>
                      <label className="select-item"><input type="checkbox" checked={selected.includes(key)} onChange={() => toggleSelected(key)} /><span className="sr-only">选择{point.title}</span></label>
                      <span className="favorite-type-icon grammar"><NotebookPen size={20} /></span>
                      <div><div className="tag-row"><span>{point.level}</span><span>{point.language === "japanese" ? "日语" : "英语"}</span></div><h2>{point.title}</h2><p>{point.explanation}</p><strong className="structure-preview">{point.structure}</strong></div>
                      <button className="favorite-button active" onClick={() => void toggleFavorite("grammar", point.id)} aria-label={`取消收藏${point.title}`}><Heart size={18} fill="currentColor" /></button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {favoriteVocab.length > 0 && (
            <section>
              <div className="section-title-row"><div><span className="section-kicker">BOOK VOCAB</span><h2>收藏词书词汇</h2></div><span className="count-label">{favoriteVocab.length} 条</span></div>
              <div className="favorite-word-grid">
                {favoriteVocab.map((word) => {
                  const key = `vocab:${word.id}`;
                  return (
                    <article className={`favorite-card card${selected.includes(key) ? " selected-card" : ""}`} key={word.id}>
                      <label className="select-item"><input type="checkbox" checked={selected.includes(key)} onChange={() => toggleSelected(key)} /><span className="sr-only">选择{word.meaningZh}</span></label>
                      <span className="favorite-type-icon word"><BookOpenText size={19} /></span>
                      <button className="favorite-button active" onClick={() => void toggleFavorite("vocab", word.id)} aria-label={`取消收藏${word.meaningZh}`}><Heart size={18} fill="currentColor" /></button>
                      <span className="word-meaning">{word.meaningZh}</span>
                      <div className="favorite-pair"><p><span className="language-label jp">日</span><strong>{word.term}</strong><small>{word.reading}</small></p></div>
                      <p className="favorite-note">{word.pos ? `${word.pos} · ${word.source}` : word.source}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {favoriteComparisons.length > 0 && (
            <section>
              <div className="section-title-row"><div><span className="section-kicker">COMPARISONS</span><h2>收藏日英对比</h2></div><span className="count-label">{favoriteComparisons.length} 个</span></div>
              <div className="favorite-grammar-list">
                {favoriteComparisons.map((item) => {
                  const key = `comparison:${item.id}`;
                  return (
                    <article className={`favorite-grammar-card card${selected.includes(key) ? " selected-card" : ""}`} key={item.id}>
                      <label className="select-item"><input type="checkbox" checked={selected.includes(key)} onChange={() => toggleSelected(key)} /><span className="sr-only">选择{item.semantic}</span></label>
                      <span className="favorite-type-icon grammar"><Languages size={20} /></span>
                      <div><div className="tag-row"><span>{item.level}</span><span>日英对比</span></div><h2>{item.semantic}</h2><p><b>{item.japanese}</b> ↔ <b>{item.english}</b></p><p>{item.difference}</p></div>
                      <button className="favorite-button active" onClick={() => void toggleFavorite("comparison", item.id)} aria-label={`取消收藏${item.semantic}`}><Heart size={18} fill="currentColor" /></button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {confirmBulk && (
        <div className="modal-backdrop" role="presentation" onClick={() => setConfirmBulk(false)}>
          <section className="confirm-modal card" role="alertdialog" aria-modal="true" aria-labelledby="bulk-favorite-title" onClick={(event) => event.stopPropagation()}>
            <span className="modal-warning-icon"><Trash2 size={24} /></span>
            <h2 id="bulk-favorite-title">取消收藏 {selected.length} 项？</h2>
            <p>内容本身和学习进度不会删除，只会从收藏页面移除。</p>
            <div className="modal-actions"><Button variant="secondary" onClick={() => setConfirmBulk(false)}>取消</Button><button ref={confirmRef} className="button button-danger" onClick={() => void removeSelected()}>确认取消收藏</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
