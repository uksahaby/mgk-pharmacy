import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, HeartHandshake, ShieldCheck, Stethoscope } from "lucide-react";
import { InfoPage } from "@/components/info-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "About us", description: `Who we are: ${site.name}, a licensed community pharmacy in Kano serving customers across Nigeria.` };

export default function AboutPage() {
  return (
    <InfoPage
      current="/about"
      title="About MGK Pharmacy"
      intro="We're a licensed community pharmacy in Kano. We built this online pharmacy so that families across Nigeria can get genuine medicines and real pharmacist advice without the queue, guesswork or fakes."
    >
      <div className="not-prose grid gap-4 sm:grid-cols-2">
        {[
          { icon: ShieldCheck, t: "Genuine, traceable stock", d: "We buy only from NAFDAC-registered manufacturers and licensed distributors, and track every batch and expiry date." },
          { icon: Stethoscope, t: "Pharmacists, not just sellers", d: "Every prescription is reviewed by a registered pharmacist, and you can ask us anything on WhatsApp." },
          { icon: HeartHandshake, t: "Fair, transparent prices", d: "Clear prices, clear delivery fees, and free cancellation before dispatch." },
          { icon: BadgeCheck, t: "Licensed and accountable", d: `Registered with the Pharmacists Council of Nigeria (${site.pcnPremisesNumber}).` },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="card p-5">
            <Icon className="h-6 w-6 text-brand-600" aria-hidden />
            <p className="mt-3 font-semibold text-ink">{t}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{d}</p>
          </div>
        ))}
      </div>
      <h2>Visit us</h2>
      <p>
        Our pharmacy is at {site.address.line1}, {site.address.line2}, {site.address.city}. You can collect online orders here free of charge,
        usually within an hour of ordering.
      </p>
      <ul>
        {site.hours.map((h) => (
          <li key={h.days}>
            {h.days}: {h.time}
          </li>
        ))}
      </ul>
      <h2>Regulation</h2>
      <p>
        {site.name} operates under the supervision of our superintendent pharmacist, {site.superintendent}. We follow the Pharmacists
        Council of Nigeria's code of ethics, NAFDAC regulations and the Nigeria Data Protection Act 2023.
      </p>
      <p>
        Questions or concerns? <Link href="/contact">Contact us</Link>. We respond to every message.
      </p>
    </InfoPage>
  );
}
