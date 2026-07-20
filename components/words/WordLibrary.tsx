"use client";

import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useState } from "react";
import type { DisplayDensity, WordPair } from "@/lib/models";

const PAGE_SIZE = 12;

export function WordLibrary({
  words,
  density,
  isFavorite,
  onToggleFavorite,
}: {
  words: WordPair[];
  density: DisplayDensity;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(words.length / PAGE_SIZE);
  const visible = words.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section className="library-section">
      <div className="section-title-row">
        <div>
          <span className="section-kicker">WORD LIBRARY</span>
          <h2>内置词库</h2>
        </div>
        <span className="count-label">共 {words.length} 组</span>
      </div>

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
              <div>
                <span className="language-label jp">日</span>
                <strong>{word.japanese.term}</strong>
                <small>{word.japanese.reading}</small>
              </div>
              <div>
                <span className="language-label en">英</span>
                <strong>{word.english.term}</strong>
                {density === "full" && <small>{word.english.phonetic}</small>}
              </div>
            </div>
            {density === "full" && (
              <div className="word-full-details">
                <p><b>日语例句</b>{word.japanese.example}</p>
                <p className="translation">{word.japanese.exampleZh}</p>
                <p><b>英语例句</b>{word.english.example}</p>
                <p className="translation">{word.english.exampleZh}</p>
                <div className="tag-row">
                  <span>{word.japanese.difficulty}</span>
                  <span>{word.english.difficulty}</span>
                  {word.highFrequency && <span>高频</span>}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="pagination" aria-label="词库分页">
        <button
          className="icon-button"
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={page === 0}
          aria-label="上一页"
        >
          <ChevronLeft size={19} />
        </button>
        <span>{page + 1} / {pageCount}</span>
        <button
          className="icon-button"
          onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          disabled={page >= pageCount - 1}
          aria-label="下一页"
        >
          <ChevronRight size={19} />
        </button>
      </div>
    </section>
  );
}
