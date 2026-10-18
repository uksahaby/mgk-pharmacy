import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { Verification } from "@/lib/types";
import { formatDateTime, formatPhone, idTypeLabel } from "@/lib/format";
import { ReviewPill } from "@/components/badges";
import { EmptyState } from "@/components/ui";
import { ReviewControls } from "../prescriptions/rx-review";

export const metadata: Metadata = { title: "Verifications" };

type AdminVerification = Verification & { customer: { firstName: string; lastName: string; email: string; phone: string | null }; hasLicense: boolean };

export default async function AdminVerifications({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? "PENDING";
  const data = await apiGet<{ verifications: AdminVerification[] }>(`/admin/verifications?status=${status}`);
  const list = data?.verifications ?? [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Identity verifications</h1>
        <p className="text-sm text-ink-muted">Check the ID matches the account name. For professionals, confirm the licence on the MDCN/PCN register.</p>
      </div>
      <nav className="flex gap-1.5" aria-label="Filter">
        {["PENDING", "APPROVED", "REJECTED"].map((s) => (
          <Link key={s} href={`/admin/verifications?status=${s}`} className={clsx("rounded-full px-3.5 py-1.5 text-sm font-medium", status === s ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-slate-200")}>
            {{ PENDING: "To review", APPROVED: "Approved", REJECTED: "Rejected" }[s]}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <EmptyState icon={<BadgeCheck className="h-7 w-7" />} title={status === "PENDING" ? "All caught up" : "Nothing here yet"} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((v) => (
            <article key={v.id} className="card space-y-4 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold">{v.customer.firstName} {v.customer.lastName}</p>
                  <p className="text-sm text-ink-muted">{v.customer.email} · {formatPhone(v.customer.phone)}</p>
                </div>
                <ReviewPill status={v.status} />
              </div>
              <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                <div><dt className="text-xs text-ink-muted">Applying as</dt><dd className="font-medium">{{ PATIENT: "Patient / caregiver", DOCTOR: "Medical doctor", PHARMACIST: "Pharmacist" }[v.type]}</dd></div>
                <div><dt className="text-xs text-ink-muted">ID type</dt><dd>{idTypeLabel[v.idType] ?? v.idType}</dd></div>
                {v.licenseNumber && <div><dt className="text-xs text-ink-muted">Licence no.</dt><dd className="font-mono">{v.licenseNumber}</dd></div>}
                <div><dt className="text-xs text-ink-muted">Submitted</dt><dd>{formatDateTime(v.createdAt)}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <a className="btn-outline btn-sm" href={`/api/admin/verifications/${v.id}/id`} target="_blank" rel="noreferrer">View ID <ExternalLink className="h-3 w-3" /></a>
                {v.hasLicense && <a className="btn-outline btn-sm" href={`/api/admin/verifications/${v.id}/license`} target="_blank" rel="noreferrer">View licence <ExternalLink className="h-3 w-3" /></a>}
              </div>
              {v.reviewerNote && <p className="text-sm text-ink-muted">Note: {v.reviewerNote}</p>}
              {v.status === "PENDING" && <ReviewControls endpoint={`/admin/verifications/${v.id}/review`} />}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
