"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  ["relevance", "Recommended"],
  ["popular", "Most popular"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["name", "Name: A–Z"],
  ["newest", "Newest"],
] as const;

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-ink-muted sm:inline">Sort by</span>
      <select
        value={value}
        className="rounded-full border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.delete("page");
          if (e.target.value === "relevance") next.delete("sort");
          else next.set("sort", e.target.value);
          const s = next.toString();
          router.push(s ? `${pathname}?${s}` : pathname, { scroll: false });
        }}
      >
        {OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
