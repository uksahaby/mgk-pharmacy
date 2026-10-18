"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import clsx from "clsx";
import { useCart, type CartSnapshot } from "./cart-provider";

export function QuantityStepper({
  value,
  onChange,
  max = 50,
  size = "md",
  label = "Quantity",
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  size?: "sm" | "md";
  label?: string;
}) {
  const btn = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  return (
    <div className="inline-flex items-center rounded-full border border-slate-300 bg-white" role="group" aria-label={label}>
      <button type="button" className={clsx(btn, "grid place-items-center rounded-full text-ink-soft hover:bg-slate-100 disabled:opacity-40")} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">
        <Minus className="h-4 w-4" />
      </button>
      <span className={clsx("min-w-8 text-center font-semibold tabular-nums", size === "sm" ? "text-sm" : "text-base")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={clsx(btn, "grid place-items-center rounded-full text-ink-soft hover:bg-slate-100 disabled:opacity-40")} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AddToCartButton({
  productId,
  snapshot,
  disabled,
  compact,
}: {
  productId: string;
  snapshot: CartSnapshot;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { add } = useCart();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => add(productId, snapshot, 1)}
      className={clsx(compact ? "btn-dark btn-sm w-full" : "btn-primary w-full")}
      aria-label={disabled ? `${snapshot.name} is out of stock` : `Add ${snapshot.name} to cart`}
    >
      <ShoppingBag className="h-4 w-4" aria-hidden />
      {disabled ? "Out of stock" : "Add to cart"}
    </button>
  );
}

export function ProductPurchase({
  productId,
  snapshot,
  max,
  inStock,
}: {
  productId: string;
  snapshot: CartSnapshot;
  max: number;
  inStock: boolean;
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  if (!inStock) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-ink-soft">
        <p className="font-semibold text-ink">Currently out of stock</p>
        <p className="mt-1">Ask a pharmacist on WhatsApp about availability or a suitable alternative.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <QuantityStepper value={qty} onChange={(n) => setQty(Math.max(1, Math.min(n, max)))} max={max} />
      <button type="button" className="btn-primary btn-lg flex-1" onClick={() => add(productId, snapshot, qty)}>
        <ShoppingBag className="h-5 w-5" aria-hidden /> Add to cart
      </button>
    </div>
  );
}
