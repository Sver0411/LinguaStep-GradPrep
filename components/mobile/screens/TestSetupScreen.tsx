"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { useLearning } from "@/context/learning";
import { EXAM_QUESTIONS, EXAM_SECTION_LABELS, type ExamLanguage, ExamQuestion, ExamSection } from "@/data/exam-questions";
import { mobileHref, navigateTo } from "../navigation";
import { MobileSubHeader } from "../ui/MobileSubHeader";

export function shuffledQuestions(pool: readonly ExamQuestion[], count: number) {
  const values = [...pool];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values.slice(0, count);
}

export function MobileTestSetup() {
  const { settings } = useLearning();
  const [language, setLanguage] = useState<ExamLanguage>("japanese");
  const [level, setLevel] = useState("N3");
  const [section, setSection] = useState<ExamSection>("characters");
  const [count, setCount] = useState(settings.dailyTestQuestions);
  const levels = language === "japanese" ? ["N3", "N2", "N1"] : ["CET-4", "CET-6", "TOEIC"];
  const available = EXAM_QUESTIONS.filter((item) => item.examLanguage === language && item.examLevel === level && (language === "english" || item.examSection === section)).length;
  const availableReal = EXAM_QUESTIONS.filter((item) => item.examLanguage === language && item.examLevel === level && (language === "english" || item.examSection === section) && !item.id.includes("generated")).length;
  const launch = () => navigateTo(mobileHref("/test", { mobile: "quiz", lang: language, level, section, count: Math.min(count, available) }));
  return <main className="m3-page"><MobileSubHeader detail="PRACTICE SETUP" onBack={() => navigateTo("/test")} title="设置练习" /><section className="m3-card"><h2>练习语言</h2><div className="m3-segments"><button className={language === "japanese" ? "active" : ""} onClick={() => { setLanguage("japanese"); setLevel("N3"); }} type="button">日语</button><button className={language === "english" ? "active" : ""} onClick={() => { setLanguage("english"); setLevel("CET-4"); }} type="button">英语</button></div></section><section className="m3-card"><h2>等级</h2><div className="m3-chip-row">{levels.map((item) => <button className={level === item ? "active" : ""} key={item} onClick={() => setLevel(item)} type="button">{item}</button>)}</div>{language === "japanese" && <><h2 className="m3-card-subtitle">题型</h2><div className="m3-chip-row">{(["characters", "grammar", "reading"] as ExamSection[]).map((item) => <button className={section === item ? "active" : ""} key={item} onClick={() => setSection(item)} type="button">{EXAM_SECTION_LABELS[item]}</button>)}</div></>}</section><section className="m3-card"><h2>本次题数</h2><div className="m3-chip-row">{[10, 20, 30, 50].filter((item) => item <= Math.max(10, available)).map((item) => <button className={count === item ? "active" : ""} key={item} onClick={() => setCount(item)} type="button">{item} 题</button>)}</div><p className="m3-muted">本档共 {available} 题（真题 {availableReal} · 复习题 {available - availableReal}）</p></section><button className="m3-primary" disabled={available === 0} onClick={launch} type="button"><Play size={17} fill="currentColor" />开始练习</button></main>;
}
