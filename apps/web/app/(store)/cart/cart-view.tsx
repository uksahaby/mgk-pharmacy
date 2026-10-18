"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FileText, Lock, ShieldAlert, ShoppingBag, Snowflake, Trash2, Truck } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { QuantityStepper } from "@/components/cart/add-to-cart";
import { useQuote } from "@/components/cart/use-quote";
import { ProductArt } from "@/components/product-art";
import { RxBadge } from "@/components/badges";
import { Alert, EmptyState } from "@/components/ui";
import { formatNaira } from "@/lib/format";
import type { StoreInfo, User } from "@/lib/types";

export function CartView({ user, info }: { user: User | null; info: StoreInfo }) {
  const { items, ready, setQuantity, remove } = useCart();
  const [state, setState] = useState("Kano");
  const { quote, loading } = useQuote("DELIVERY", state);

  // Drop items the server no longer sells (deleted/inactive products).
  useEffect(() => {
    if (!quote) return;
    const known = new Set(quote.lines.map((l) => l.productId));
    items.filter((i) => !known.has(i.productId)).forEach((i) => remove(i.productId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote]);

  if (ready && items.length === 0) {
    return (
      <div className="container max-w-3xl py-16">
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title="Your cart is empty"
          action={
            <Link href="/shop" className="btn-primary">
              Start shopping
            </Link>
          }
        >
          Browse medicines and health products, or upload a prescription and our pharmacist will help you.
        </EmptyState>
      </div>
    );
  }

  const lineFor = (id: string) => quote?.lines.find((l) => l.productId === id);
  const progress = quote ? Math.min(100, (quote.subtotalKobo / quote.freeDeliveryThresholdKobo) * 100) : 0;

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold">Your cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {quote && (
            <div className="card p-4">
              {quote.freeDelivery ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-care-700">
                  <Truck className="h-4 w-4" aria-hidden /> You've unlocked free delivery
                </p>
              ) : (
                <p className="flex items-center gap-2 text-sm text-ink-soft">
                  <Truck className="h-4 w-4 text-brand-600" aria-hidden />
                  Add <strong className="text-ink">{formatNaira(quote.amountToFreeDeliveryKobo)}</strong> more for free delivery
                </p>
              )}
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery">
                <div className="h-full rounded-full bg-care-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {quote?.requiresRx && (
            <Alert tone="warning" title="Your cart contains prescription-only medicines">
              You'll upload a prescription at checkout{!user && " (sign in required)"}. A pharmacist reviews it before you pay.
              {quote.requiresVerification && (
                <span className="mt-1 flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="h-4 w-4" aria-hidden /> Controlled medicines also need a{" "}
                  <Link href="/account/verification" className="underline">verified account</Link>.
                </span>
              )}
            </Alert>
          )}

          <ul className="card divide-y divide-slate-100" aria-label="Cart items">
            {items.map((item) => {
              const line = lineFor(item.productId);
              const price = line?.priceKobo ?? item.snapshot.priceKobo;
              return (
                <li key={item.productId} className="flex gap-4 p-4 sm:p-5">
                  <Link href={`/product/${item.snapshot.slug}`} className="w-20 shrink-0 overflow-hidden rounded-xl sm:w-24">
                    <ProductArt name={item.snapshot.name} icon={item.snapshot.icon} size="sm" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/product/${item.snapshot.slug}`} className="font-semibold hover:underline">
                          {item.snapshot.name} {item.snapshot.strength}
                        </Link>
                        <p className="text-sm text-ink-muted">{item.snapshot.packSize}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <RxBadge status={item.snapshot.rxStatus} />
                          {line?.coldChain && (
                            <span className="chip bg-sky-100 text-sky-800">
                              <Snowflake className="h-3 w-3" aria-hidden /> Keep cold
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="shrink-0 font-semibold">{formatNaira(price * item.quantity)}</p>
                    </div>
                    {line?.issue && <p className="mt-2 text-sm font-medium text-brand-700">{line.issue}. Please adjust the quantity.</p>}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        max={line ? Math.max(1, Math.min(50, line.available)) : 50}
                        onChange={(n) => setQuantity(item.productId, Math.max(1, n))}
                        label={`Quantity of ${item.snapshot.name}`}
                      />
                      <button onClick={() => remove(item.productId)} className="btn-ghost btn-sm text-ink-muted" aria-label={`Remove ${item.snapshot.name}`}>
                        <Trash2 className="h-4 w-4" aria-hidden /> Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="card p-5">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm" aria-busy={loading}>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="font-medium">{quote ? formatNaira(quote.subtotalKobo) : "…"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">
                  Delivery to{" "}
                  <select value={state} onChange={(e) => setState(e.target.value)} className="rounded-md border border-slate-200 bg-white py-0.5 pl-1.5 pr-6 text-sm font-medium text-ink" aria-label="Delivery state for estimate">
                    {info.states.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </dt>
                <dd className="font-medium">{quote ? (quote.shippingKobo === 0 ? "Free" : formatNaira(quote.shippingKobo)) : "…"}</dd>
              </div>
              {quote?.zone && <p className="text-xs text-ink-muted">{quote.zone.etaLabel}. Free pickup available in Kano.</p>}
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
                <dt className="font-semibold">Estimated total</dt>
                <dd className="font-bold">{quote ? formatNaira(quote.totalKobo) : "…"}</dd>
              </div>
            </dl>
            <Link
              href={quote?.requiresRx && !user ? "/login?next=/checkout" : "/checkout"}
              className={`btn-primary btn-lg mt-5 w-full ${!quote || quote.lines.some((l) => l.issue) ? "pointer-events-none opacity-50" : ""}`}
              aria-disabled={!quote || quote.lines.some((l) => l.issue)}
            >
              {quote?.requiresRx && !user ? "Sign in to checkout" : "Continue to checkout"} <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            {!user && !quote?.requiresRx && (
              <p className="mt-3 text-center text-xs text-ink-muted">
                No account needed. <Link href="/login?next=/checkout" className="font-semibold text-ink underline">Sign in</Link> to use saved addresses.
              </p>
            )}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
              <Lock className="h-3.5 w-3.5" aria-hidden /> Secure checkout · Card, transfer or pay at pickup
            </p>
          </div>
          {quote?.requiresRx && (
            <p className="mt-3 flex items-start gap-2 px-1 text-xs text-ink-muted">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Prescription orders are paid after pharmacist approval, so you never pay for something we can't dispense.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
