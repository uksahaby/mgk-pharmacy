import { BadgeCheck, FileText, Lock, Truck } from "lucide-react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="container grid gap-10 py-10 lg:grid-cols-2 lg:py-16">
      <div className="mx-auto w-full max-w-md lg:order-2">
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-ink to-slate-800 p-10 text-white lg:block">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl" aria-hidden />
        <h2 className="relative max-w-sm text-3xl font-bold text-white">Your pharmacy, in your pocket.</h2>
        <ul className="relative mt-8 space-y-5">
          {[
            { icon: FileText, t: "Saved prescriptions", d: "Approved once, reused for repeat orders until they expire." },
            { icon: Truck, t: "Live order tracking", d: "See exactly where your order is, from review to your door." },
            { icon: BadgeCheck, t: "Pharmacist support", d: "Real pharmacists, not bots, a message away." },
            { icon: Lock, t: "Private and secure", d: "Your health data is kept private and never used for marketing." },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{t}</span>
                <span className="text-sm text-slate-400">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
