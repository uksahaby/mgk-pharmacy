"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatDate } from "@/lib/format";
import { useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";

export type Batch = { id: string; batchNumber: string; expiresAt: string; quantity: number; status: "ACTIVE" | "QUARANTINED" | "RECALLED"; receivedAt: string };

export function Batches({ productId, batches }: { productId: string; batches: Batch[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ batchNumber: "", expiresAt: "", quantity: "" });
  const { pending, error, run } = useSubmit();
  const now = Date.now();

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold">Stock batches</h2>
        <p className="text-xs text-ink-muted">Orders draw from the earliest-expiring batch first (FEFO). Quarantined or recalled batches are never sold.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Batch</th>
              <th className="px-5 py-2.5 font-semibold">Expiry</th>
              <th className="px-5 py-2.5 text-right font-semibold">Qty</th>
              <th className="px-5 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.map((b) => {
              const expired = new Date(b.expiresAt).getTime() < now;
              const soon = !expired && new Date(b.expiresAt).getTime() < now + 90 * 86_400_000;
              return (
                <tr key={b.id}>
                  <td className="px-5 py-2.5 font-mono">{b.batchNumber}</td>
                  <td className={`px-5 py-2.5 ${expired ? "font-semibold text-brand-700" : soon ? "font-semibold text-orange-700" : ""}`}>
                    {formatDate(b.expiresAt)} {expired ? "(expired)" : soon ? "(≤ 90 days)" : ""}
                  </td>
                  <td className="px-5 py-2.5 text-right">{b.quantity}</td>
                  <td className="px-5 py-2.5">
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                      value={b.status}
                      aria-label={`Status of batch ${b.batchNumber}`}
                      onChange={async (e) => {
                        const ok = await run(() => api(`/admin/batches/${b.id}/status`, { json: { status: e.target.value } }));
                        if (ok) router.refresh();
                      }}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="QUARANTINED">Quarantined</option>
                      <option value="RECALLED">Recalled</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <form
        className="flex flex-wrap items-end gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await run(() => api(`/admin/products/${productId}/batches`, { json: form }));
          if (ok) {
            setForm({ batchNumber: "", expiresAt: "", quantity: "" });
            router.refresh();
          }
        }}
      >
        <label className="text-sm">
          <span className="label">Batch no.</span>
          <input className="input w-36" required value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="label">Expiry date</span>
          <input className="input w-44" type="date" required value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="label">Quantity</span>
          <input className="input w-28" type="number" min={1} required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </label>
        <button className="btn-dark" disabled={pending}><Plus className="h-4 w-4" aria-hidden /> Receive stock</button>
        {error && <Alert tone="error" className="w-full">{error}</Alert>}
      </form>
    </section>
  );
}
