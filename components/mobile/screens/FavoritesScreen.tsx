"use client";

import { BookOpen, ChevronRight } from "lucide-react";
import { useLearning } from "@/context/learning";
import { mobileHref, navigateTo } from "../navigation";
import { MobileSubHeader } from "../ui/MobileSubHeader";

export function MobileFavorites() {
  const { allGrammar, allWords, snapshot } = useLearning();
  const words = allWords.filter((item) => snapshot.favorites.includes(`word:${item.id}`));
  const grammar = allGrammar.filter((item) => snapshot.favorites.includes(`grammar:${item.id}`));
  return <main className="m3-page"><MobileSubHeader detail="FAVORITES" onBack={() => navigateTo("/profile")} title="我的收藏" />{words.length + grammar.length === 0 ? <div className="m3-empty-card"><BookOpen size={28} /><h2>还没有收藏内容</h2><p>在单词或语法页收藏后会显示在这里。</p><button className="m3-primary" onClick={() => navigateTo(mobileHref("/words", { mobile: "library" }))} type="button">浏览词库</button></div> : <section className="m3-favorite-list">{words.map((word) => <button key={word.id} onClick={() => navigateTo(mobileHref("/words", { mobile: "study", word: word.id, mode: "japanese" }))} type="button"><span>词</span><div><b>{word.japanese.term}</b><small>{word.meaningZh}</small></div><ChevronRight size={18} /></button>)}{grammar.map((point) => <button key={point.id} onClick={() => navigateTo(mobileHref("/grammar", { mobile: "practice", id: point.id }))} type="button"><span>语</span><div><b>{point.title}</b><small>{point.structure}</small></div><ChevronRight size={18} /></button>)}</section>}</main>;
}
