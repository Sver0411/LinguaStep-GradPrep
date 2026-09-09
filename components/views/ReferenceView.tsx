"use client";

import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CloudSun,
  Languages,
  MapPin,
  MessageCircle,
  NotebookPen,
  Search,
  ShoppingBag,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  HIRAGANA_ROWS,
  KANA_TOTAL,
  KATAKANA_ROWS,
  REFERENCE_TOPICS,
  type ReferenceTopic,
} from "@/data/reference";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { SpeakButton } from "@/components/SpeakButton";
import { EmptyState, PageHeader } from "@/components/ui";

function TopicGlyph({ id }: { id: string }) {
  if (id === "weekday-time") return <CalendarDays size={20} />;
  if (id === "numbers-units") return <Languages size={20} />;
  if (id === "expressions") return <MessageCircle size={20} />;
  if (id === "weather") return <CloudSun size={20} />;
  if (id === "places") return <MapPin size={20} />;
  if (id === "food-shopping") return <ShoppingBag size={20} />;
  return <NotebookPen size={20} />;
}

type Selection = { type: "kana" } | { type: "topic"; id: string } | null;

export function ReferenceView() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [selected, setSelected] = useState<Selection>(null);

  const filteredTopics = useMemo(() => {
    const normalized = debouncedQuery.trim().toLocaleLowerCase("zh-CN");
    if (!normalized) return REFERENCE_TOPICS;
    return REFERENCE_TOPICS.filter((topic) =>
      [
        topic.title,
        topic.subtitle,
        ...topic.entries.flatMap((entry) => [entry.term, entry.meaning]),
      ]
        .join(" ")
        .toLocaleLowerCase("zh-CN")
        .includes(normalized),
    );
  }, [debouncedQuery]);

  useEffect(() => {
    const exitSession = () => setSelected(null);
    window.addEventListener("linguastep:exit-session", exitSession);
    return () => window.removeEventListener("linguastep:exit-session", exitSession);
  }, []);

  const activeTopic =
    selected?.type === "topic"
      ? REFERENCE_TOPICS.find((topic) => topic.id === selected.id)
      : undefined;

  if (selected?.type === "kana") {
    return (
      <div className="page-stack reference-page">
        <button className="detail-back-button" onClick={() => setSelected(null)} type="button">
          <ArrowLeft size={16} />返回资料
        </button>
        <PageHeader
          eyebrow="REFERENCE"
          title="五十音图"
          description={`平假名与片假名共 ${KANA_TOTAL} 个基础假名，点喇叭可以听发音。`}
        />
        <KanaTable title="平假名" caption="来源于汉字草书" rows={HIRAGANA_ROWS} />
        <KanaTable title="片假名" caption="来源于汉字偏旁" rows={KATAKANA_ROWS} />
      </div>
    );
  }

  if (activeTopic) {
    return (
      <div className="page-stack reference-page">
        <button className="detail-back-button" onClick={() => setSelected(null)} type="button">
          <ArrowLeft size={16} />返回资料
        </button>
        <PageHeader
          eyebrow="REFERENCE"
          title={activeTopic.title}
          description={`${activeTopic.subtitle} · 共 ${activeTopic.entries.length} 条`}
        />
        <section className="reference-entry-list">
          {activeTopic.entries.map((entry) => (
            <article className="reference-entry card" key={entry.term}>
              <div className="reference-entry-main">
                <strong>{entry.term}</strong>
                <span>{entry.meaning}</span>
              </div>
              <SpeakButton text={entry.term} language="ja-JP" label={`朗读 ${entry.term}`} />
            </article>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack reference-page">
      <PageHeader
        eyebrow="资料"
        title="随时查，随手学"
        description="五十音入门与日常表达速查，点击喇叭即可听发音。"
      />

      <div className="search-field reference-search">
        <Search size={18} />
        <label className="sr-only" htmlFor="reference-search">搜索资料</label>
        <input
          id="reference-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索五十音、星期或常用表达"
        />
      </div>

      <button className="reference-kana-hero card" onClick={() => setSelected({ type: "kana" })} type="button">
        <span className="reference-kana-hero-icon"><BookOpen size={24} /></span>
        <div>
          <strong>五十音图</strong>
          <p>平假名与片假名</p>
          <small>共 {KANA_TOTAL} 个基础假名，附罗马音与发音</small>
        </div>
        <ArrowLeft size={17} className="reference-open-arrow" />
      </button>

      {filteredTopics.length === 0 ? (
        <EmptyState title="没有匹配的资料" description="换个关键词再试试。" />
      ) : (
        <section className="reference-topic-list">
          <div className="section-title-row">
            <div><span className="section-kicker">DAILY JAPANESE</span><h2>日常日语</h2></div>
            <span className="count-label">{filteredTopics.length} 组资料</span>
          </div>
          {filteredTopics.map((topic) => (
            <TopicRow key={topic.id} topic={topic} onOpen={() => setSelected({ type: "topic", id: topic.id })} />
          ))}
        </section>
      )}
    </div>
  );
}

function TopicRow({ topic, onOpen }: { topic: ReferenceTopic; onOpen: () => void }) {
  return (
    <button className="reference-topic-row card" onClick={onOpen} type="button">
      <span className={`reference-topic-icon tone-${topic.tone}`}><TopicGlyph id={topic.id} /></span>
      <div>
        <strong>{topic.title}</strong>
        <small>{topic.subtitle}</small>
      </div>
      <ArrowLeft size={17} className="reference-open-arrow" />
    </button>
  );
}

function KanaTable({
  title,
  caption,
  rows,
}: {
  title: string;
  caption: string;
  rows: { character: string; romaji: string }[][];
}) {
  return (
    <section className="card reference-kana-table">
      <div className="section-title-row">
        <div><span className="section-kicker">KANA</span><h2>{title}</h2></div>
        <span className="count-label">{caption}</span>
      </div>
      <div className="reference-kana-grid">
        {rows.map((row, rowIndex) => (
          <div className="reference-kana-row" key={`${title}-${rowIndex}`}>
            {row.map((cell) => (
              <div className="reference-kana-cell" key={`${title}-${cell.romaji}-${cell.character}`}>
                <strong>{cell.character}</strong>
                <small>{cell.romaji}</small>
                <SpeakButton text={cell.character} language="ja-JP" label={`朗读 ${cell.character}`} size={14} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
