import Link from "next/link";
import type { ProductSummary } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { ProductArt } from "./product-art";
import { ColdChainBadge, RxBadge } from "./badges";
import { AddToCartButton } from "./cart/add-to-cart";

export function ProductCard({ product }: { product: ProductSummary }) {
  const href = `/product/${product.slug}`;
  const discount =
    product.compareAtKobo && product.compareAtKobo > product.priceKobo
      ? Math.round((1 - product.priceKobo / product.compareAtKobo) * 100)
      : 0;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <Link href={href} className="relative block" tabIndex={-1} aria-hidden>
        <ProductArt name={product.brand} strength={product.strength} icon={product.category?.icon} />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <RxBadge status={product.rxStatus} />
          {product.coldChain && <ColdChainBadge />}
          {discount > 0 && <span className="chip bg-brand-600 text-white">-{discount}%</span>}
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 grid place-items-center bg-white/60 backdrop-blur-[1px]">
            <span className="chip bg-ink px-3 py-1 text-white">Out of stock</span>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{product.category?.name}</p>
        <h3 className="mt-1 text-[15px] font-semibold leading-snug">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus:outline-none">
            {product.name}
            {product.strength ? <span className="font-normal text-ink-soft"> {product.strength}</span> : null}
          </Link>
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">
          {product.genericName} · {product.packSize}
        </p>
        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-ink">{formatNaira(product.priceKobo)}</span>
            {discount > 0 && <span className="text-sm text-ink-muted line-through">{formatNaira(product.compareAtKobo!)}</span>}
          </div>
          {product.lowStock && <p className="mt-0.5 text-xs font-medium text-orange-700">Only a few left</p>}
          <div className="relative z-10 mt-3">
            <AddToCartButton
              compact
              productId={product.id}
              disabled={!product.inStock}
              snapshot={{
                slug: product.slug,
                name: product.name,
                strength: product.strength,
                packSize: product.packSize,
                priceKobo: product.priceKobo,
                rxStatus: product.rxStatus,
                icon: product.category?.icon ?? "pill",
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
