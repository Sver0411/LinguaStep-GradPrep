"use client";

import { ChevronLeft } from "lucide-react";

export function MobileSubHeader({ title, onBack }: { title: string; detail: string; onBack: () => void }) {
  return <header className="m3-sub-header"><button aria-label="返回" className="m3-back" onClick={onBack} type="button"><ChevronLeft size={20} /></button><div><h1>{title}</h1></div><span /></header>;
}
