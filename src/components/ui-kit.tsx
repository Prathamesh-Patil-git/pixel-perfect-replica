import type { ReactNode } from "react";

export function PageHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`clay-card p-5 ${className}`}>
      {title && <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="clay-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Btn({ children, variant = "default", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "ghost" }) {
  const v = variant === "primary" ? "clay-btn-primary" : variant === "ghost" ? "rounded-lg hover:bg-muted" : "clay-btn";
  return (
    <button {...p} className={`${v} inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
}

export const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
export const inputCls = "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-inner outline-none focus:ring-2 focus:ring-ring";
