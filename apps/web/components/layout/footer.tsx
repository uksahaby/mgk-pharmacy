import Link from "next/link";
import { BadgeCheck, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { site } from "@/lib/site";
import { Logo } from "./logo";

const groups = [
  {
    title: "Shop",
    links: [
      ["All products", "/shop"],
      ["Malaria", "/category/malaria"],
      ["Diabetes care", "/category/diabetes"],
      ["Blood pressure & heart", "/category/blood-pressure-heart"],
      ["Vitamins & supplements", "/category/vitamins-supplements"],
      ["Mother & baby", "/category/mother-baby"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Track your order", "/track"],
      ["How prescriptions work", "/prescriptions"],
      ["Delivery & pickup", "/delivery"],
      ["Returns & refunds", "/returns"],
      ["FAQs", "/faq"],
      ["Contact us", "/contact"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About us", "/about"],
      ["Privacy policy", "/privacy"],
      ["Terms of service", "/terms"],
      ["My account", "/account"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 bg-ink text-slate-300">
      <div className="container grid gap-12 py-14 lg:grid-cols-[1.4fr_2fr]">
        <div className="space-y-5">
          <Logo inverted />
          <p className="max-w-sm text-sm leading-relaxed text-slate-400">{site.description}</p>
          <ul className="space-y-2.5 text-sm">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              <span>
                {site.address.line1}, {site.address.line2}, {site.address.city}, {site.address.country}
              </span>
            </li>
            <li className="flex gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              <a href={site.phoneHref} className="hover:text-white">{site.phone}</a>
            </li>
            <li className="flex gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              <a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a>
            </li>
            <li className="flex gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              <span>{site.hours.map((h) => `${h.days}: ${h.time}`).join(" · ")}</span>
            </li>
          </ul>
          <a href={site.whatsapp} target="_blank" rel="noreferrer" className="btn-care">
            <MessageCircle className="h-4 w-4" aria-hidden /> Chat with a pharmacist
          </a>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {groups.map((g) => (
            <div key={g.title}>
              <h2 className="text-sm font-semibold text-white">{g.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {g.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-slate-400 hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-4 py-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <BadgeCheck className="h-4 w-4 text-care-500" aria-hidden /> Registered with the Pharmacists Council of Nigeria · {site.pcnPremisesNumber}
            </span>
            <span>Superintendent pharmacist: {site.superintendent}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>Payments secured by Paystack</span>
            <span>© {new Date().getFullYear()} {site.name}. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
