import Link from "next/link";
import { site } from "@/lib/site";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${site.name} home`}>
      <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-brand-600 shadow-sm">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" aria-hidden>
          <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4Z" fill="currentColor" />
        </svg>
      </span>
      <span className="leading-none">
        <span className={`block font-display text-xl font-extrabold tracking-tight ${inverted ? "text-white" : "text-ink"}`}>
          MGK<span className="text-brand-600">.</span>
        </span>
        <span className={`block text-[10px] font-semibold uppercase tracking-[0.2em] ${inverted ? "text-slate-400" : "text-ink-muted"}`}>
          Pharmacy
        </span>
      </span>
    </Link>
  );
}
