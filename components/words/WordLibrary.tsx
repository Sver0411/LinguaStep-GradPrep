"use client";

import { ChevronLeft, ChevronRight, Heart, SearchX } from "lucide-react";
import { useState } from "react";
import type { DisplayDensity, StudyMode, WordPair } from "@/lib/models";

const PAGE_SIZE = 12;

export function WordLibrary({
  words,
  density,
  mode,
  isFavorite,
  onToggleFavorite,
}: {
  words: WordPair[];
  density: DisplayDensity;
  mode: StudyMode;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(words.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = words.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  return (
    <section className="library-section">
      <div className="section-title-row">
        <div>
          <span className="section-kicker">WORD LIBRARY</span>
          <h2>内置词库</h2>
        </div>
        <span className="count-label">共 {words.length} 组</span>
      </div>

      {words.length === 0 ? (
        <div className="empty-state compact-empty">
          <span className="empty-icon"><SearchX size={25} /></span>
          <h2>没有符合条件的单词</h2>
          <p>调整关键词或筛选条件后再试。</p>
        </div>
      ) : (
        <div className={`word-library-grid density-${density}`}>
          {visible.map((word) => (
            <article className="word-item-card" key={word.id}>
              <button
                className={`favorite-button${isFavorite(word.id) ? " active" : ""}`}
                onClick={() => onToggleFavorite(word.id)}
                type="button"
                aria-label={`${isFavorite(word.id) ? "取消收藏" : "收藏"}${word.meaningZh}`}
              >
                <Heart size={17} fill={isFavorite(word.id) ? "currentColor" : "none"} />
              </button>
              <span className="word-meaning">{word.meaningZh}</span>
              <div className="word-pair-line">
                {mode !== "english" && (
                  <div>
                    <span className="language-label jp">日</span>
                    <strong>{word.japanese.term}</strong>
                    <small>{word.japanese.reading}</small>
                  </div>
                )}
                {mode !== "japanese" && (
                  <div>
                    <span className="language-label en">英</span>
                    <strong>{word.english.term}</strong>
                    {density === "full" && <small>{word.english.phonetic}</small>}
                  </div>
                )}
              </div>
              {density === "full" && (
                <div className="word-full-details">
                  {mode !== "english" && (
                    <>
                      <p><b>日语例句</b>{word.japanese.example}</p>
                      <p className="translation">{word.japanese.exampleZh}</p>
                      <p className="translation">罗马音：{word.japanese.romanization}</p>
                      <p className="translation">搭配：{word.japanese.collocations.join(" · ")}</p>
                    </>
                  )}
                  {mode !== "japanese" && (
                    <>
                      <p><b>英语例句</b>{word.english.example}</p>
                      <p className="translation">{word.english.exampleZh}</p>
                      <p className="translation">搭配：{word.english.collocations.join(" · ")}</p>
                    </>
                  )}
                  <p className="translation">{word.note}</p>
                  <div className="tag-row">
                    {mode !== "english" && <span>{word.japanese.difficulty}</span>}
                    {mode !== "japanese" && <span>{word.english.difficulty}</span>}
                    <span>{word.frequency ?? (word.highFrequency ? "高频" : "常用")}</span>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {words.length > 0 && (
        <div className="pagination" aria-label="词库分页">
          <button
            className="icon-button"
            onClick={() => setPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            aria-label="上一页"
          ><ChevronLeft size={19} /></button>
          <span>{currentPage + 1} / {pageCount}</span>
          <button
            className="icon-button"
            onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
            disabled={currentPage >= pageCount - 1}
            aria-label="下一页"
          ><ChevronRight size={19} /></button>
        </div>
      )}
    </section>
  );
}
