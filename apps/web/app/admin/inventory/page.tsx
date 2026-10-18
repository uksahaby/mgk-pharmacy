import type { Metadata } from "next";
import Link from "next/link";
import { apiGet } from "@/lib/server-api";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Inventory" };

type Inventory = {
  lowStock: { id: string; name: string; packSize: string; stock: number; soldCount: number }[];
  neverStocked: number;
  threshold: number;
  expiring: { id: string; productId: string; productName: string; batchNumber: string; quantity: number; expiresAt: string; expired: boolean }[];
};

export default async function InventoryPage() {
  const data = (await apiGet<Inventory>("/admin/inventory"))!;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-ink-muted">Reorder low stock and act on expiring batches before they become waste.</p>
      </div>
      {data.neverStocked > 0 && (
        <Link href="/admin/products?stock=never" className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm hover:border-slate-300">
          <span>
            <strong>{data.neverStocked.toLocaleString()} products are listed but have never been stocked.</strong> They aren&apos;t counted as
            low stock. Review them separately.
          </span>
          <span className="btn-outline btn-sm shrink-0">View list</span>
        </Link>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold">Running low ({data.lowStock.length})</h2>
            <p className="text-xs text-ink-muted">Stocked products with {data.threshold} or fewer sellable units, fastest sellers first.</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {data.lowStock.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-2.5"><Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link><span className="block text-xs text-ink-muted">{p.packSize}</span></td>
                  <td className="px-5 py-2.5 text-xs text-ink-muted">{p.soldCount} sold</td>
                  <td className={`px-5 py-2.5 text-right font-bold ${p.stock === 0 ? "text-brand-700" : "text-orange-700"}`}>{p.stock === 0 ? "Out" : p.stock}</td>
                </tr>
              ))}
              {!data.lowStock.length && <tr><td className="px-5 py-4 text-ink-muted">Everything is well stocked.</td></tr>}
            </tbody>
          </table>
        </section>
        <section className="card overflow-hidden">
          <h2 className="border-b border-slate-100 px-5 py-4 font-semibold">Expiring within 90 days ({data.expiring.length})</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {data.expiring.map((b) => (
                <tr key={b.id}>
                  <td className="px-5 py-2.5"><Link href={`/admin/products/${b.productId}`} className="font-medium hover:underline">{b.productName}</Link><span className="block font-mono text-xs text-ink-muted">{b.batchNumber}</span></td>
                  <td className="px-5 py-2.5 text-right">{b.quantity} units</td>
                  <td className={`px-5 py-2.5 text-right font-semibold ${b.expired ? "text-brand-700" : "text-orange-700"}`}>{b.expired ? "Expired" : formatDate(b.expiresAt)}</td>
                </tr>
              ))}
              {!data.expiring.length && <tr><td className="px-5 py-4 text-ink-muted">No batches expiring soon.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
