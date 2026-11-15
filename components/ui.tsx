import Link from "next/link";
import { CATEGORY_STYLES } from "@/lib/boac";

export function CategoryPill({ category }: { category: string }) {
  return (
    <span className={`chip ${CATEGORY_STYLES[category] ?? "bg-moss-100 text-moss-800"}`}>{category}</span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-emerald-100 text-emerald-800",
    closed: "bg-rose-100 text-rose-800",
    maintenance: "bg-amber-100 text-amber-900",
    published: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-900",
    rejected: "bg-rose-100 text-rose-800",
    verified: "bg-emerald-100 text-emerald-800",
    placed: "bg-sky-100 text-sky-800",
    confirmed: "bg-indigo-100 text-indigo-800",
    preparing: "bg-amber-100 text-amber-900",
    ready: "bg-teal-100 text-teal-800",
    out_for_delivery: "bg-violet-100 text-violet-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-rose-100 text-rose-800",
    new: "bg-sky-100 text-sky-800",
    dispatched: "bg-amber-100 text-amber-900",
    resolved: "bg-emerald-100 text-emerald-800",
    paid: "bg-emerald-100 text-emerald-800",
    low: "bg-moss-100 text-moss-800",
    moderate: "bg-amber-100 text-amber-900",
    high: "bg-orange-100 text-orange-900",
    critical: "bg-rose-100 text-rose-800",
  };
  return <span className={`chip ${map[status] ?? "bg-moss-100 text-moss-800"}`}>{status.replace(/_/g, " ")}</span>;
}

export function SectionHead({
  title,
  subtitle,
  href,
  linkLabel = "See all",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-moss-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-moss-600">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="shrink-0 text-sm font-semibold text-moss-700 hover:text-moss-900">
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  );
}

export function Empty({
  emoji = "🌾",
  title,
  body,
  action,
}: {
  emoji?: string;
  title: string;
  body?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center">
      <span className="animate-floaty text-3xl" aria-hidden="true">
        {emoji}
      </span>
      <p className="font-semibold text-moss-900">{title}</p>
      {body ? <p className="max-w-md text-sm text-moss-600">{body}</p> : null}
      {action ? (
        <Link href={action.href} className="btn-primary mt-2">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-moss-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-gold-400 transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: React.ReactNode }) {
  const map = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${map[tone]}`}>{children}</div>;
}
