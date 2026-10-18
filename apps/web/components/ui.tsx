import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, XCircle } from "lucide-react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink-soft">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

const ALERT = {
  info: { cls: "border-sky-200 bg-sky-50 text-sky-900", Icon: Info },
  success: { cls: "border-care-100 bg-care-50 text-care-700", Icon: CheckCircle2 },
  warning: { cls: "border-amber-200 bg-amber-50 text-amber-900", Icon: AlertTriangle },
  error: { cls: "border-brand-200 bg-brand-50 text-brand-900", Icon: XCircle },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof ALERT;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { cls, Icon } = ALERT[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={clsx("flex gap-3 rounded-2xl border p-4 text-sm", cls, className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-ink-soft">{icon}</div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {children && <div className="mt-1.5 max-w-md text-sm text-ink-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      <PageLink href={page > 1 ? hrefFor(page - 1) : undefined} label="Previous page">
        <ChevronLeft className="h-4 w-4" />
      </PageLink>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-ink-muted">…</span>}
          <PageLink href={hrefFor(p)} active={p === page} label={`Page ${p}`}>
            {p}
          </PageLink>
        </span>
      ))}
      <PageLink href={page < pageCount ? hrefFor(page + 1) : undefined} label="Next page">
        <ChevronRight className="h-4 w-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({ href, active, label, children }: { href?: string; active?: boolean; label: string; children: React.ReactNode }) {
  const cls = clsx(
    "grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-semibold",
    active ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-slate-200 hover:bg-slate-50",
    !href && "pointer-events-none opacity-40",
  );
  return href ? (
    <Link href={href} className={cls} aria-label={label} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  ) : (
    <span className={cls} aria-hidden>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-ink-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-bold sm:text-[28px]">{title}</h2>
      </div>
      {action}
    </div>
  );
}
