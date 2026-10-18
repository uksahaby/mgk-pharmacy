import type { Metadata } from "next";
import { Search } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import { formatDate, formatNaira, formatPhone } from "@/lib/format";
import { ReviewPill } from "@/components/badges";

export const metadata: Metadata = { title: "Customers" };

type Customer = { id: string; name: string; email: string; phone: string | null; verificationStatus: "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED"; orders: number; spentKobo: number; createdAt: string };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const data = await apiGet<{ customers: Customer[] }>(`/admin/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Customers</h1>
        <form className="relative" action="/admin/customers">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Email, surname or phone" className="input w-64 pl-9" aria-label="Search customers" />
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">Phone</th>
              <th className="px-5 py-3 font-semibold">Identity</th>
              <th className="px-5 py-3 text-right font-semibold">Orders</th>
              <th className="px-5 py-3 text-right font-semibold">Spent</th>
              <th className="px-5 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.customers.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-3"><p className="font-medium">{c.name}</p><p className="text-xs text-ink-muted">{c.email}</p></td>
                <td className="px-5 py-3 text-ink-soft">{formatPhone(c.phone)}</td>
                <td className="px-5 py-3"><ReviewPill status={c.verificationStatus} /></td>
                <td className="px-5 py-3 text-right">{c.orders}</td>
                <td className="px-5 py-3 text-right font-medium">{formatNaira(c.spentKobo)}</td>
                <td className="px-5 py-3 text-ink-soft">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
