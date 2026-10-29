import type { JapaneseRubyPart } from "@/lib/models";

export function JapaneseText({ text, ruby }: { text: string; ruby?: JapaneseRubyPart[] }) {
  if (!ruby?.length || ruby.map((part) => typeof part === "string" ? part : part[0]).join("") !== text) return <span className="japanese-ruby" lang="ja">{text}</span>;
  return <span className="japanese-ruby" lang="ja" aria-label={text}>{ruby.map((part,index) => typeof part === "string" ? part : <ruby key={index}>{part[0]}<rt aria-hidden="true">{part[1]}</rt></ruby>)}</span>;
}
