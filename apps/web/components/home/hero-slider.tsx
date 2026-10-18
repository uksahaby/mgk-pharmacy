"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Pause,
  Play,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { site, openStatus } from "@/lib/site";

const SLIDE_MS = 7000;

type Slide = {
  label: string;
  eyebrow: string;
  title: ReactNode;
  body: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string; icon: typeof Upload };
  card: ReactNode;
};

const slides: Slide[] = [
  {
    label: "Genuine medicines",
    eyebrow: "Licensed pharmacy · Kano",
    title: (
      <>
        Genuine medicines, <span className="text-brand-300">checked by real pharmacists</span>.
      </>
    ),
    body: "Over 6,000 medicines and health products, sourced only from licensed distributors and delivered across Nigeria. Same day in Kano.",
    primary: { href: "/shop", label: "Shop medicines" },
    secondary: { href: "/about", label: "About our pharmacy", icon: ShieldCheck },
    card: (
      <GlassCard icon={<ShieldCheck className="h-5 w-5" />} tone="care" title="NAFDAC-registered stock" sub="Batch and expiry tracked on every pack">
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-white/70">
          {["Licensed", "Batch-tracked", "In date"].map((t) => (
            <span key={t} className="rounded-lg bg-white/10 px-2 py-1.5">
              <CheckCircle2 className="mx-auto mb-0.5 h-3.5 w-3.5 text-care-500" aria-hidden />
              {t}
            </span>
          ))}
        </div>
      </GlassCard>
    ),
  },
  {
    label: "Prescriptions",
    eyebrow: "Pharmacist review in about 2 hours",
    title: (
      <>
        Upload your prescription. <span className="text-brand-300">We handle the rest.</span>
      </>
    ),
    body: "Snap a photo or upload a PDF. A registered pharmacist checks it, calls you if anything needs clarifying, and approved prescriptions can be reused until they expire.",
    primary: { href: "/account/prescriptions", label: "Upload a prescription" },
    secondary: { href: "/prescriptions", label: "How it works", icon: FileText },
    card: (
      <GlassCard icon={<FileText className="h-5 w-5" />} tone="brand" title="Prescription approved" sub="Reviewed by Pharm. on duty · 38 min">
        <ol className="mt-3 space-y-1.5 text-xs text-white/80">
          {["Uploaded", "Pharmacist reviewed", "Ready to pay"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-care-500" aria-hidden /> {t}
            </li>
          ))}
        </ol>
      </GlassCard>
    ),
  },
  {
    label: "Live delivery",
    eyebrow: "Track your rider on the map",
    title: (
      <>
        Watch your order <span className="text-brand-300">arrive, live.</span>
      </>
    ),
    body: "See your rider move on the map with a live arrival time, call them in one tap, and hand over your 4-digit code only when the package is in your hands.",
    primary: { href: "/shop", label: "Start an order" },
    secondary: { href: "/delivery", label: "Delivery & pickup", icon: Bike },
    card: (
      <GlassCard icon={<Bike className="h-5 w-5" />} tone="brand" title="Out for delivery" sub="Your rider is on the way · 18 min">
        <div className="relative mt-4 h-2 rounded-full bg-white/15">
          <div className="absolute inset-y-0 left-0 w-2/3 rounded-full bg-gradient-to-r from-brand-500 to-brand-300" />
          <span className="absolute -top-1.5 left-2/3 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-white text-brand-600 shadow">
            <Bike className="h-3 w-3" aria-hidden />
          </span>
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-white/60">
          <span>Pharmacy</span>
          <span>Your door</span>
        </div>
      </GlassCard>
    ),
  },
];

function GlassCard({ icon, tone, title, sub, children }: { icon: ReactNode; tone: "brand" | "care"; title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="w-72 rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,.5)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone === "care" ? "bg-care-500/20 text-care-500" : "bg-brand-500/25 text-brand-200"}`}>{icon}</span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-white/65">{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Full-bleed homepage hero: the MGK storefront photo with an auto-advancing, pausable message slider. */
export function HeroSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false); // user pressed pause
  const [held, setHeld] = useState(false); // hover / keyboard focus inside
  const [status, setStatus] = useState<ReturnType<typeof openStatus> | null>(null);
  const touchX = useRef<number | null>(null);

  // Opening status depends on the visitor's clock, so it's computed after hydration.
  useEffect(() => {
    const update = () => setStatus(openStatus());
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  const go = (i: number) => setActive((i + slides.length) % slides.length);
  const running = !paused && !held;

  return (
    <section
      className="relative isolate overflow-hidden bg-ink text-white"
      aria-roledescription="carousel"
      aria-label="MGK Pharmacy highlights"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHeld(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(active + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(active + 1);
        if (e.key === "ArrowLeft") go(active - 1);
      }}
    >
      {/* Storefront photo with a slow drift */}
      <picture>
        <source type="image/webp" srcSet="/images/mgk-storefront-768.webp 768w, /images/mgk-storefront-1280.webp 1280w" sizes="100vw" />
        <img
          src="/images/mgk-storefront-1280.jpg"
          alt="The MGK Healthcare building in Kano, with the pharmacy's glass shopfront and the dental unit beside it"
          width={1280}
          height={882}
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full animate-ken-burns object-cover object-[68%_22%] motion-reduce:animate-none"
        />
      </picture>
      {/* Legibility layers: dark from the left, fade at the bottom, a hint of brand colour */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/95 via-ink/75 to-transparent" aria-hidden />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-transparent to-transparent" aria-hidden />
      <div className="absolute -left-40 -top-40 -z-10 h-[32rem] w-[32rem] rounded-full bg-brand-600/25 blur-3xl" aria-hidden />

      <div className="container relative flex min-h-[460px] flex-col justify-center pb-8 pt-12 md:min-h-[560px] lg:min-h-[700px] lg:pb-36 lg:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
          {/* Slides share one grid cell so the height never jumps */}
          <div className="grid">
            {slides.map((s, i) => {
              const on = i === active;
              const Title = i === 0 ? "h1" : "p";
              return (
                <div
                  key={s.label}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${slides.length}: ${s.label}`}
                  aria-hidden={!on}
                  inert={!on}
                  // Outgoing text fades out fast; incoming waits for it so the two never overlap.
                  className={`col-start-1 row-start-1 transition-all ease-out motion-reduce:transition-none ${
                    on ? "translate-y-0 opacity-100 delay-300 duration-700" : "pointer-events-none -translate-y-2 opacity-0 duration-300"
                  }`}
                >
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-md">
                    <BadgeCheck className="h-4 w-4 text-care-500" aria-hidden /> {s.eyebrow}
                  </p>
                  <Title className="mt-5 max-w-2xl font-display text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-[60px]">
                    {s.title}
                  </Title>
                  <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">{s.body}</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href={s.primary.href} className="btn-primary btn-lg shadow-[0_10px_30px_-8px_rgba(215,31,51,.7)]">
                      {s.primary.label} <ArrowRight className="h-5 w-5" aria-hidden />
                    </Link>
                    <Link
                      href={s.secondary.href}
                      className="btn btn-lg border border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
                    >
                      <s.secondary.icon className="h-5 w-5" aria-hidden /> {s.secondary.label}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating card that matches the current slide (decorative) */}
          <div className="relative hidden h-64 lg:block" aria-hidden>
            {slides.map((s, i) => (
              <div
                key={s.label}
                className={`absolute right-0 top-1/2 -translate-y-1/2 transition-all ease-out motion-reduce:transition-none ${
                  i === active ? "translate-x-0 opacity-100 delay-300 duration-700" : "pointer-events-none translate-x-8 opacity-0 duration-300"
                }`}
              >
                {s.card}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar: slide controls with progress, and store details */}
      <div className="relative lg:absolute lg:inset-x-0 lg:bottom-0">
        <div className="container pb-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink/50 p-4 backdrop-blur-xl lg:flex-row lg:items-center lg:gap-6">
            <div className="flex flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 text-white/80 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              >
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <div className="grid flex-1 grid-cols-3 gap-2" role="tablist" aria-label="Choose a slide">
                {slides.map((s, i) => (
                  <button
                    key={s.label}
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    onClick={() => go(i)}
                    className="group text-left focus-visible:outline-none"
                  >
                    <span className="block h-1 overflow-hidden rounded-full bg-white/20 group-focus-visible:ring-2 group-focus-visible:ring-white">
                      {i < active && <span className="block h-full w-full bg-white" />}
                      {i === active && (
                        <span
                          key={`${active}`}
                          className="block h-full w-full origin-left animate-slide-progress bg-white motion-reduce:animate-none"
                          style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: running ? "running" : "paused" }}
                          onAnimationEnd={() => go(active + 1)}
                        />
                      )}
                    </span>
                    <span className={`mt-2 hidden truncate text-xs font-medium sm:block ${i === active ? "text-white" : "text-white/50 group-hover:text-white/80"}`}>
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/75 lg:border-l lg:border-white/10 lg:pl-6">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-300" aria-hidden />
                {site.address.line1}, {site.address.city}
              </span>
              <span className="flex items-center gap-2" aria-live="polite">
                <Clock className="h-4 w-4 text-brand-300" aria-hidden />
                {status ? (
                  <>
                    <span className={`h-2 w-2 rounded-full ${status.open ? "bg-care-500" : "bg-white/40"}`} aria-hidden />
                    {status.label}
                  </>
                ) : (
                  site.hours[0].time
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
