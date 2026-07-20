"use client";

import Link from "next/link";
import { BookOpenText, Heart, NotebookPen } from "lucide-react";
import { WORD_PAIRS } from "@/data/words";
import { GRAMMAR_POINTS } from "@/data/grammar";
import { useLearning } from "@/context/LearningContext";
import { EmptyState, PageHeader } from "@/components/ui";

export function FavoritesView() {
  const { snapshot, toggleFavorite } = useLearning();
  const favoriteWords = WORD_PAIRS.filter((word) => snapshot.favorites.includes(`word:${word.id}`));
  const favoriteGrammar = GRAMMAR_POINTS.filter((point) => snapshot.favorites.includes(`grammar:${point.id}`));
  const total = favoriteWords.length + favoriteGrammar.length;

  return (
    <div className="page-stack favorites-page">
      <PageHeader
        eyebrow="我的收藏"
        title="随时回到值得再看的内容"
        description={`已收藏 ${favoriteWords.length} 组单词和 ${favoriteGrammar.length} 个语法知识点。`}
      />

      {total === 0 ? (
        <EmptyState
          title="收藏夹还是空的"
          description="在单词卡或语法讲解中点击心形按钮，重要内容就会集中到这里。"
          action={<Link className="button button-primary" href="/words">浏览单词</Link>}
        />
      ) : (
        <>
          {favoriteWords.length > 0 && (
            <section>
              <div className="section-title-row"><div><span className="section-kicker">WORDS</span><h2>收藏单词</h2></div><span className="count-label">{favoriteWords.length} 组</span></div>
              <div className="favorite-word-grid">
                {favoriteWords.map((word) => (
                  <article className="favorite-card card" key={word.id}>
                    <span className="favorite-type-icon word"><BookOpenText size={19} /></span>
                    <button className="favorite-button active" onClick={() => void toggleFavorite("word", word.id)} aria-label={`取消收藏${word.meaningZh}`}><Heart size={18} fill="currentColor" /></button>
                    <span className="word-meaning">{word.meaningZh}</span>
                    <div className="favorite-pair"><p><span className="language-label jp">日</span><strong>{word.japanese.term}</strong><small>{word.japanese.reading}</small></p><p><span className="language-label en">英</span><strong>{word.english.term}</strong><small>{word.english.phonetic}</small></p></div>
                    <p className="favorite-note">{word.note}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
          {favoriteGrammar.length > 0 && (
            <section>
              <div className="section-title-row"><div><span className="section-kicker">GRAMMAR</span><h2>收藏语法</h2></div><span className="count-label">{favoriteGrammar.length} 个</span></div>
              <div className="favorite-grammar-list">
                {favoriteGrammar.map((point) => (
                  <article className="favorite-grammar-card card" key={point.id}>
                    <span className="favorite-type-icon grammar"><NotebookPen size={20} /></span>
                    <div><div className="tag-row"><span>{point.level}</span><span>{point.language === "japanese" ? "日语" : "英语"}</span></div><h2>{point.title}</h2><p>{point.explanation}</p><strong className="structure-preview">{point.structure}</strong></div>
                    <button className="favorite-button active" onClick={() => void toggleFavorite("grammar", point.id)} aria-label={`取消收藏${point.title}`}><Heart size={18} fill="currentColor" /></button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
