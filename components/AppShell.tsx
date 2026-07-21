"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookMarked,
  BookOpenText,
  ChevronRight,
  CircleHelp,
  Heart,
  Home,
  Menu,
  NotebookPen,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const navigation = [
  { path: "/", label: "首页", icon: Home },
  { path: "/words", label: "单词", icon: BookOpenText },
  { path: "/grammar", label: "语法", icon: NotebookPen },
  { path: "/test", label: "测试", icon: CircleHelp },
  { path: "/mistakes", label: "错题本", icon: BookMarked },
  { path: "/favorites", label: "收藏", icon: Heart },
  { path: "/ai", label: "AI 内容", icon: Sparkles },
  { path: "/stats", label: "学习统计", icon: BarChart3 },
  { path: "/settings", label: "设置", icon: Settings },
] as const;

const primaryMobileNavigation = [
  { ...navigation[0], label: "今日" },
  ...navigation.slice(1, 4),
] as const;
const secondaryMobileNavigation = navigation.slice(4);
const desktopGroups = [
  { label: "学习", items: navigation.slice(0, 4) },
  { label: "复习", items: navigation.slice(4, 6) },
  { label: "工具", items: navigation.slice(6) },
] as const;

function isActive(pathname: string, path: string): boolean {
  return path === "/" ? pathname === "/" : pathname.startsWith(path);
}

export function AppShell({
  children,
  focusMode,
  onExitFocus,
}: {
  children: ReactNode;
  focusMode: boolean;
  onExitFocus: () => void;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const moreCloseRef = useRef<HTMLButtonElement>(null);

  const closeMore = useCallback(() => {
    setMoreOpen(false);
    window.setTimeout(() => moreTriggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && moreOpen) closeMore();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeMore, moreOpen]);

  useEffect(() => {
    if (moreOpen) moreCloseRef.current?.focus();
  }, [moreOpen]);

  if (focusMode) {
    return (
      <div className="focus-shell">
        <button className="focus-exit" onClick={onExitFocus} type="button">
          <X size={18} aria-hidden="true" />
          退出专注
          <kbd>Esc</kbd>
        </button>
        <main className="focus-content">{children}</main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <Link className="brand" href="/" aria-label="LinguaStep 日英阶梯首页">
          <span className="brand-mark">L</span>
          <span>
            <strong>LinguaStep</strong>
            <small>日英阶梯</small>
          </span>
        </Link>

        <nav className="sidebar-nav">
          {desktopGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.path);
                return (
                  <Link
                    className={`nav-item${active ? " active" : ""}`}
                    href={item.path}
                    key={item.path}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="level-pill">
            <span>当前目标</span>
            <strong>日语 N2 · 英语四级</strong>
          </div>
          <p>日语与英语，一起稳步进阶</p>
        </div>
      </aside>

      <div className="content-column">
        <header className="mobile-header">
          <Link className="brand compact" href="/">
            <span className="brand-mark">L</span>
            <span>
              <strong>LinguaStep</strong>
              <small>日英阶梯</small>
            </span>
          </Link>
        </header>
        <main className="page-content">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="移动端主导航">
        {primaryMobileNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.path);
          return (
            <Link
              className={`mobile-nav-item${active ? " active" : ""}`}
              href={item.path}
              key={item.path}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          ref={moreTriggerRef}
          className={`mobile-nav-item${moreOpen ? " active" : ""}`}
          onClick={() => (moreOpen ? closeMore() : setMoreOpen(true))}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-menu"
          type="button"
        >
          <Menu size={20} aria-hidden="true" />
          <span>更多</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="mobile-sheet-backdrop" role="presentation" onClick={closeMore}>
          <section
            className="mobile-sheet"
            id="mobile-more-menu"
            role="dialog"
            aria-modal="true"
            aria-label="更多页面"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-title-row">
              <h2>更多</h2>
              <button ref={moreCloseRef} className="icon-button" onClick={closeMore} aria-label="关闭更多菜单">
                <X size={20} />
              </button>
            </div>
            <div className="mobile-more-list">
              {secondaryMobileNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link href={item.path} key={item.path} className="mobile-more-item" onClick={closeMore}>
                    <span className="mobile-more-icon"><Icon size={20} /></span>
                    <span>{item.label}</span>
                    <ChevronRight size={18} className="muted-icon" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
