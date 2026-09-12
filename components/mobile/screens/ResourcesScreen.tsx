"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, CloudSun, Languages, MapPin, MessageCircle, NotebookPen, Search, ShoppingBag } from "lucide-react";
import { HIRAGANA_ROWS, KANA_TOTAL, KATAKANA_ROWS } from "@/data/reference";
import { SpeakButton } from "@/components/SpeakButton";
import { speak } from "@/lib/speech";
import { KANA_TOPIC, RESOURCE_TOPICS, ResourceTopic } from "../constants";
import { mobileHref, navigateTo } from "../navigation";
import { MobileSubHeader } from "../ui/MobileSubHeader";

function ResourceGlyph({ id }: { id: string }) {
  if (id === "weekday-time") return <CalendarDays size={22} />;
  if (id === "numbers-units") return <Languages size={22} />;
  if (id === "expressions") return <MessageCircle size={22} />;
  if (id === "weather") return <CloudSun size={22} />;
  if (id === "places") return <MapPin size={22} />;
  if (id === "food-shopping") return <ShoppingBag size={22} />;
  return <NotebookPen size={22} />;
}

export function MobileResourcesScreen() {
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
  return <section><div><h2>{title}</h2><span>{caption}</span></div><div className="m2-kana-detail-grid">{rows.flat().map((cell) => <span key={`${title}-${cell.character}`} role="button" tabIndex={0} aria-label={`朗读 ${cell.character}`} onClick={() => speak(cell.character, "ja-JP")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); speak(cell.character, "ja-JP"); } }}>{cell.character}<small>{cell.romaji}</small></span>)}</div></section>;
}

export function MobileResourceDetail({ topicId }: { topicId: string | null }) {
  const active = topicId === "kana" ? KANA_TOPIC : RESOURCE_TOPICS.find((topic) => topic.id === topicId);
  if (!active) return <main className="m3-page"><MobileSubHeader detail="REFERENCE" onBack={() => navigateTo("/resources")} title="资料不存在" /><div className="m3-empty-card"><BookOpen size={28} /><p>回到资料页选择一组内容。</p></div></main>;
  const activeIcon = active.id === "kana" ? <BookOpen size={22} /> : <ResourceGlyph id={active.id} />;
  return <main className="m3-page m2-resource-detail"><button className="m2-back" onClick={() => navigateTo("/resources")} type="button"><ChevronLeft size={19} />返回资料</button><header><span className={`m2-topic-icon ${active.tone}`}>{activeIcon}</span><div><p className="m2-brand">REFERENCE</p><h1>{active.title}</h1><small>{active.subtitle}</small></div></header>{active.id === "kana" ? <div className="m2-kana-detail-groups"><KanaColumn title="平假名" caption="46 个基础假名" rows={HIRAGANA_ROWS} /><KanaColumn title="片假名" caption="46 个基础假名" rows={KATAKANA_ROWS} /></div> : <div className="m2-entry-list">{active.entries.map((entry) => <article key={entry.term}><b>{entry.term}<SpeakButton text={entry.term} language="ja-JP" label={`朗读 ${entry.term}`} size={15} /></b><span>{entry.meaning}</span></article>)}</div>}</main>;
}
