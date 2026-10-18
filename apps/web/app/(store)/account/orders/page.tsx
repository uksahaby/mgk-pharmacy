import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { Order } from "@/lib/types";
import { formatDate, formatNaira, pluralize } from "@/lib/format";
import { OrderStatusPill, PaymentStatusPill } from "@/components/badges";
import { EmptyState, PageHeader } from "@/components/ui";
import { ProductArt } from "@/components/product-art";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  const data = await apiGet<{ orders: Order[] }>("/orders");
  const orders = data?.orders ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Orders" subtitle="Track deliveries, pay, cancel or reorder." />
      {orders.length === 0 ? (
        <EmptyState icon={<Package className="h-7 w-7" />} title="No orders yet" action={<Link href="/shop" className="btn-primary">Start shopping</Link>}>
          When you place an order it'll appear here with live status updates.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.number}>
              <Link href={`/account/orders/${o.number}`} className="card flex flex-col gap-4 p-5 transition hover:shadow-lift sm:flex-row sm:items-center">
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((i) => (
                    <div key={i.productId} className="w-12 overflow-hidden rounded-lg ring-2 ring-white">
                      <ProductArt name={i.name} icon={i.icon} size="sm" />
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{o.number}</p>
                    <OrderStatusPill status={o.status} />
                    {o.status !== "CANCELLED" && <PaymentStatusPill status={o.paymentStatus} />}
                  </div>
                  <p className="mt-1 truncate text-sm text-ink-muted">
                    {formatDate(o.createdAt)} · {pluralize(o.items.reduce((s, i) => s + i.quantity, 0), "item")} ·{" "}
                    {o.items.map((i) => i.name).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold">{formatNaira(o.totalKobo)}</p>
                  <ChevronRight className="h-5 w-5 text-ink-muted" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
