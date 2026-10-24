"use client";
import Link from "next/link";
import { useState } from "react";
import { useLearning } from "@/context/learning";
import { findBookStudyWord } from "@/lib/book-learning";
import type { BookVocabWord } from "@/lib/book-vocab-types";
export function BookStudyButton({ word }: { word: BookVocabWord }) {
  const { addBookWord, allWords, snapshot } = useLearning();
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const existing = findBookStudyWord(word, allWords);
  const added = existing && snapshot.favorites.includes(`word:${existing.id}`);
  if (added) return <Link className="button button-secondary book-study-action" href={`/words?word=${encodeURIComponent(existing.id)}&mode=japanese&mobile=study`}>开始学习</Link>;
  return <span><button type="button" disabled={busy} className="button button-secondary book-study-action" onClick={async () => {
    setBusy(true); setError(""); try { await addBookWord(word.id); } catch { setError("加入失败，请重试"); } finally { setBusy(false); }
  }}>{busy ? "加入中…" : "加入学习并收藏"}</button>{error && <small role="status">{error}</small>}</span>;
}
