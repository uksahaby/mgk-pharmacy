import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { FileCheck2 } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { OrderStatus, Prescription } from "@/lib/types";
import { formatDate, formatDateTime, formatPhone } from "@/lib/format";
import { OrderStatusPill, ReviewPill, RxBadge } from "@/components/badges";
import { EmptyState } from "@/components/ui";
import { RxReview } from "./rx-review";

export const metadata: Metadata = { title: "Prescriptions" };

type AdminRx = Prescription & {
  customer: { firstName: string; lastName: string; email: string; phone: string | null };
  orders: { number: string; status: OrderStatus; items: { name: string; quantity: number; rxStatus: "OTC" | "POM" | "CONTROLLED" }[] }[];
};

export default async function AdminPrescriptions({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? "PENDING";
  const data = await apiGet<{ prescriptions: AdminRx[] }>(`/admin/prescriptions?status=${status}`);
  const list = data?.prescriptions ?? [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prescriptions</h1>
        <p className="text-sm text-ink-muted">Review in order received. Orders move to payment automatically when you approve.</p>
      </div>
      <nav className="flex gap-1.5" aria-label="Filter">
        {["PENDING", "APPROVED", "REJECTED"].map((s) => (
          <Link key={s} href={`/admin/prescriptions?status=${s}`} className={clsx("rounded-full px-3.5 py-1.5 text-sm font-medium", status === s ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-slate-200")}>
            {{ PENDING: "To review", APPROVED: "Approved", REJECTED: "Rejected" }[s]}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <EmptyState icon={<FileCheck2 className="h-7 w-7" />} title={status === "PENDING" ? "All caught up" : "Nothing here yet"}>
          {status === "PENDING" ? "No prescriptions are waiting for review." : null}
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {list.map((p) => {
            const fileUrl = `/api/admin/prescriptions/${p.id}/file`;
            return (
              <article key={p.id} className="card grid overflow-hidden lg:grid-cols-[1.1fr_1fr]">
                <div className="min-h-[360px] border-b border-slate-100 bg-slate-100 lg:border-b-0 lg:border-r">
                  {p.mimeType === "application/pdf" ? (
                    <iframe src={fileUrl} title={`Prescription for ${p.patientName}`} className="h-full min-h-[420px] w-full" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl} alt={`Prescription for ${p.patientName}`} className="h-full max-h-[560px] w-full object-contain" />
                  )}
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{p.patientName}</p>
                      <p className="text-sm text-ink-muted">
                        {[p.prescriberName, p.facility].filter(Boolean).join(" · ") || "Prescriber not given"}
                        {p.issuedOn && ` · issued ${formatDate(p.issuedOn)}`}
                      </p>
                    </div>
                    <ReviewPill status={p.status} expired={p.expired} />
                  </div>
                  <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                    <div><dt className="text-xs text-ink-muted">Account</dt><dd>{p.customer.firstName} {p.customer.lastName}</dd></div>
                    <div><dt className="text-xs text-ink-muted">Phone</dt><dd>{formatPhone(p.customer.phone)}</dd></div>
                    <div className="col-span-2"><dt className="text-xs text-ink-muted">Uploaded</dt><dd>{formatDateTime(p.createdAt)}</dd></div>
                  </dl>
                  {p.notes && <p className="rounded-xl bg-amber-50 p-3 text-sm"><strong>Patient note:</strong> {p.notes}</p>}
                  {p.orders.map((o) => (
                    <div key={o.number} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <Link href={`/admin/orders/${o.number}`} className="font-semibold hover:underline">{o.number}</Link>
                        <OrderStatusPill status={o.status} />
                      </div>
                      <ul className="mt-2 space-y-1">
                        {o.items.map((i) => (
                          <li key={i.name} className="flex items-center gap-2">
                            {i.quantity} × {i.name} <RxBadge status={i.rxStatus} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {p.reviewerNote && <p className="text-sm text-ink-muted">Review note: {p.reviewerNote}</p>}
                  {p.status === "PENDING" && <RxReview id={p.id} />}
                  <a href={fileUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-700 hover:underline">Open file in new tab</a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
