"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { RxStatus } from "@/lib/types";
import { formatNaira } from "@/lib/format";

export type CartSnapshot = {
  slug: string;
  name: string;
  packSize: string;
  priceKobo: number;
  rxStatus: RxStatus;
  icon: string;
  strength?: string | null;
};
export type CartItem = { productId: string; quantity: number; snapshot: CartSnapshot };

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  count: number;
  add: (productId: string, snapshot: CartSnapshot, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "mgk.cart.v1";
const MAX_QTY = 50;

function load(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(parsed) ? parsed.filter((i) => i.productId && i.quantity > 0 && i.snapshot) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<CartItem | null>(null);

  useEffect(() => {
    setItems(load());
    setReady(true);
    // Keep multiple tabs in sync.
    const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && setItems(load());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage unavailable (private mode): cart still works for this tab
    }
  }, [items, ready]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const add = useCallback((productId: string, snapshot: CartSnapshot, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      const next = existing
        ? prev.map((i) => (i.productId === productId ? { ...i, snapshot, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i))
        : [...prev, { productId, snapshot, quantity: Math.min(MAX_QTY, quantity) }];
      return next;
    });
    setToast({ productId, snapshot, quantity });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i)),
    );
  }, []);

  const remove = useCallback((productId: string) => setItems((prev) => prev.filter((i) => i.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, ready, count: items.reduce((s, i) => s + i.quantity, 0), add, setQuantity, remove, clear }),
    [items, ready, add, setQuantity, remove, clear],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:justify-end sm:px-6">
        {toast && (
          <div className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl bg-ink p-4 text-white shadow-lift">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-care-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Added to your cart</p>
              <p className="truncate text-sm text-slate-300">
                {toast.quantity} × {toast.snapshot.name} · {formatNaira(toast.snapshot.priceKobo * toast.quantity)}
              </p>
              <Link href="/cart" className="mt-2 inline-block text-sm font-semibold text-white underline underline-offset-4">
                View cart & checkout
              </Link>
            </div>
            <button onClick={() => setToast(null)} className="rounded-full p-1 text-slate-400 hover:text-white" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
