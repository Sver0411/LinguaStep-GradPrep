import { useState } from "react";
import type { BookVocabWord } from "@/lib/book-vocab-types";
import { SpeakButton } from "@/components/SpeakButton";

const PAGE_SIZE = 24;

export function BookWordLibrary({
  words,
  bookLabel,
  isFavorite,
  onToggleFavorite,
}: {
  words: BookVocabWord[];
  bookLabel: string;
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
          <span className="section-kicker">BOOK VOCAB</span>
          <h2>{bookLabel}</h2>
        </div>
        <span className="count-label">共 {words.length} 条</span>
      </div>
      {words.length === 0 ? (
        <div className="empty-state compact-empty">
          <p>这一分区暂无词条。</p>
        </div>
      ) : (
        <>
        <div className="book-vocab-grid">
          {visible.map((word) => {
            const fav = isFavorite(word.id);
            return (
              <article className="book-vocab-card card" key={word.id}>
                <div className="book-vocab-head">
                  <div>
                    <strong>{word.term}</strong>
                    {word.reading && <small>{word.reading}</small>}
                  </div>
                  <div className="book-vocab-actions">
                    <SpeakButton
                      text={word.term}
                      language="ja-JP"
                      label={`朗读 ${word.term}`}
                    />
                    <button
                      className={`favorite-button${fav ? " active" : ""}`}
                      onClick={() => onToggleFavorite(word.id)}
                      type="button"
                      aria-label={`${fav ? "取消收藏" : "收藏"}${word.meaningZh}`}
                    >
                      ♥
                    </button>
                  </div>
                </div>
                <p className="book-vocab-meaning">{word.meaningZh}</p>
                {word.english && (
                  <p className="book-vocab-english">
                    <span className="language-label en">英</span>
                    {word.english}
                  </p>
                )}
                {word.pos && <span className="book-vocab-pos">{word.pos}</span>}
                {word.exampleJp && (
                  <div className="book-vocab-example">
                    <p>{word.exampleJp}</p>
                    {word.exampleZh && <p className="translation">{word.exampleZh}</p>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <div className="pagination" aria-label="词书分页">
          <button
            className="icon-button"
            onClick={() => setPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            aria-label="上一页"
          >‹</button>
          <span>{currentPage + 1} / {pageCount}</span>
          <button
            className="icon-button"
            onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
            disabled={currentPage >= pageCount - 1}
            aria-label="下一页"
          >›</button>
        </div>
        </>
      )}
    </section>
  );
}
