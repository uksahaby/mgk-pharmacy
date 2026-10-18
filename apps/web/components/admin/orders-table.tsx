import Link from "next/link";
import type { Order } from "@/lib/types";
import { formatDateTime, formatNaira } from "@/lib/format";
import { OrderStatusPill, PaymentStatusPill } from "@/components/badges";

export function OrdersTable({ orders }: { orders: Order[] }) {
  if (!orders.length) return <p className="p-6 text-sm text-ink-muted">No orders found.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-ink-muted">
          <tr>
            <th className="px-5 py-3 font-semibold">Order</th>
            <th className="px-5 py-3 font-semibold">Customer</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold">Payment</th>
            <th className="px-5 py-3 font-semibold">Fulfilment</th>
            <th className="px-5 py-3 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o) => (
            <tr key={o.number} className="hover:bg-slate-50">
              <td className="px-5 py-3">
                <Link href={`/admin/orders/${o.number}`} className="font-semibold text-ink hover:underline">{o.number}</Link>
                <span className="block text-xs text-ink-muted">{formatDateTime(o.createdAt)}</span>
              </td>
              <td className="px-5 py-3">
                {o.customer.firstName} {o.customer.lastName}
                <span className="block text-xs text-ink-muted">{o.customer.email}</span>
              </td>
              <td className="px-5 py-3"><OrderStatusPill status={o.status} />{o.requiresRx && <span className="chip ml-1 bg-amber-100 text-amber-800">Rx</span>}</td>
              <td className="px-5 py-3"><PaymentStatusPill status={o.paymentStatus} /></td>
              <td className="px-5 py-3 text-ink-soft">{o.fulfilment === "PICKUP" ? "Pickup" : `${o.address?.city ?? ""}, ${o.address?.state ?? ""}`}</td>
              <td className="px-5 py-3 text-right font-semibold">{formatNaira(o.totalKobo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
