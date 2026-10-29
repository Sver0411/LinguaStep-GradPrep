"use client";

import { JapaneseText } from "@/components/JapaneseText";
import type { WordLanguageEntry } from "@/lib/models";
import { SpeakButton } from "@/components/SpeakButton";

export function WordExample({ entry, language }: { entry: WordLanguageEntry; language: "japanese" | "english" }) {
  if (!entry.example.trim()) return <p className="word-example-missing">暂无例句</p>;
  return <div className="example-block word-example">
    <div className="word-example-heading"><span>例句</span><SpeakButton text={entry.example} language={language === "japanese" ? "ja-JP" : "en-US"} translationZh={entry.exampleZh} label={`朗读${language === "japanese" ? "日语" : "英语"}例句${entry.exampleZh.trim() ? "和中文译文" : ""}`} size={16} /></div>
    <p lang={language === "japanese" ? "ja" : "en"}>{language === "japanese" ? <JapaneseText text={entry.example} ruby={entry.exampleRuby} /> : entry.example}</p>
    <span lang="zh-CN">{entry.exampleZh.trim() || "此例句暂无中文译文"}</span>
  </div>;
}
