import Link from "next/link";
import {
  Clock,
  FileText,
  Lock,
  MessageCircle,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Stethoscope,
  Truck,
  Upload,
} from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { Category, ProductList, StoreInfo } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { site } from "@/lib/site";
import { ProductGrid } from "@/components/product-card";
import { CategoryIcon, toneFor } from "@/components/category-icon";
import { SectionHeading } from "@/components/ui";
import { HeroSlider } from "@/components/home/hero-slider";

export default async function HomePage() {
  const [cats, featured, malaria, info] = await Promise.all([
    apiGet<{ categories: Category[] }>("/categories"),
    apiGet<ProductList>("/products?featured=true&pageSize=8"),
    apiGet<ProductList>("/products?category=malaria&pageSize=4&inStock=true"),
    apiGet<StoreInfo>("/store-info"),
  ]);
  const categories = cats?.categories ?? [];

  return (
    <>
      <HeroSlider />

      {/* Promises */}
      <section className="border-y border-slate-200/80 bg-white">
        <div className="container grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, t: "Genuine & NAFDAC-registered", d: "Stock bought only from licensed manufacturers and distributors." },
            { icon: Stethoscope, t: "Pharmacist-reviewed", d: "Every prescription checked by a registered pharmacist." },
            { icon: Truck, t: "Nationwide delivery", d: `Free over ${formatNaira(info?.freeDeliveryThresholdKobo ?? 5_000_000)}. Same day in Kano.` },
            { icon: Lock, t: "Secure payments", d: "Card, USSD and bank transfer via Paystack, or pay at pickup." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">{t}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container py-16">
        <SectionHeading
          eyebrow="Browse"
          title="Shop by health need"
          action={
            <Link href="/shop" className="hidden text-sm font-semibold text-brand-700 hover:underline sm:block">
              View all products
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {categories.map((c) => {
            const tone = toneFor(c.icon);
            return (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift"
              >
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone.bg} ${tone.fg}`}>
                  <CategoryIcon icon={c.icon} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold leading-tight">{c.name}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{c.productCount} products</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      {featured && featured.products.length > 0 && (
        <section className="container pb-16">
          <SectionHeading
            eyebrow="Popular right now"
            title="Customer favourites"
            action={
              <Link href="/shop?sort=popular" className="text-sm font-semibold text-brand-700 hover:underline">
                See more
              </Link>
            }
          />
          <ProductGrid products={featured.products} />
        </section>
      )}

      {/* How prescriptions work */}
      <section className="bg-ink py-16 text-white">
        <div className="container grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">Prescriptions made simple</p>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">From your doctor's note to your door, without the queue.</h2>
            <p className="mt-4 max-w-md text-slate-300">
              Snap a photo of your prescription. A registered pharmacist checks it, confirms your dose and lets you know before you pay.
              Approved prescriptions stay in your account for repeat orders.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/account/prescriptions" className="btn-primary btn-lg">
                <Upload className="h-5 w-5" aria-hidden /> Upload prescription
              </Link>
              <Link href="/prescriptions" className="btn btn-lg bg-white/10 text-white hover:bg-white/20">
                How it works
              </Link>
            </div>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: FileText, t: "Upload", d: "Add your prescription at checkout or in your account. Photo or PDF." },
              { icon: Stethoscope, t: "Pharmacist review", d: "We verify it, usually within 2 working hours, and call if anything's unclear." },
              { icon: PackageCheck, t: "Pay & receive", d: "Pay only after approval. We pack, seal and deliver, or you collect in store." },
            ].map(({ icon: Icon, t, d }, i) => (
              <li key={t} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="font-display text-3xl font-extrabold text-white/15">0{i + 1}</span>
                </div>
                <p className="mt-4 font-semibold">{t}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Malaria */}
      {malaria && malaria.products.length > 0 && (
        <section className="container py-16">
          <SectionHeading
            eyebrow="Rainy-season essentials"
            title="Malaria treatment you can trust"
            action={
              <Link href="/category/malaria" className="text-sm font-semibold text-brand-700 hover:underline">
                All malaria products
              </Link>
            }
          />
          <ProductGrid products={malaria.products} />
        </section>
      )}

      {/* Long-term care + delivery */}
      <section className="container grid gap-5 pb-4 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white sm:p-10">
          <RefreshCcw className="absolute -right-6 -top-6 h-40 w-40 text-white/10" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-100">Long-term conditions</p>
          <h2 className="mt-2 max-w-sm text-2xl font-bold text-white sm:text-3xl">Blood pressure or diabetes? Reorder in two taps.</h2>
          <p className="mt-3 max-w-md text-brand-50/90">
            Your approved prescriptions are saved securely, so repeat orders go straight to packing. Use “Buy again” from your order history.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/category/blood-pressure-heart" className="btn bg-white text-brand-700 hover:bg-brand-50">Blood pressure</Link>
            <Link href="/category/diabetes" className="btn bg-white/15 text-white hover:bg-white/25">Diabetes care</Link>
          </div>
        </div>
        <div className="card p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Delivery & pickup</p>
          <h2 className="mt-2 text-2xl font-bold">Clear prices, no surprises</h2>
          <ul className="mt-5 divide-y divide-slate-100">
            {info?.zones.map((z) => (
              <li key={z.code} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span>
                  <span className="font-semibold text-ink">{z.name}</span>
                  <span className="block text-xs text-ink-muted">{z.etaLabel}</span>
                </span>
                <span className="font-semibold">{formatNaira(z.feeKobo)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-4 py-3 text-sm">
              <span>
                <span className="font-semibold text-ink">Pickup in store, Kano</span>
                <span className="block text-xs text-ink-muted">Ready in about 1 hour</span>
              </span>
              <span className="font-semibold text-care-700">Free</span>
            </li>
          </ul>
          <p className="mt-4 flex items-center gap-2 text-sm text-care-700">
            <Truck className="h-4 w-4" aria-hidden /> Free delivery anywhere on orders over {formatNaira(info?.freeDeliveryThresholdKobo ?? 5_000_000)}
          </p>
        </div>
      </section>

      {/* Talk to pharmacist */}
      <section className="container pt-12">
        <div className="card flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-care-50 text-care-600">
              <MessageCircle className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-bold">Not sure what you need?</h2>
              <p className="mt-1 max-w-xl text-ink-muted">
                Our pharmacists answer questions about doses, side effects and alternatives on WhatsApp, free of charge.
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                <Clock className="h-3.5 w-3.5" aria-hidden /> {site.hours[0].days}, {site.hours[0].time}
              </p>
            </div>
          </div>
          <a href={site.whatsapp} target="_blank" rel="noreferrer" className="btn-care btn-lg shrink-0">
            Chat with a pharmacist
          </a>
        </div>
      </section>
    </>
  );
}
