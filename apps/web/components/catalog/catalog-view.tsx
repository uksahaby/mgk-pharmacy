import Link from "next/link";
import { PackageSearch, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import { apiGet } from "@/lib/server-api";
import type { Category, ProductList } from "@/lib/types";
import { ProductGrid } from "@/components/product-card";
import { Breadcrumbs, EmptyState, Pagination } from "@/components/ui";
import { CategoryIcon } from "@/components/category-icon";
import { SortSelect } from "./sort-select";

export type CatalogParams = {
  q?: string;
  rx?: string;
  inStock?: string;
  sort?: string;
  page?: string;
  price?: string;
};

const PRICE_BANDS = [
  { key: "0-2000", label: "Under ₦2,000" },
  { key: "2000-5000", label: "₦2,000 – ₦5,000" },
  { key: "5000-15000", label: "₦5,000 – ₦15,000" },
  { key: "15000-", label: "Over ₦15,000" },
];

export async function CatalogView({ params, category }: { params: CatalogParams; category?: Category }) {
  const page = Math.max(1, Number(params.page) || 1);
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (category) qs.set("category", category.slug);
  if (params.rx) qs.set("rx", params.rx);
  if (params.inStock) qs.set("inStock", "true");
  if (params.sort) qs.set("sort", params.sort);
  if (params.price) {
    const [min, max] = params.price.split("-");
    if (min) qs.set("minPrice", min);
    if (max) qs.set("maxPrice", max);
  }
  qs.set("page", String(page));
  qs.set("pageSize", "24");

  const [list, cats] = await Promise.all([
    apiGet<ProductList>(`/products?${qs}`),
    apiGet<{ categories: Category[] }>("/categories"),
  ]);
  const categories = cats?.categories ?? [];
  const base = category ? `/category/${category.slug}` : "/shop";

  /** Builds a URL keeping current filters, overriding the given ones (page resets unless set). */
  const href = (patch: Partial<CatalogParams>) => {
    const next = new URLSearchParams();
    const merged = { ...params, page: undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, String(v));
    const s = next.toString();
    return s ? `${base}?${s}` : base;
  };

  const title = params.q ? `Results for “${params.q}”` : category?.name ?? "All products";
  const activeFilters = [params.rx, params.inStock, params.price].filter(Boolean).length;

  const filters = (
    <div className="space-y-8">
      <FilterGroup title="Category">
        <FilterLink href={params.q ? `/shop?q=${encodeURIComponent(params.q)}` : "/shop"} active={!category}>
          All categories
        </FilterLink>
        {categories.map((c) => (
          <FilterLink
            key={c.slug}
            href={`/category/${c.slug}${params.q ? `?q=${encodeURIComponent(params.q)}` : ""}`}
            active={category?.slug === c.slug}
            icon={<CategoryIcon icon={c.icon} className="h-4 w-4" />}
            count={c.productCount}
          >
            {c.name}
          </FilterLink>
        ))}
      </FilterGroup>
      <FilterGroup title="Prescription">
        <FilterLink href={href({ rx: undefined })} active={!params.rx}>Any</FilterLink>
        <FilterLink href={href({ rx: "OTC" })} active={params.rx === "OTC"}>No prescription needed</FilterLink>
        <FilterLink href={href({ rx: "POM" })} active={params.rx === "POM"}>Prescription only</FilterLink>
        <FilterLink href={href({ rx: "CONTROLLED" })} active={params.rx === "CONTROLLED"}>Controlled</FilterLink>
      </FilterGroup>
      <FilterGroup title="Price">
        <FilterLink href={href({ price: undefined })} active={!params.price}>Any price</FilterLink>
        {PRICE_BANDS.map((b) => (
          <FilterLink key={b.key} href={href({ price: b.key })} active={params.price === b.key}>
            {b.label}
          </FilterLink>
        ))}
      </FilterGroup>
      <FilterGroup title="Availability">
        <FilterLink href={href({ inStock: params.inStock ? undefined : "1" })} active={!!params.inStock} checkbox>
          In stock only
        </FilterLink>
      </FilterGroup>
    </div>
  );

  return (
    <div className="container py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: category ? "/shop" : undefined }, ...(category ? [{ label: category.name }] : [])]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1.5 max-w-2xl text-ink-muted">
            {category?.description ?? "Genuine medicines and health products from licensed suppliers, checked by our pharmacists."}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          {filters}
        </aside>

        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
            <p className="text-sm text-ink-muted" aria-live="polite">
              <span className="font-semibold text-ink">{list?.total ?? 0}</span> products
            </p>
            <div className="flex items-center gap-2">
              <details className="relative lg:hidden">
                <summary className="btn-outline btn-sm cursor-pointer list-none">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters{activeFilters ? ` (${activeFilters})` : ""}
                </summary>
                <div className="absolute left-0 z-30 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-lift sm:left-auto sm:right-0">
                  {filters}
                </div>
              </details>
              <SortSelect value={params.sort ?? "relevance"} />
            </div>
          </div>

          {list && list.products.length > 0 ? (
            <>
              <ProductGrid products={list.products} />
              <div className="mt-10">
                <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined })} />
              </div>
            </>
          ) : (
            <EmptyState
              icon={<PackageSearch className="h-7 w-7" />}
              title="No products match your search"
              action={
                <Link href="/shop" className="btn-primary">
                  Clear filters
                </Link>
              }
            >
              Try a generic name (for example “paracetamol” instead of a brand), remove a filter, or ask a pharmacist on WhatsApp.
              We can often source items within 24 hours.
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</h2>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
  icon,
  count,
  checkbox,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  checkbox?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={active ? "true" : undefined}
        className={clsx(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition",
          active ? "bg-brand-50 font-semibold text-brand-800" : "text-ink-soft hover:bg-slate-100 hover:text-ink",
        )}
      >
        {checkbox && (
          <span className={clsx("grid h-4 w-4 place-items-center rounded border", active ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white")}>
            {active && <svg viewBox="0 0 12 12" className="h-3 w-3"><path d="M2.5 6.5 5 9l4.5-6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>}
          </span>
        )}
        {icon}
        <span className="flex-1">{children}</span>
        {count !== undefined && <span className="text-xs text-ink-muted">{count}</span>}
      </Link>
    </li>
  );
}
