import Link from "next/link";
import { Breadcrumbs } from "./ui";

const NAV = [
  ["About us", "/about"],
  ["How prescriptions work", "/prescriptions"],
  ["Delivery & pickup", "/delivery"],
  ["Returns & refunds", "/returns"],
  ["FAQs", "/faq"],
  ["Contact us", "/contact"],
  ["Privacy policy", "/privacy"],
  ["Terms of service", "/terms"],
];

export function InfoPage({
  title,
  intro,
  updated,
  current,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  updated?: string;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Help and policies" className="hidden lg:block">
          <ul className="sticky top-40 space-y-0.5">
            {NAV.map(([label, href]) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current === href ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm ${current === href ? "bg-white font-semibold text-ink shadow-card" : "text-ink-soft hover:text-ink"}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-3xl">
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          {updated && <p className="mt-2 text-sm text-ink-muted">Last updated {updated}</p>}
          {intro && <p className="mt-4 text-lg leading-relaxed text-ink-soft">{intro}</p>}
          <div className="prose-mgk mt-8">{children}</div>
        </article>
      </div>
    </div>
  );
}
