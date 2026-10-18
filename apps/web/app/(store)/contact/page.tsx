import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { site } from "@/lib/site";
import { Breadcrumbs } from "@/components/ui";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact us", description: `Get in touch with ${site.name}: WhatsApp, phone, email or visit us in Kano.` };

export default function ContactPage() {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.address.line1}, ${site.address.line2}, ${site.address.city}, Nigeria`)}`;
  return (
    <div className="container py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact us" }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">We're here to help</h1>
      <p className="mt-2 max-w-2xl text-lg text-ink-soft">
        The fastest way to reach a pharmacist is WhatsApp. For order questions, include your order number.
      </p>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <a href={site.whatsapp} target="_blank" rel="noreferrer" className="card flex items-center gap-4 p-5 transition hover:shadow-lift">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-care-50 text-care-600"><MessageCircle className="h-6 w-6" aria-hidden /></span>
            <span>
              <span className="block font-semibold">WhatsApp a pharmacist</span>
              <span className="text-sm text-ink-muted">Typical reply within 15 minutes during opening hours</span>
            </span>
          </a>
          <a href={site.phoneHref} className="card flex items-center gap-4 p-5 transition hover:shadow-lift">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><Phone className="h-6 w-6" aria-hidden /></span>
            <span>
              <span className="block font-semibold">{site.phone}</span>
              <span className="text-sm text-ink-muted">Call or SMS</span>
            </span>
          </a>
          <a href={`mailto:${site.email}`} className="card flex items-center gap-4 p-5 transition hover:shadow-lift">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-sky-600"><Mail className="h-6 w-6" aria-hidden /></span>
            <span>
              <span className="block font-semibold">{site.email}</span>
              <span className="text-sm text-ink-muted">We reply within one working day</span>
            </span>
          </a>
          <div className="card p-5">
            <p className="flex items-center gap-2 font-semibold"><MapPin className="h-5 w-5 text-brand-600" aria-hidden /> Visit the pharmacy</p>
            <p className="mt-2 text-sm text-ink-soft">
              {site.address.line1}, {site.address.line2}
              <br />
              {site.address.city}, {site.address.state}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-ink-soft">
              {site.hours.map((h) => (
                <li key={h.days} className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-ink-muted" aria-hidden /> {h.days}: {h.time}</li>
              ))}
            </ul>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-outline btn-sm mt-4">Get directions</a>
          </div>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
