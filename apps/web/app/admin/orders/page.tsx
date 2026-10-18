import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { Search } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { Order, OrderStatus } from "@/lib/types";
import { orderStatusLabel } from "@/lib/format";
import { OrdersTable } from "@/components/admin/orders-table";
import { Pagination } from "@/components/ui";

export const metadata: Metadata = { title: "Orders" };

const TABS: (OrderStatus | "")[] = ["", "AWAITING_RX_REVIEW", "AWAITING_PAYMENT", "PROCESSING", "READY_FOR_PICKUP", "DISPATCHED", "DELIVERED", "COMPLETED", "CANCELLED"];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string; queue?: string }> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.status) qs.set("status", sp.status);
  if (sp.q) qs.set("q", sp.q);
  if (sp.queue) qs.set("queue", sp.queue);
  qs.set("page", sp.page ?? "1");
  const data = await apiGet<{ orders: Order[]; total: number; page: number; pageCount: number }>(`/admin/orders?${qs}`);
  const href = (patch: Record<string, string | undefined>) => {
    const n = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: sp.status, q: sp.q, queue: sp.queue, ...patch })) if (v) n.set(k, v);
    return `/admin/orders${n.toString() ? `?${n}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-ink-muted">{data?.total ?? 0} orders{sp.queue === "proof" ? " with transfer receipts to confirm" : ""}</p>
        </div>
        <form className="relative w-full max-w-xs" action="/admin/orders">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input name="q" defaultValue={sp.q} placeholder="Order no., email, name or phone" className="input pl-9" aria-label="Search orders" />
        </form>
      </div>
      <nav className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" aria-label="Filter by status">
        {TABS.map((t) => (
          <Link
            key={t || "all"}
            href={href({ status: t || undefined, page: undefined, queue: undefined })}
            className={clsx("whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium", (sp.status ?? "") === t && !sp.queue ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-slate-200 hover:ring-slate-300")}
          >
            {t ? orderStatusLabel[t] : "All"}
          </Link>
        ))}
        <Link href="/admin/orders?queue=proof" className={clsx("whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium", sp.queue === "proof" ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-slate-200")}>
          Receipts to confirm
        </Link>
      </nav>
      <div className="card overflow-hidden">
        <OrdersTable orders={data?.orders ?? []} />
      </div>
      {data && <Pagination page={data.page} pageCount={data.pageCount} hrefFor={(p) => href({ page: String(p) })} />}
    </div>
  );
}
