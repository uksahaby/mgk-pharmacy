import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { Category, ProductSummary } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { RxBadge } from "@/components/badges";
import { Pagination } from "@/components/ui";

export const metadata: Metadata = { title: "Products" };

type Row = ProductSummary & { active: boolean; stock: number };
type Params = { q?: string; page?: string; category?: string; rx?: string; stock?: string };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const filters = Object.fromEntries(Object.entries({ q: sp.q, category: sp.category, rx: sp.rx, stock: sp.stock }).filter(([, v]) => v)) as Record<string, string>;
  const [data, cats] = await Promise.all([
    apiGet<{ products: Row[]; total: number; page: number; pageCount: number }>(`/admin/products?${new URLSearchParams({ page: sp.page ?? "1", ...filters })}`),
    apiGet<{ categories: Category[] }>("/categories"),
  ]);
  const other = cats?.categories.find((c) => c.slug === "other");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-ink-muted">{data?.total ?? 0} products{Object.keys(filters).length ? " match your filters" : ""}</p>
        </div>
        <Link href="/admin/products/new" className="btn-primary"><Plus className="h-4 w-4" aria-hidden /> New product</Link>
      </div>

      {other && other.productCount > 0 && sp.category !== "other" && (
        <Link href="/admin/products?category=other" className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm hover:bg-amber-100/60">
          <span>
            <strong>{other.productCount.toLocaleString()} imported products still need a category.</strong> Most were defaulted to
            prescription-only for safety. Review them to make them easier to find.
          </span>
          <span className="btn-dark btn-sm shrink-0">Review now</span>
        </Link>
      )}

      {sp.stock === "never" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-ink-soft">
          <strong className="text-ink">Listed but never stocked.</strong> These products are in the catalogue but have never had stock
          received or sold. They show as out of stock in the shop. Open one and use “Receive stock” when it arrives, or hide products
          you don't plan to carry.
        </div>
      )}

      <form className="card flex flex-wrap items-end gap-3 p-4" action="/admin/products">
        {sp.stock && <input type="hidden" name="stock" value={sp.stock} />}
        <label className="relative min-w-56 flex-1">
          <span className="label">Search</span>
          <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400" aria-hidden />
          <input name="q" defaultValue={sp.q} placeholder="Name, generic or brand" className="input pl-9" />
        </label>
        <label>
          <span className="label">Category</span>
          <select name="category" defaultValue={sp.category ?? ""} className="input w-56">
            <option value="">All categories</option>
            {cats?.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.productCount})</option>)}
          </select>
        </label>
        <label>
          <span className="label">Dispensing class</span>
          <select name="rx" defaultValue={sp.rx ?? ""} className="input w-44">
            <option value="">Any</option>
            <option value="OTC">OTC</option>
            <option value="POM">Prescription only</option>
            <option value="CONTROLLED">Controlled</option>
          </select>
        </label>
        <button className="btn-dark">Apply</button>
        {Object.keys(filters).length > 0 && <Link href="/admin/products" className="btn-ghost">Clear</Link>}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-5 py-3 font-semibold">Category</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 text-right font-semibold">Price</th>
              <th className="px-5 py-3 text-right font-semibold">Stock</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link href={`/admin/products/${p.id}`} className="font-semibold hover:underline">{p.name} {p.strength}</Link>
                  <span className="block text-xs text-ink-muted">{p.genericName} · {p.packSize}</span>
                </td>
                <td className="px-5 py-3 text-ink-soft">{p.category?.name}</td>
                <td className="px-5 py-3">{p.rxStatus === "OTC" ? <span className="chip bg-slate-100 text-ink-soft">OTC</span> : <RxBadge status={p.rxStatus} />}</td>
                <td className="px-5 py-3 text-right font-medium">{formatNaira(p.priceKobo)}</td>
                <td className={`px-5 py-3 text-right font-semibold ${p.stock === 0 ? "text-brand-700" : p.stock <= 10 ? "text-orange-700" : ""}`}>{p.stock}</td>
                <td className="px-5 py-3">{p.active ? <span className="chip bg-care-100 text-care-700">Live</span> : <span className="chip bg-slate-200 text-slate-700">Hidden</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} pageCount={data.pageCount} hrefFor={(p) => `/admin/products?${new URLSearchParams({ ...filters, page: String(p) })}`} />}
    </div>
  );
}
