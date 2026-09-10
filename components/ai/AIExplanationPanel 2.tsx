"use client";

import { BrainCircuit, LoaderCircle, RefreshCw, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useAI } from "@/context/AIContext";
import type { ChoiceQuestion } from "@/lib/models";
import { Button } from "@/components/ui";

export function AIExplanationPanel({ question, selectedIndex }: { question: ChoiceQuestion; selectedIndex: number }) {
  const { explainMistake, transientResult, busyOperation, error, cancel } = useAI();
  const [variant, setVariant] = useState<"simple" | "detailed">("simple");
  const [requested, setRequested] = useState(false);
  const content = requested && transientResult?.kind === "explanation" ? transientResult.content : null;
  const generate = async (force = false) => {
    setRequested(true);
    await explainMistake({ question, selectedIndex, variant, force });
  };
  return (
    <section className="ai-explanation-panel">
      <div className="ai-explanation-heading"><span><BrainCircuit size={18} /><strong>AI 个性化错因解释</strong></span><div className="segmented-control"><button className={variant === "simple" ? "active" : ""} onClick={() => setVariant("simple")}>简洁</button><button className={variant === "detailed" ? "active" : ""} onClick={() => setVariant("detailed")}>详细</button></div></div>
      {!content && busyOperation !== "explanation" && <Button variant="secondary" onClick={() => void generate()}><Sparkles size={17} />分析我的错误</Button>}
      {busyOperation === "explanation" && <div className="ai-busy-line"><LoaderCircle className="spin" size={18} />正在生成错因解释…<button className="text-button" onClick={cancel}><X size={15} />取消</button></div>}
      {requested && error && busyOperation !== "explanation" && <div className="inline-alert error"><span>{error.message}</span><Button variant="secondary" onClick={() => void generate(true)}><RefreshCw size={16} />重试</Button></div>}
      {content && (
        <div className="ai-explanation-content">
          <p><strong>为什么正确：</strong>{content.whyCorrect}</p>
          <p><strong>你的选择为什么不对：</strong>{content.whyUserChoiceWrong}</p>
          <p><strong>关键知识点：</strong>{content.keyPoint}</p>
          {content.languageDifference && <p><strong>日英差异：</strong>{content.languageDifference}</p>}
          <p><strong>补充例子：</strong>{content.example}</p>
          <p><strong>下次避免：</strong>{content.preventionTip}</p>
          <button className="text-button" onClick={() => void generate(true)}><RefreshCw size={15} />重新生成</button>
        </div>
      )}
    </section>
  );
}
