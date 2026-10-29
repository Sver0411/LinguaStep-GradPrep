/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { JapaneseText } from "@/components/JapaneseText";
import { stopSpeech } from "@/lib/speech";
import { SpeakButton } from "@/components/SpeakButton";
import { useLearning } from "@/context/learning";
import type { GrammarPoint } from "@/lib/models";
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/+$/, "");

export function GrammarReading({ point, onRead, status }: { point: GrammarPoint; onRead: () => void; status: string }) {
  const { completeGrammar } = useLearning();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  useEffect(() => () => stopSpeech(), [point.id]);
  const explanations = point.book?.explanations ?? [point.explanation];
  const notes = point.book?.notes ?? (point.nuance ? [point.nuance] : []);
  const examples = (start: number, end?: number) => point.examples.slice(start,end).map((example,index) => <div className="grammar-example" key={start+index}><div><p>{point.language === "japanese" ? <JapaneseText text={example.text} ruby={example.ruby} /> : example.text}</p><SpeakButton text={example.text} language={point.language === "japanese" ? "ja-JP" : "en-US"} translationZh={example.translationZh} label="朗读例句和中文" /></div><p>{example.translationZh}</p></div>);
  const read = async () => {
    if (busy.current) return;
    stopSpeech();
    busy.current = true; setSaving(true); setError("");
    try { await completeGrammar(point.id,[]); onRead(); }
    catch { setError("保存失败，请重试。"); }
    finally { busy.current = false; setSaving(false); }
  };
  const counterpart = point.language === "japanese" ? point.comparison.english : point.comparison.japanese;
  return <>
    <article className="grammar-reading-card">
      <div className="grammar-lesson-meta"><span>{point.level.replace("JLPT ","")}</span><span>{status}</span></div>
      <h1>{point.structure || point.title}</h1>
      {explanations.length > 0 && <section className="grammar-explanations"><h2>用法讲解</h2>{explanations.map((text,index) => <p key={index}>{text}</p>)}</section>}
      {point.connection && <section className="grammar-connection"><h2>接续</h2><p style={{whiteSpace:"pre-line"}}>{point.connection}</p></section>}
      {point.examples.length > 0 && <section className="grammar-new-examples"><h2>例句</h2>{examples(0,2)}</section>}
      {notes.length > 0 && <section className="grammar-usage"><h2>用法说明与注意</h2>{notes.map((text,index) => <p key={index}>{text}</p>)}</section>}
      {!!point.book?.images.length && <details className="grammar-source-more grammar-figures" open={!point.examples.length}><summary>图表 · {point.book.images.length}</summary>{point.book.images.map((figure) => <figure key={figure.path}><a href={`${BASE_PATH}${figure.path}`} target="_blank" rel="noreferrer" aria-label={`查看原图：${figure.caption || "语法图表"}`}><img src={`${BASE_PATH}${figure.path}`} alt={figure.caption || "语法图表"} loading="lazy" /></a>{figure.caption && <figcaption>{figure.caption}</figcaption>}</figure>)}</details>}
      {counterpart && <details className="grammar-counterpart"><summary>{point.language === "japanese" ? "对应英语表达" : "对应日语表达"}</summary><p>{counterpart}</p></details>}
    </article>
    {error && <p role="alert">{error}</p>}
    <button className="button button-primary grammar-main-action" disabled={saving} onClick={() => void read()}>{saving ? "保存中…" : "完成阅读"}<ArrowRight size={18} /></button>
  </>;
}
