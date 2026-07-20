"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function FilterPanel({
  ariaLabel,
  children,
  className = "search-filter-panel",
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        className="button button-secondary mobile-filter-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal size={17} />搜索与筛选
      </button>
      {open && (
        <button
          className="filter-drawer-backdrop"
          type="button"
          aria-label="关闭筛选抽屉"
          onClick={() => setOpen(false)}
        />
      )}
      <section
        className={`${className} card filter-panel ${open ? "mobile-open" : "mobile-collapsed"}`}
        aria-label={ariaLabel}
      >
        <div className="filter-drawer-heading">
          <div><span className="section-kicker">FILTERS</span><h2>搜索与筛选</h2></div>
          <button className="icon-button" type="button" aria-label="关闭筛选" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        {children}
      </section>
    </>
  );
}
