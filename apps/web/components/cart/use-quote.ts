"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import type { Quote } from "@/lib/types";
import { useCart } from "./cart-provider";

/** Live server-side price/stock quote for the current cart. Debounced to avoid a request per click. */
export function useQuote(fulfilment: "DELIVERY" | "PICKUP", state: string | null) {
  const { items, ready } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(items.map((i) => [i.productId, i.quantity]));

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const q = await api<Quote>("/cart/quote", {
          json: { items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })), fulfilment, state },
        });
        if (!cancelled) setQuote(q);
      } catch {
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, fulfilment, state]);

  return { quote, loading };
}
