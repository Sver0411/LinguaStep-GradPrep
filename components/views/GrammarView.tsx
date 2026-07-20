"use client";

import {
  AlertCircle,
  BookOpenCheck,
  Check,
  Heart,
  Languages,
  Play,
  Quote,
  Route,
} from "lucide-react";
import { useMemo, useState } from "react";
import { GRAMMAR_POINTS } from "@/data/grammar";
import { useLearning } from "@/context/LearningContext";
import type { GrammarLanguage } from "@/lib/models";
import { Button, PageHeader } from "@/components/ui";
import { GrammarPractice } from "@/components/grammar/GrammarPractice";

export function GrammarView() {
  const { snapshot, isFavorite, toggleFavorite } = useLearning();
  const [language, setLanguage] = useState<GrammarLanguage>("japanese");
  const filtered = useMemo(
    () => GRAMMAR_POINTS.filter((point) => point.language === language),
    [language],
  );
  const [selectedId, setSelectedId] = useState(
    GRAMMAR_POINTS.find((point) => point.language === "japanese")?.id ?? "",
  );
  const [practicing, setPracticing] = useState(false);
  const selected = GRAMMAR_POINTS.find((point) => point.id === selectedId) ?? filtered[0];
  const progressMap = new Map(
    snapshot.grammarProgress.map((item) => [item.grammarId, item]),
  );

  const changeLanguage = (next: GrammarLanguage) => {
    setLanguage(next);
    setSelectedId(
      GRAMMAR_POINTS.find((point) => point.language === next)?.id ?? "",
    );
    setPracticing(false);
  };

  if (practicing && selected) {
    return <GrammarPractice point={selected} onClose={() => setPracticing(false)} />;
  }

  return (
    <div className="page-stack grammar-page">
      <PageHeader
        eyebrow="语法学习"
        title="理解结构，也理解语气"
        description="以日语 N3 巩固与 N2 入门为主，用中文讲清接续、场景和容易混淆的地方。"
        actions={
          <div className="segmented-control" aria-label="语法语言">
            <button className={language === "japanese" ? "active" : ""} onClick={() => changeLanguage("japanese")}>日语语法 · 14</button>
            <button className={language === "english" ? "active" : ""} onClick={() => changeLanguage("english")}>英语语法 · 6</button>
          </div>
        }
      />

      <section className="grammar-layout">
        <aside className="grammar-list card" aria-label="语法知识点列表">
          <div className="grammar-list-heading">
            <span>{language === "japanese" ? "日语进阶" : "英语基础"}</span>
            <strong>{filtered.length} 个知识点</strong>
          </div>
          <div className="grammar-list-scroll">
            {filtered.map((point, index) => {
              const progress = progressMap.get(point.id);
              return (
                <button
                  className={`grammar-list-item${selected?.id === point.id ? " active" : ""}`}
                  onClick={() => setSelectedId(point.id)}
                  key={point.id}
                >
                  <span className="grammar-index">{String(index + 1).padStart(2, "0")}</span>
                  <span><strong>{point.title}</strong><small>{point.level} · {progress?.status === "learned" ? "已学习" : "未完成"}</small></span>
                  {progress?.status === "learned" && <Check size={16} />}
                </button>
              );
            })}
          </div>
        </aside>

        {selected && (
          <article className="grammar-detail card">
            <div className="grammar-title-row">
              <div>
                <div className="tag-row"><span>{selected.level}</span><span>{selected.language === "japanese" ? "日语" : "英语"}</span></div>
                <h2>{selected.title}</h2>
              </div>
              <button
                className={`favorite-button large${isFavorite("grammar", selected.id) ? " active" : ""}`}
                onClick={() => void toggleFavorite("grammar", selected.id)}
                aria-label={isFavorite("grammar", selected.id) ? "取消收藏语法" : "收藏语法"}
              >
                <Heart size={20} fill={isFavorite("grammar", selected.id) ? "currentColor" : "none"} />
              </button>
            </div>

            <section className="grammar-explanation">
              <p>{selected.explanation}</p>
            </section>

            <div className="grammar-core-grid">
              <section className="info-panel structure">
                <span className="info-icon"><Route size={19} /></span>
                <div><small>句型结构</small><strong>{selected.structure}</strong></div>
              </section>
              <section className="info-panel connection">
                <span className="info-icon"><BookOpenCheck size={19} /></span>
                <div><small>接续方式</small><strong>{selected.connection}</strong></div>
              </section>
            </div>

            <section className="detail-section">
              <h3>使用场景与语气</h3>
              <p>{selected.nuance}</p>
              <ul className="plain-list">{selected.scenarios.map((scenario) => <li key={scenario}>{scenario}</li>)}</ul>
            </section>

            <section className="detail-section">
              <h3><Quote size={18} />例句</h3>
              <div className="example-list">
                {selected.examples.map((example) => (
                  <div className="grammar-example" key={example.text}>
                    <p>{example.text}</p><span>{example.translationZh}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="comparison-box">
              <div className="comparison-heading"><Languages size={19} /><strong>日英表达对比</strong></div>
              <div className="comparison-lines">
                <p><span className="language-label jp">日</span>{selected.comparison.japanese}</p>
                <p><span className="language-label en">英</span>{selected.comparison.english}</p>
                <small>{selected.comparison.translationZh}</small>
              </div>
            </section>

            <div className="warning-grid">
              <section className="warning-panel">
                <h3><AlertCircle size={18} />常见错误</h3>
                <ul>{selected.commonErrors.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
              <section className="warning-panel confusion">
                <h3><Languages size={18} />易混淆语法</h3>
                <ul>{selected.confusables.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            </div>

            <div className="grammar-cta">
              <div><strong>准备好了吗？</strong><span>用选择题检查是否真正理解</span></div>
              <Button onClick={() => setPracticing(true)}><Play size={18} fill="currentColor" />开始练习</Button>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
