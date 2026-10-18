import Link from "next/link";
import clsx from "clsx";
import { Building2, CheckCircle2, Clock, FileText, MapPin, MessageCircle, PackageCheck, Store, Truck, XCircle } from "lucide-react";
import type { Order } from "@/lib/types";
import { formatDate, formatDateTime, formatNaira, formatPhone, paymentMethodLabel } from "@/lib/format";
import { site } from "@/lib/site";
import { OrderStatusPill, PaymentStatusPill, ReviewPill, RxBadge } from "@/components/badges";
import { ProductArt } from "@/components/product-art";
import { Alert } from "@/components/ui";
import { BuyAgain, CancelOrder, CopyButton, PayOnlineButton, UploadProof } from "./order-actions";
import { LiveTracking } from "./live-tracking";

function steps(order: Order) {
  const s: { key: string; label: string }[] = [{ key: "PLACED", label: "Placed" }];
  if (order.requiresRx) s.push({ key: "RX", label: "Pharmacist review" });
  if (order.paymentMethod !== "PAY_ON_PICKUP") s.push({ key: "PAID", label: "Paid" });
  s.push({ key: "PROCESSING", label: "Preparing" });
  if (order.fulfilment === "DELIVERY") {
    s.push({ key: "DISPATCHED", label: "On its way" }, { key: "DELIVERED", label: "Delivered" });
  } else {
    s.push({ key: "READY_FOR_PICKUP", label: "Ready to collect" }, { key: "COMPLETED", label: "Collected" });
  }
  const reached = (key: string) => {
    const st = order.status;
    switch (key) {
      case "PLACED":
        return true;
      case "RX":
        return st !== "AWAITING_RX_REVIEW" && st !== "CANCELLED" ? true : order.prescription?.status === "APPROVED";
      case "PAID":
        return order.paymentStatus === "PAID" || order.paymentStatus === "REFUND_PENDING" || order.paymentStatus === "REFUNDED";
      case "PROCESSING":
        return ["PROCESSING", "READY_FOR_PICKUP", "DISPATCHED", "DELIVERED", "COMPLETED"].includes(st);
      case "DISPATCHED":
      case "READY_FOR_PICKUP":
        return ["READY_FOR_PICKUP", "DISPATCHED", "DELIVERED", "COMPLETED"].includes(st);
      default:
        return st === key;
    }
  };
  return s.map((x) => ({ ...x, done: reached(x.key) }));
}

export function OrderDetail({ order, accessKey, justPlaced }: { order: Order; accessKey?: string; justPlaced?: boolean }) {
  const cancelled = order.status === "CANCELLED";
  const tracker = steps(order);
  const current = tracker.findIndex((s) => !s.done);

  return (
    <div className="space-y-6">
      {justPlaced && !cancelled && (
        <div className="card flex items-start gap-4 border-care-100 bg-gradient-to-br from-care-50 to-white p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-care-600 text-white">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-xl font-bold">Thank you, {order.customer.firstName}! Your order is in.</h2>
            <p className="mt-1 text-ink-soft">
              We've emailed a confirmation to <strong>{order.customer.email}</strong>. Keep this page handy: it always shows the latest status.
            </p>
          </div>
        </div>
      )}

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink-muted">Order</p>
            <h1 className="font-display text-2xl font-bold tracking-tight">{order.number}</h1>
            <p className="mt-1 text-sm text-ink-muted">Placed {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OrderStatusPill status={order.status} />
            <PaymentStatusPill status={order.paymentStatus} />
          </div>
        </div>

        {!cancelled ? (
          <ol className="mt-8 grid gap-y-4" style={{ gridTemplateColumns: `repeat(${tracker.length}, minmax(0, 1fr))` }} aria-label="Order progress">
            {tracker.map((s, i) => (
              <li key={s.key} className="relative flex flex-col items-center text-center">
                {i > 0 && <span className={clsx("absolute right-1/2 top-3.5 h-0.5 w-full", s.done ? "bg-care-500" : "bg-slate-200")} aria-hidden />}
                <span
                  className={clsx(
                    "relative z-10 grid h-7 w-7 place-items-center rounded-full text-xs font-bold ring-4 ring-white",
                    s.done ? "bg-care-500 text-white" : i === current ? "bg-ink text-white" : "bg-slate-200 text-ink-muted",
                  )}
                >
                  {s.done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : i + 1}
                </span>
                <span className={clsx("mt-2 text-[11px] font-medium leading-tight sm:text-xs", s.done || i === current ? "text-ink" : "text-ink-muted")}>
                  {s.label}
                  <span className="sr-only">{s.done ? " (done)" : i === current ? " (current)" : ""}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <Alert tone="error" className="mt-6" title="This order was cancelled">
            {order.paymentStatus === "REFUND_PENDING"
              ? "Your refund is being processed to your original payment method (2–5 working days)."
              : order.paymentStatus === "REFUNDED"
                ? "Your refund has been completed."
                : "No payment was taken."}
          </Alert>
        )}
      </div>

      <NextStep order={order} accessKey={accessKey} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6" aria-labelledby="items-h">
            <h2 id="items-h" className="text-lg font-semibold">Items</h2>
            <ul className="mt-4 divide-y divide-slate-100">
              {order.items.map((i) => (
                <li key={i.productId} className="flex items-center gap-4 py-3">
                  <div className="w-14 shrink-0 overflow-hidden rounded-lg">
                    <ProductArt name={i.name} icon={i.icon} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {i.slug ? (
                      <Link href={`/product/${i.slug}`} className="font-medium hover:underline">{i.name}</Link>
                    ) : (
                      <p className="font-medium">{i.name}</p>
                    )}
                    <p className="text-sm text-ink-muted">
                      {i.packSize} · {i.quantity} × {formatNaira(i.priceKobo)}
                    </p>
                    <RxBadge status={i.rxStatus} className="mt-1" />
                  </div>
                  <p className="font-semibold">{formatNaira(i.priceKobo * i.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd>{formatNaira(order.subtotalKobo)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">{order.fulfilment === "PICKUP" ? "Pickup" : "Delivery"}</dt><dd>{order.shippingKobo ? formatNaira(order.shippingKobo) : "Free"}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatNaira(order.totalKobo)}</dd></div>
            </dl>
          </section>

          <section className="card p-5 sm:p-6" aria-labelledby="timeline-h">
            <h2 id="timeline-h" className="text-lg font-semibold">Order history</h2>
            <ol className="mt-4 space-y-4 border-l-2 border-slate-100 pl-5">
              {[...order.events].reverse().map((e, i) => (
                <li key={i} className="relative">
                  <span className={clsx("absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white", i === 0 ? "bg-brand-600" : "bg-slate-300")} aria-hidden />
                  <p className="text-sm font-medium">{e.message}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDateTime(e.createdAt)}
                    {e.actor ? ` · ${e.actor}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card space-y-4 p-5 text-sm">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                {order.fulfilment === "PICKUP" ? <Store className="h-4 w-4" aria-hidden /> : <Truck className="h-4 w-4" aria-hidden />}
                {order.fulfilment === "PICKUP" ? "Store pickup" : "Delivery"}
              </h2>
              {order.fulfilment === "DELIVERY" && order.address ? (
                <p className="mt-1.5 text-ink-soft">
                  {order.customer.firstName} {order.customer.lastName}
                  <br />
                  {order.address.line1}
                  {order.address.line2 ? `, ${order.address.line2}` : ""}
                  <br />
                  {order.address.city}, {order.address.state}
                  {order.address.landmark && <span className="block text-ink-muted">Landmark: {order.address.landmark}</span>}
                  {order.zone && <span className="mt-1 block text-ink-muted">{order.zone.etaLabel}</span>}
                </p>
              ) : (
                <p className="mt-1.5 flex gap-2 text-ink-soft">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {site.address.line1}, {site.address.line2}, {site.address.city}
                </p>
              )}
            </div>
            <div>
              <h2 className="font-semibold">Contact</h2>
              <p className="mt-1.5 text-ink-soft">{order.customer.email}<br />{formatPhone(order.customer.phone)}</p>
            </div>
            <div>
              <h2 className="font-semibold">Payment</h2>
              <p className="mt-1.5 text-ink-soft">{paymentMethodLabel[order.paymentMethod]}</p>
              {order.paidAt && <p className="text-ink-muted">Paid {formatDateTime(order.paidAt)}</p>}
            </div>
            {order.prescription && (
              <div>
                <h2 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" aria-hidden /> Prescription</h2>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="truncate text-ink-soft">{order.prescription.originalName}</span>
                  <ReviewPill status={order.prescription.status as "PENDING" | "APPROVED" | "REJECTED"} />
                </div>
                {order.prescription.reviewerNote && <p className="mt-1 text-ink-muted">“{order.prescription.reviewerNote}”</p>}
              </div>
            )}
            {order.notes && (
              <div>
                <h2 className="font-semibold">Your notes</h2>
                <p className="mt-1.5 text-ink-soft">{order.notes}</p>
              </div>
            )}
          </section>

          <div className="space-y-3">
            {order.canCancel && <CancelOrder number={order.number} accessKey={accessKey} paid={order.paymentStatus === "PAID"} />}
            {["DELIVERED", "COMPLETED", "CANCELLED"].includes(order.status) && <BuyAgain order={order} />}
            <a href={site.whatsapp} target="_blank" rel="noreferrer" className="btn-ghost w-full">
              <MessageCircle className="h-4 w-4" aria-hidden /> Questions? Chat with us
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

function NextStep({ order, accessKey }: { order: Order; accessKey?: string }) {
  if (order.status === "AWAITING_RX_REVIEW") {
    return (
      <Panel icon={<Clock className="h-5 w-5" />} tone="amber" title="Your prescription is being reviewed">
        A registered pharmacist is checking your prescription, usually within 2 working hours during opening times ({site.hours[0].time}).
        We'll email you as soon as it's approved, and then you can pay. Nothing has been charged yet.
      </Panel>
    );
  }
  if (order.status === "AWAITING_PAYMENT" && order.paymentStatus === "PROOF_SUBMITTED") {
    return (
      <Panel icon={<Clock className="h-5 w-5" />} tone="amber" title="We're confirming your transfer">
        Thanks for sending your receipt. We usually confirm transfers within 1 working hour and will email you when your order moves to packing.
      </Panel>
    );
  }
  if (order.status === "AWAITING_PAYMENT" && order.paymentMethod === "BANK_TRANSFER" && order.bankDetails) {
    const b = order.bankDetails;
    return (
      <section className="card overflow-hidden" aria-labelledby="pay-h">
        <div className="border-b border-slate-100 bg-orange-50/60 p-5 sm:p-6">
          <h2 id="pay-h" className="flex items-center gap-2 text-lg font-semibold">
            <Building2 className="h-5 w-5 text-orange-700" aria-hidden /> Complete your bank transfer
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Transfer the exact amount below and use your order number as the narration/reference.
            {order.payBy && <> Please pay by <strong>{formatDateTime(order.payBy)}</strong>, or the order will be released.</>}
          </p>
        </div>
        <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-2">
          <dl className="space-y-3 text-sm">
            {[
              ["Amount", formatNaira(order.totalKobo), String(order.totalKobo / 100)],
              ["Bank", b.name, null],
              ["Account name", b.accountName, null],
              ["Account number", b.accountNumber, b.accountNumber],
              ["Reference", order.number, order.number],
            ].map(([label, value, copy]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="font-semibold tracking-wide">{value}</dd>
                </div>
                {copy && <CopyButton value={copy} label={label!.toLowerCase()} />}
              </div>
            ))}
          </dl>
          <div className="space-y-4">
            <UploadProof number={order.number} accessKey={accessKey} />
            {order.canPayOnline && (
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-2 text-sm text-ink-muted">Prefer instant confirmation?</p>
                <PayOnlineButton number={order.number} accessKey={accessKey} label="Pay by card or USSD instead" />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }
  if (order.status === "AWAITING_PAYMENT") {
    return (
      <Panel icon={<Clock className="h-5 w-5" />} tone="amber" title={order.requiresRx ? "Prescription approved. Ready for payment" : "Payment needed"}>
        <p>Complete payment so we can start preparing your order.</p>
        <div className="mt-4">
          {order.canPayOnline ? <PayOnlineButton number={order.number} accessKey={accessKey} /> : <p className="text-sm">Card payment is unavailable right now. Please contact us to pay by transfer.</p>}
        </div>
      </Panel>
    );
  }
  if (order.status === "PROCESSING") {
    return (
      <Panel icon={<PackageCheck className="h-5 w-5" />} tone="sky" title="We're preparing your order">
        Our pharmacists are picking and checking your items.{" "}
        {order.fulfilment === "PICKUP"
          ? "We'll message you when it's ready to collect."
          : `It'll be on its way soon${order.zone ? `. Expected delivery: ${order.zone.etaLabel.toLowerCase()}` : ""}.`}
      </Panel>
    );
  }
  if (order.status === "READY_FOR_PICKUP") {
    return (
      <Panel icon={<Store className="h-5 w-5" />} tone="indigo" title="Ready to collect">
        Your order is waiting at {site.address.line1}, {site.address.line2}. Bring your order number <strong>{order.number}</strong>
        {order.paymentMethod === "PAY_ON_PICKUP" ? ` and ${formatNaira(order.totalKobo)} (card, transfer or cash).` : "."}
      </Panel>
    );
  }
  if (order.status === "DISPATCHED" && order.delivery?.live) {
    return <LiveTracking number={order.number} accessKey={accessKey} code={order.delivery.code} />;
  }
  if (order.status === "DISPATCHED") {
    return (
      <Panel icon={<Truck className="h-5 w-5" />} tone="indigo" title="Your order is on its way">
        Our rider will call {formatPhone(order.customer.phone)} on arrival. Please check the seals are intact when you receive it.
      </Panel>
    );
  }
  if (order.status === "DELIVERED" || order.status === "COMPLETED") {
    return (
      <Panel icon={<CheckCircle2 className="h-5 w-5" />} tone="care" title="All done. Thank you!">
        If anything is wrong with your order, let us know within 48 hours of {order.status === "DELIVERED" ? "delivery" : "collection"}. See our <Link href="/returns" className="font-semibold underline">returns policy</Link>.
      </Panel>
    );
  }
  if (order.status === "CANCELLED") {
    return (
      <Panel icon={<XCircle className="h-5 w-5" />} tone="slate" title="Need it after all?">
        You can reorder the same items in one click with “Buy again”. Cancelled on {order.cancelledAt ? formatDate(order.cancelledAt) : "—"}.
      </Panel>
    );
  }
  return null;
}

const PANEL_TONES = {
  amber: "bg-amber-50 text-amber-800",
  sky: "bg-sky-50 text-sky-800",
  indigo: "bg-indigo-50 text-indigo-800",
  care: "bg-care-50 text-care-700",
  slate: "bg-slate-100 text-slate-700",
};

function Panel({ icon, title, tone, children }: { icon: React.ReactNode; title: string; tone: keyof typeof PANEL_TONES; children: React.ReactNode }) {
  return (
    <section className="card flex gap-4 p-5 sm:p-6">
      <span className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", PANEL_TONES[tone])}>{icon}</span>
      <div className="text-sm leading-relaxed text-ink-soft">
        <h2 className="mb-1 text-lg font-semibold text-ink">{title}</h2>
        {children}
      </div>
    </section>
  );
}
