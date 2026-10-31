"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Search } from "lucide-react";
import { api } from "@/lib/client-api";
import { useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";
import { RxBadge } from "@/components/badges";
import { formatNaira } from "@/lib/format";
import type { HospitalPrescription, PickableProduct } from "@/lib/types";
import { prescribedQuantity } from "../patient";

type Item = HospitalPrescription["items"][number];
type Choice = { action: "supply" | "decline" | "later"; product: PickableProduct | null; quantity: number; reason: string };

const REASONS = ["Out of stock", "Patient declined", "Patient will buy elsewhere", "Not available in this strength or form"];

/** Pre-selects a product only when it is in stock and its strength matches; otherwise the pharmacist chooses. */
function initialChoice(suggested: PickableProduct[]): Choice {
  const exact = suggested.find((p) => p.stock > 0 && p.strengthMatch);
  const inStock = suggested.some((p) => p.stock > 0);
  return { action: inStock ? "supply" : "later", product: exact ?? null, quantity: 1, reason: "" };
}

export function SupplyForm({ prescriptionId, items, suggestions }: { prescriptionId: string; items: Item[]; suggestions: Record<string, PickableProduct[]> }) {
  const router = useRouter();
  const { pending, error, run } = useSubmit();
  const [choices, setChoices] = useState<Record<string, Choice>>(() =>
    Object.fromEntries(items.map((i) => [i.id, initialChoice(suggestions[i.id] ?? [])])),
  );
  const set = (id: string, patch: Partial<Choice>) => setChoices((c) => ({ ...c, [id]: { ...c[id], ...patch } }));

  const supplying = items.filter((i) => choices[i.id].action === "supply");
  const declining = items.filter((i) => choices[i.id].action === "decline");
  const total = supplying.reduce((sum, i) => sum + (choices[i.id].product?.priceKobo ?? 0) * choices[i.id].quantity, 0);
  const incomplete =
    supplying.some((i) => !choices[i.id].product || choices[i.id].quantity < 1) || declining.some((i) => choices[i.id].reason.trim().length < 2);

  const submit = async () => {
    const result = await run(() =>
      api<{ orderNumber: string | null }>(`/admin/hospital-prescriptions/${prescriptionId}/supply`, {
        json: {
          supply: supplying.map((i) => ({ itemId: i.id, productId: choices[i.id].product!.id, quantity: choices[i.id].quantity })),
          notSupplied: declining.map((i) => ({ itemId: i.id, reason: choices[i.id].reason.trim() })),
        },
      }),
    );
    if (!result) return;
    if (result.orderNumber) router.push(`/admin/orders/${result.orderNumber}`);
    else router.refresh();
  };

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold">To supply</h2>
        <p className="text-sm text-ink-muted">Choose the product for each medicine. Leave a medicine for later if the patient isn&apos;t ready.</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((i) => (
          <ItemRow key={i.id} item={i} suggested={suggestions[i.id] ?? []} choice={choices[i.id]} onChange={(patch) => set(i.id, patch)} />
        ))}
      </ul>
      <div className="space-y-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {incomplete ? (
              "Choose a product, or give a reason, for each medicine above"
            ) : supplying.length ? (
              <>
                {supplying.length} to supply · <strong className="text-ink">{formatNaira(total)}</strong> to pay at collection
              </>
            ) : (
              "Nothing to supply"
            )}
            {declining.length ? ` · ${declining.length} not supplied` : ""}
          </p>
          <button className="btn-primary" disabled={pending || incomplete || supplying.length + declining.length === 0} onClick={submit}>
            {supplying.length ? "Create pickup order" : "Save"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ItemRow({ item, suggested, choice, onChange }: { item: Item; suggested: PickableProduct[]; choice: Choice; onChange: (patch: Partial<Choice>) => void }) {
  const qty = prescribedQuantity(item);
  // A product found by search stays listed after it is picked.
  const options = choice.product && !suggested.some((p) => p.id === choice.product!.id) ? [choice.product, ...suggested] : suggested;
  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{item.medicine}</p>
          <p className="text-sm text-ink-muted">{[item.dosage, qty && `prescribed ${qty}`].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-0.5 text-sm" role="radiogroup" aria-label={`What to do with ${item.medicine}`}>
          {(["supply", "decline", "later"] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={choice.action === a}
              onClick={() => onChange({ action: a })}
              className={clsx("rounded-lg px-3 py-1.5 font-medium", choice.action === a ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink")}
            >
              {{ supply: "Supply", decline: "Not supplying", later: "Later" }[a]}
            </button>
          ))}
        </div>
      </div>

      {choice.action === "supply" && (
        <div className="space-y-2">
          {options.length > 0 ? (
            <div className="space-y-1.5" role="radiogroup" aria-label="Product">
              {options.map((p) => (
                <label
                  key={p.id}
                  className={clsx(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm",
                    choice.product?.id === p.id ? "border-brand-300 bg-brand-50/40" : "border-slate-200 hover:border-slate-300",
                    p.stock === 0 && "opacity-60",
                  )}
                >
                  <input type="radio" name={`product-${item.id}`} checked={choice.product?.id === p.id} disabled={p.stock === 0} onChange={() => onChange({ product: p })} />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{p.name}</span>
                    {p.strength && <span className="text-ink-muted"> {p.strength}</span>}
                    <span className="block text-xs text-ink-muted">{p.genericName} · {p.packSize}</span>
                  </span>
                  <RxBadge status={p.rxStatus} />
                  <span className="w-20 text-right text-xs text-ink-muted">{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</span>
                  <span className="w-20 text-right font-semibold">{formatNaira(p.priceKobo)}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No matching product found. Search the catalogue below.</p>
          )}
          {!choice.product && <p className="text-sm font-medium text-amber-800">Choose the product to supply, or switch to &ldquo;Not supplying&rdquo; or &ldquo;Later&rdquo;.</p>}
          <div className="flex flex-wrap items-end gap-3">
            <ProductSearch onPick={(p) => onChange({ product: p })} />
            <label className="text-sm">
              <span className="label">Quantity</span>
              <input
                type="number"
                min={1}
                max={50}
                className="input w-24"
                value={choice.quantity}
                onChange={(e) => onChange({ quantity: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
                aria-label={`Quantity of ${item.medicine}`}
              />
            </label>
            {choice.product && (
              <p className="pb-2.5 text-sm text-ink-muted">
                {choice.quantity} × {choice.product.packSize} = <strong className="text-ink">{formatNaira(choice.product.priceKobo * choice.quantity)}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {choice.action === "decline" && (
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto" value={REASONS.includes(choice.reason) ? choice.reason : ""} onChange={(e) => onChange({ reason: e.target.value })} aria-label="Reason">
            <option value="">Choose a reason…</option>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <input className="input min-w-[220px] flex-1" placeholder="Or write a reason" value={choice.reason} onChange={(e) => onChange({ reason: e.target.value })} />
        </div>
      )}
    </li>
  );
}

function ProductSearch({ onPick }: { onPick: (p: PickableProduct) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickableProduct[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api<{ products: PickableProduct[] }>(`/admin/hospital-prescriptions/products?q=${encodeURIComponent(q.trim())}`)
        .then((r) => setResults(r.products))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="relative min-w-[260px] flex-1">
      <span className="label">Other product</span>
      <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400" aria-hidden />
      <input className="input pl-9" placeholder="Search by name or ingredient" value={q} onChange={(e) => setQ(e.target.value)} />
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lift">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={p.stock === 0}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-50"
                onClick={() => {
                  onPick(p);
                  setQ("");
                  setResults([]);
                }}
              >
                <span>
                  {p.name} {p.strength && <span className="text-ink-muted">{p.strength}</span>}
                  <span className="block text-xs text-ink-muted">{p.packSize}</span>
                </span>
                <span className="text-right text-xs text-ink-muted">
                  {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                  <span className="block font-semibold text-ink">{formatNaira(p.priceKobo)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
