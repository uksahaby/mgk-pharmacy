import type { Batch, Category, Prisma, Product } from "@prisma/client";
import { prisma } from "./prisma";

/** Batches that can be sold today: active and not expired. */
export const sellableBatchWhere = (): Prisma.BatchWhereInput => ({
  status: "ACTIVE",
  quantity: { gt: 0 },
  expiresAt: { gt: new Date() },
});

type ProductWithRelations = Product & { category?: Category; batches?: Batch[] };

export function stockOf(p: ProductWithRelations) {
  const now = Date.now();
  return (p.batches ?? [])
    .filter((b) => b.status === "ACTIVE" && b.expiresAt.getTime() > now)
    .reduce((sum, b) => sum + b.quantity, 0);
}

export const LOW_STOCK_THRESHOLD = 10;

/**
 * True once the pharmacy has ever received stock of (or sold) the product. Products that were imported or created
 * but never stocked aren't "running low"; they're a separate list for buying decisions.
 * Pass the product with *all* its batches, not just active ones.
 */
export const hasEverStocked = (p: ProductWithRelations) => (p.batches?.length ?? 0) > 0 || p.soldCount > 0;

/** Stocked products that are now at or below the reorder threshold (including those that have run out). */
export const isLowStock = (p: ProductWithRelations) => hasEverStocked(p) && stockOf(p) <= LOW_STOCK_THRESHOLD;

export function serializeProduct(p: ProductWithRelations, opts: { detail?: boolean } = {}) {
  const stock = stockOf(p);
  const base = {
    id: p.id,
    slug: p.slug,
    name: p.name,
    genericName: p.genericName,
    brand: p.brand,
    strength: p.strength,
    dosageForm: p.dosageForm,
    packSize: p.packSize,
    priceKobo: p.priceKobo,
    compareAtKobo: p.compareAtKobo,
    rxStatus: p.rxStatus,
    coldChain: p.coldChain,
    featured: p.featured,
    category: p.category ? { slug: p.category.slug, name: p.category.name, icon: p.category.icon } : undefined,
    inStock: stock > 0,
    lowStock: stock > 0 && stock <= 10,
  };
  if (!opts.detail) return base;

  const sellable = (p.batches ?? [])
    .filter((b) => b.status === "ACTIVE" && b.quantity > 0 && b.expiresAt.getTime() > Date.now())
    .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  return {
    ...base,
    manufacturer: p.manufacturer,
    description: p.description,
    usage: p.usage,
    warnings: p.warnings,
    storage: p.storage,
    stockAvailable: Math.min(stock, 50), // never reveal exact stock beyond what a customer could buy
    nextExpiry: sellable[0]?.expiresAt ?? null,
  };
}

export const productInclude = {
  category: true,
  batches: { where: { status: "ACTIVE" } },
} satisfies Prisma.ProductInclude;

export async function loadProductsByIds(ids: string[]) {
  return prisma.product.findMany({ where: { id: { in: ids }, active: true }, include: productInclude });
}
