import type { ShippingZone } from "@prisma/client";
import { prisma } from "./prisma";
import { loadProductsByIds, stockOf } from "./catalog";
import { FREE_DELIVERY_THRESHOLD_KOBO } from "./constants";
import type { SessionUser } from "./auth";

export type CartLineInput = { productId: string; quantity: number };

export type QuoteLine = {
  productId: string;
  slug: string;
  name: string;
  packSize: string;
  rxStatus: string;
  coldChain: boolean;
  categoryIcon: string;
  priceKobo: number;
  quantity: number;
  available: number;
  lineTotalKobo: number;
  issue?: string;
};

export async function zoneForState(state?: string | null): Promise<ShippingZone | null> {
  const zones = await prisma.shippingZone.findMany({ orderBy: { sortOrder: "asc" } });
  if (!state) return null;
  return (
    zones.find((z) => z.states.split(",").map((s) => s.trim().toLowerCase()).includes(state.toLowerCase())) ??
    zones.find((z) => z.states === "*") ??
    null
  );
}

export async function buildQuote(
  input: CartLineInput[],
  opts: { fulfilment: "DELIVERY" | "PICKUP"; state?: string | null; user?: SessionUser },
) {
  const merged = new Map<string, number>();
  for (const l of input) merged.set(l.productId, (merged.get(l.productId) ?? 0) + l.quantity);

  const products = await loadProductsByIds([...merged.keys()]);
  const lines: QuoteLine[] = [];

  for (const [productId, requested] of merged) {
    const p = products.find((x) => x.id === productId);
    if (!p) continue; // removed or inactive product: silently dropped, client re-syncs
    const available = stockOf(p);
    const quantity = Math.max(1, Math.min(requested, 50));
    let issue: string | undefined;
    if (available <= 0) issue = "Out of stock";
    else if (quantity > available) issue = `Only ${available} left`;
    lines.push({
      productId,
      slug: p.slug,
      name: p.name,
      packSize: p.packSize,
      rxStatus: p.rxStatus,
      coldChain: p.coldChain,
      categoryIcon: p.category.icon,
      priceKobo: p.priceKobo,
      quantity,
      available,
      lineTotalKobo: p.priceKobo * quantity,
      issue,
    });
  }

  const subtotalKobo = lines.reduce((s, l) => s + l.lineTotalKobo, 0);
  const zone = opts.fulfilment === "DELIVERY" ? await zoneForState(opts.state) : null;
  const freeDelivery = subtotalKobo >= FREE_DELIVERY_THRESHOLD_KOBO;
  const shippingKobo = opts.fulfilment === "PICKUP" || !zone || !lines.length || freeDelivery ? 0 : zone.feeKobo;

  const requiresRx = lines.some((l) => l.rxStatus !== "OTC");
  const requiresVerification = lines.some((l) => l.rxStatus === "CONTROLLED");
  const hasColdChain = lines.some((l) => l.coldChain);

  return {
    lines,
    subtotalKobo,
    shippingKobo,
    totalKobo: subtotalKobo + shippingKobo,
    zone: zone ? { id: zone.id, name: zone.name, etaLabel: zone.etaLabel, feeKobo: zone.feeKobo } : null,
    freeDelivery,
    freeDeliveryThresholdKobo: FREE_DELIVERY_THRESHOLD_KOBO,
    amountToFreeDeliveryKobo: Math.max(0, FREE_DELIVERY_THRESHOLD_KOBO - subtotalKobo),
    requiresRx,
    requiresVerification,
    hasColdChain,
    canCheckout:
      lines.length > 0 &&
      lines.every((l) => !l.issue) &&
      (!requiresRx || !!opts.user) &&
      (!requiresVerification || opts.user?.verificationStatus === "APPROVED"),
  };
}
