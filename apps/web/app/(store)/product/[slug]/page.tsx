import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, FileText, MessageCircle, RotateCcw, ShieldAlert, Store, Truck } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { ProductDetail, ProductSummary, StoreInfo } from "@/lib/types";
import { formatDate, formatNaira, rxLabel } from "@/lib/format";
import { site } from "@/lib/site";
import { ProductArt } from "@/components/product-art";
import { ColdChainBadge, RxBadge } from "@/components/badges";
import { ProductPurchase } from "@/components/cart/add-to-cart";
import { ProductGrid } from "@/components/product-card";
import { Breadcrumbs, SectionHeading } from "@/components/ui";

type Data = { product: ProductDetail; alternatives: ProductSummary[]; related: ProductSummary[] };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await apiGet<Data>(`/products/${(await params).slug}`);
  if (!data) return { title: "Product not found" };
  const p = data.product;
  return {
    title: `${p.name}${p.strength ? ` ${p.strength}` : ""} (${p.genericName}): ${p.packSize}`,
    description: p.description.slice(0, 155),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, info] = await Promise.all([apiGet<Data>(`/products/${slug}`), apiGet<StoreInfo>("/store-info")]);
  if (!data) notFound();
  const { product: p, alternatives, related } = data;
  const cheaper = alternatives.filter((a) => a.priceKobo < p.priceKobo && a.inStock);
  const kano = info?.zones.find((z) => z.code === "KANO");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.name}${p.strength ? ` ${p.strength}` : ""}`,
    description: p.description,
    brand: { "@type": "Brand", name: p.brand },
    category: p.category?.name,
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: (p.priceKobo / 100).toFixed(2),
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${site.url}/product/${p.slug}`,
    },
  };

  return (
    <div className="container py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...(p.category ? [{ label: p.category.name, href: `/category/${p.category.slug}` }] : []),
          { label: p.name },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="lg:sticky lg:top-40 lg:self-start">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 shadow-card">
            <ProductArt name={p.brand} strength={p.strength} form={p.packSize} icon={p.category?.icon} size="lg" />
            <div className="absolute left-4 top-4 flex gap-2">
              <RxBadge status={p.rxStatus} />
              {p.coldChain && <ColdChainBadge />}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-ink-muted">Illustration. Packaging may vary by batch.</p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{p.brand}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            {p.name} {p.strength && <span className="text-ink-soft">{p.strength}</span>}
          </h1>
          <p className="mt-2 text-ink-muted">
            {p.genericName} · {p.dosageForm} · {p.packSize}
          </p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatNaira(p.priceKobo)}</span>
            {p.compareAtKobo && p.compareAtKobo > p.priceKobo && (
              <span className="text-lg text-ink-muted line-through">{formatNaira(p.compareAtKobo)}</span>
            )}
          </div>
          <p className="mt-1 text-sm">
            {p.inStock ? (
              <span className={p.lowStock ? "font-medium text-orange-700" : "font-medium text-care-700"}>
                {p.lowStock ? "Low stock, order soon" : "In stock"}
              </span>
            ) : (
              <span className="font-medium text-brand-700">Out of stock</span>
            )}
            {p.nextExpiry && (
              <span className="ml-3 inline-flex items-center gap-1 text-ink-muted">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Expiry no earlier than {formatDate(p.nextExpiry, { month: "short", year: "numeric" })}
              </span>
            )}
          </p>

          {p.rxStatus !== "OTC" && (
            <div className={`mt-6 rounded-2xl border p-4 ${p.rxStatus === "CONTROLLED" ? "border-violet-200 bg-violet-50" : "border-amber-200 bg-amber-50"}`}>
              <p className="flex items-center gap-2 font-semibold">
                {p.rxStatus === "CONTROLLED" ? <ShieldAlert className="h-5 w-5 text-violet-700" aria-hidden /> : <FileText className="h-5 w-5 text-amber-700" aria-hidden />}
                {rxLabel[p.rxStatus]}
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
                {p.rxStatus === "CONTROLLED" && (
                  <li>
                    <Link href="/account/verification" className="font-medium text-ink underline underline-offset-2">Verify your identity</Link> once (takes about 2 minutes).
                  </li>
                )}
                <li>Add to cart and upload your prescription at checkout.</li>
                <li>A pharmacist reviews it, usually within 2 working hours.</li>
                <li>You pay only after it's approved.</li>
              </ol>
              <Link href="/prescriptions" className="mt-2 inline-block text-sm font-semibold text-ink underline underline-offset-2">How prescriptions work</Link>
            </div>
          )}

          <div className="mt-6">
            <ProductPurchase
              productId={p.id}
              inStock={p.inStock}
              max={Math.max(1, p.stockAvailable)}
              snapshot={{ slug: p.slug, name: p.name, strength: p.strength, packSize: p.packSize, priceKobo: p.priceKobo, rxStatus: p.rxStatus, icon: p.category?.icon ?? "pill" }}
            />
          </div>

          {cheaper.length > 0 && (
            <div className="mt-4 rounded-2xl border border-care-100 bg-care-50 p-4 text-sm">
              <p className="font-semibold text-care-700">Same medicine, lower price</p>
              <ul className="mt-1 space-y-1">
                {cheaper.map((a) => (
                  <li key={a.id}>
                    <Link href={`/product/${a.slug}`} className="text-ink underline-offset-2 hover:underline">
                      {a.name} {a.strength}, {a.packSize}: <strong>{formatNaira(a.priceKobo)}</strong>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mt-6 grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-sm sm:grid-cols-2">
            <li className="flex gap-3">
              <Truck className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
              <span>
                <span className="font-semibold">Delivery in Kano {kano ? formatNaira(kano.feeKobo) : ""}</span>
                <span className="block text-ink-muted">{kano?.etaLabel}. Nationwide 2–5 days.</span>
              </span>
            </li>
            <li className="flex gap-3">
              <Store className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
              <span>
                <span className="font-semibold">Free pickup</span>
                <span className="block text-ink-muted">Ready in about 1 hour at our Kano store.</span>
              </span>
            </li>
            <li className="flex gap-3">
              <BadgeCheck className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
              <span>
                <span className="font-semibold">Genuine product</span>
                <span className="block text-ink-muted">Supplied by {p.manufacturer ?? p.brand} via licensed distributors.</span>
              </span>
            </li>
            <li className="flex gap-3">
              <RotateCcw className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
              <span>
                <span className="font-semibold">48-hour returns</span>
                <span className="block text-ink-muted">For wrong, damaged or expired items. <Link href="/returns" className="underline">Details</Link></span>
              </span>
            </li>
          </ul>

          <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
            {[
              ["About this product", p.description],
              ["How to use", p.usage],
              ["Warnings & side effects", p.warnings],
              ["Storage", p.storage],
            ].map(([title, body], i) => (
              <details key={title} className="group py-4" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  {title}
                  <span className="text-xl leading-none text-ink-muted transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-7 text-ink-soft">{body}</p>
              </details>
            ))}
          </div>

          <a href={site.whatsapp} target="_blank" rel="noreferrer" className="mt-6 flex items-center gap-3 rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-200 hover:ring-slate-300">
            <MessageCircle className="h-5 w-5 text-care-600" aria-hidden />
            <span>
              <span className="font-semibold">Questions about {p.name}?</span>
              <span className="block text-ink-muted">Ask a pharmacist on WhatsApp. It's free.</span>
            </span>
          </a>
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            Information on this page is for general guidance and doesn't replace advice from your doctor or pharmacist.
          </p>
        </div>
      </div>

      {alternatives.length > 0 && (
        <section className="mt-20">
          <SectionHeading eyebrow="Same active ingredient" title={`Other brands of ${p.genericName}`} />
          <ProductGrid products={alternatives} />
        </section>
      )}
      {related.length > 0 && (
        <section className="mt-16">
          <SectionHeading eyebrow="You may also need" title={`More in ${p.category?.name ?? "this category"}`} />
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
