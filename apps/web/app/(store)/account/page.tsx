import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, FileText, MapPin, Package, ShieldQuestion } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { OrderStatus, PaymentStatus, Prescription, User, Verification } from "@/lib/types";
import { formatDate, formatNaira, pluralize } from "@/lib/format";
import { OrderStatusPill, ReviewPill } from "@/components/badges";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "My account" };

type Overview = {
  user: User;
  activeOrders: number;
  recentOrders: { number: string; status: OrderStatus; paymentStatus: PaymentStatus; totalKobo: number; itemCount: number; createdAt: string }[];
  prescriptions: Prescription[];
  verification: Verification | null;
  addressCount: number;
};

export default async function AccountOverview() {
  const data = (await apiGet<Overview>("/account/overview"))!;
  const { user } = data;
  const needsPayment = data.recentOrders.find((o) => o.status === "AWAITING_PAYMENT" && o.paymentStatus === "UNPAID");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hello, {user.firstName}</h1>
        <p className="mt-1 text-ink-muted">Here's everything happening with your orders and prescriptions.</p>
      </div>

      {needsPayment && (
        <Alert tone="warning" title={`Order ${needsPayment.number} is waiting for payment`}>
          <Link href={`/account/orders/${needsPayment.number}`} className="font-semibold underline">Complete payment</Link> so we can start preparing it.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="/account/orders" icon={<Package className="h-5 w-5" />} label="Active orders" value={String(data.activeOrders)} />
        <StatCard href="/account/prescriptions" icon={<FileText className="h-5 w-5" />} label="Prescriptions" value={String(data.prescriptions.length)} />
        <StatCard
          href="/account/verification"
          icon={user.verificationStatus === "APPROVED" ? <BadgeCheck className="h-5 w-5" /> : <ShieldQuestion className="h-5 w-5" />}
          label="Identity"
          value={{ UNVERIFIED: "Not verified", PENDING: "In review", APPROVED: "Verified", REJECTED: "Action needed" }[user.verificationStatus]}
        />
        <StatCard href="/account/addresses" icon={<MapPin className="h-5 w-5" />} label="Saved addresses" value={String(data.addressCount)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-5 sm:p-6" aria-labelledby="recent-h">
          <div className="flex items-center justify-between">
            <h2 id="recent-h" className="text-lg font-semibold">Recent orders</h2>
            <Link href="/account/orders" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>
          </div>
          {data.recentOrders.length ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {data.recentOrders.map((o) => (
                <li key={o.number}>
                  <Link href={`/account/orders/${o.number}`} className="-mx-2 flex items-center justify-between gap-4 rounded-xl px-2 py-3 hover:bg-slate-50">
                    <div>
                      <p className="font-semibold">{o.number}</p>
                      <p className="text-sm text-ink-muted">
                        {formatDate(o.createdAt)} · {pluralize(o.itemCount, "item")} · {formatNaira(o.totalKobo)}
                      </p>
                    </div>
                    <OrderStatusPill status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">
              No orders yet. <Link href="/shop" className="font-semibold text-ink underline">Start shopping</Link>
            </p>
          )}
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="rx-h">
          <div className="flex items-center justify-between">
            <h2 id="rx-h" className="text-lg font-semibold">Prescriptions</h2>
            <Link href="/account/prescriptions" className="text-sm font-semibold text-brand-700 hover:underline">Manage</Link>
          </div>
          {data.prescriptions.length ? (
            <ul className="mt-4 space-y-3">
              {data.prescriptions.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.patientName}</span>
                    <span className="text-xs text-ink-muted">Uploaded {formatDate(p.createdAt)}</span>
                  </span>
                  <ReviewPill status={p.status} expired={p.expired} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-ink-muted">
              Upload a prescription once and reuse it for repeat orders.
              <Link href="/account/prescriptions" className="btn-dark btn-sm mt-3">Upload prescription <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ href, icon, label, value }: { href: string; icon: React.ReactNode; label: string; value: string }) {
  return (
    <Link href={href} className="card flex items-center gap-4 p-4 transition hover:shadow-lift">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
      <span>
        <span className="block text-xs text-ink-muted">{label}</span>
        <span className="block text-lg font-bold">{value}</span>
      </span>
    </Link>
  );
}
