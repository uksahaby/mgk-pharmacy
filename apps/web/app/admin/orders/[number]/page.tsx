import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, FileText, Receipt } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { Order, OrderStatus } from "@/lib/types";
import { formatDateTime, formatNaira, formatPhone, paymentMethodLabel } from "@/lib/format";
import { OrderStatusPill, PaymentStatusPill, ReviewPill, RxBadge } from "@/components/badges";
import { OrderAdminActions } from "./order-admin-actions";
import { LiveTracking } from "@/components/order/live-tracking";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const data = await apiGet<{ order: Order; allowedTransitions: OrderStatus[] }>(`/admin/orders/${encodeURIComponent(number)}`);
  if (!data) notFound();
  const o = data.order;
  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Orders
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{o.number}</h1>
          <p className="text-sm text-ink-muted">Placed {formatDateTime(o.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <OrderStatusPill status={o.status} />
          <PaymentStatusPill status={o.paymentStatus} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {o.status === "DISPATCHED" && o.delivery?.live && <LiveTracking number={o.number} code={o.delivery.code} staff />}
          <section className="card overflow-hidden">
            <h2 className="border-b border-slate-100 px-5 py-4 font-semibold">Items</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {o.items.map((i) => (
                  <tr key={i.productId}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{i.name}</p>
                      <p className="text-xs text-ink-muted">{i.packSize}</p>
                      <RxBadge status={i.rxStatus} className="mt-1" />
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{i.quantity} × {formatNaira(i.priceKobo)}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatNaira(i.priceKobo * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 text-sm">
                <tr><td className="px-5 py-2 text-ink-muted" colSpan={2}>Subtotal</td><td className="px-5 py-2 text-right">{formatNaira(o.subtotalKobo)}</td></tr>
                <tr><td className="px-5 py-2 text-ink-muted" colSpan={2}>{o.fulfilment === "PICKUP" ? "Pickup" : `Delivery (${o.zone?.name ?? "—"})`}</td><td className="px-5 py-2 text-right">{formatNaira(o.shippingKobo)}</td></tr>
                <tr className="font-bold"><td className="px-5 py-2" colSpan={2}>Total</td><td className="px-5 py-2 text-right">{formatNaira(o.totalKobo)}</td></tr>
              </tfoot>
            </table>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Timeline</h2>
            <ol className="mt-4 space-y-3 border-l-2 border-slate-100 pl-4 text-sm">
              {[...o.events].reverse().map((e, i) => (
                <li key={i}>
                  <p className="font-medium">{e.message}</p>
                  <p className="text-xs text-ink-muted">{formatDateTime(e.createdAt)} · {e.actor}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <OrderAdminActions order={o} allowed={data.allowedTransitions} />

          <section className="card space-y-4 p-5 text-sm">
            <div>
              <h2 className="font-semibold">Customer</h2>
              <p className="mt-1 text-ink-soft">
                {o.customer.firstName} {o.customer.lastName}
                <br />
                <a href={`mailto:${o.customer.email}`} className="hover:underline">{o.customer.email}</a>
                <br />
                <a href={`tel:${o.customer.phone}`} className="hover:underline">{formatPhone(o.customer.phone)}</a>
              </p>
            </div>
            <div>
              <h2 className="font-semibold">{o.fulfilment === "PICKUP" ? "Store pickup" : "Deliver to"}</h2>
              {o.address && (
                <p className="mt-1 text-ink-soft">
                  {o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}<br />
                  {o.address.city}, {o.address.state}
                  {o.address.landmark && <><br />Landmark: {o.address.landmark}</>}
                </p>
              )}
            </div>
            <div>
              <h2 className="font-semibold">Payment</h2>
              <p className="mt-1 text-ink-soft">{paymentMethodLabel[o.paymentMethod]}{o.paymentRef ? ` · ref ${o.paymentRef}` : ""}</p>
              {o.hasProof && (
                <a href={`/api/admin/orders/${o.number}/payment-proof`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
                  <Receipt className="h-4 w-4" aria-hidden /> View transfer receipt <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {o.prescription && (
              <div>
                <h2 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" aria-hidden /> Prescription <ReviewPill status={o.prescription.status as "PENDING"} /></h2>
                <a href={`/api/admin/prescriptions/${o.prescription.id}/file`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
                  Open file <ExternalLink className="h-3 w-3" />
                </a>
                {o.prescription.status === "PENDING" && (
                  <Link href="/admin/prescriptions" className="mt-1 block text-ink-muted underline">Review in prescriptions queue</Link>
                )}
              </div>
            )}
            {o.notes && (
              <div>
                <h2 className="font-semibold">Customer notes</h2>
                <p className="mt-1 rounded-lg bg-amber-50 p-2 text-ink-soft">{o.notes}</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
