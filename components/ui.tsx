import {
  AlertTriangle,
  ArrowRight,
  Check,
  Inbox,
  LoaderCircle,
  X,
} from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-block">
      <div className="progress-label">
        <span>{label}</span>
        <strong>{Math.round(safeValue)}%</strong>
      </div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={safeValue} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Inbox size={26} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>正在准备你的学习记录…</span>
    </div>
  );
}

export function StorageWarning() {
  return (
    <div className="inline-alert warning" role="alert">
      <AlertTriangle size={18} />
      <span>浏览器本地数据库暂不可用，本次记录将临时保存在当前页面中。</span>
    </div>
  );
}

export function AnswerMark({ correct }: { correct: boolean }) {
  return correct ? <Check size={18} aria-label="正确" /> : <X size={18} aria-label="错误" />;
}

export function TextLink({ children }: { children: ReactNode }) {
  return (
    <span className="text-link">
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </span>
  );
}
