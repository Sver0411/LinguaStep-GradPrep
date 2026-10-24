"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Volume2 } from "lucide-react";
import { isSpeechSupported, preload, speak, speakSequence, type SpeechLanguage } from "@/lib/speech";

type SpeakButtonProps = { text: string; language: SpeechLanguage; translationZh?: string; label?: string; size?: number; className?: string };
const subscribe = () => () => {};
const serverSnapshot = () => false;
export function SpeakButton(props: SpeakButtonProps) {
  const supported = useSyncExternalStore(subscribe, isSpeechSupported, serverSnapshot);
  return supported && props.text.trim() ? <SpeechControl key={`${props.language}:${props.text}:${props.translationZh ?? ""}`} {...props} /> : null;
}
function SpeechControl({ text, language, translationZh, label, size = 17, className = "" }: SpeakButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    generation.current += 1;
    if (!text.trim() || !button.current) return;
    // Word libraries render many buttons. Only warm visible audio.
    const warm = () => { preload(text, language); if (translationZh?.trim()) preload(translationZh, "zh-CN"); };
    if (typeof IntersectionObserver === "undefined") { warm(); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { warm(); observer.disconnect(); }
    });
    observer.observe(button.current);
    return () => { generation.current += 1; observer.disconnect(); };
  }, [language, text, translationZh]);
  return <span className="speech-control">
    <button ref={button} type="button" className={`speak-button${className ? ` ${className}` : ""}`}
      aria-label={label ?? `朗读 ${text}`} aria-busy={loading} disabled={loading}
      title={loading ? translationZh ? "正在朗读例句与中文…" : "正在加载自然语音…" : label ?? "播放自然语音"}
      onClick={(event) => {
        event.stopPropagation(); event.preventDefault();
        const id = generation.current;
        setLoading(true); setMessage("");
        const playback = translationZh?.trim() ? speakSequence([{ text, language }, { text: translationZh, language: "zh-CN" }]) : speak(text, language);
        void playback.then((result) => {
          if (id !== generation.current) return;
          setLoading(false);
          if (!result.ok) setMessage(result.message);
        });
      }}><Volume2 size={size} aria-hidden="true" /></button>
    {message && <small className="speech-message" role="status">{message}</small>}

  </span>;
}
