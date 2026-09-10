"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { isSpeechSupported, preload, speak, warmUpSpeech, type SpeechLanguage } from "@/lib/speech";

export function SpeakButton({
  text,
  language,
  label,
  size = 17,
  className = "",
}: {
  text: string;
  language: SpeechLanguage;
  label?: string;
  size?: number;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (!isSpeechSupported()) return;
    warmUpSpeech();
    setSupported(true);
  }, []);

  // Fetch the clip ahead of the click. Mobile browsers refuse audio that
  // starts after an await, so having the blob already in hand is what keeps
  // the real recording playing instead of falling back to the system voice.
  useEffect(() => {
    if (!text.trim()) return;
    const timer = window.setTimeout(() => preload(text, language), 120);
    return () => window.clearTimeout(timer);
  }, [language, text]);

  if (!supported || !text.trim()) return null;

  return (
    <button
      type="button"
      className={`speak-button${className ? ` ${className}` : ""}`}
      aria-label={label ?? `朗读 ${text}`}
      title={label ?? "朗读"}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        speak(text, language);
      }}
    >
      <Volume2 size={size} aria-hidden="true" />
    </button>
  );
}
