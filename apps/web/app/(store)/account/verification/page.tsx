import type { Metadata } from "next";
import { BadgeCheck, Clock } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { Verification } from "@/lib/types";
import { formatDate, idTypeLabel } from "@/lib/format";
import { ReviewPill } from "@/components/badges";
import { Alert, PageHeader } from "@/components/ui";
import { VerificationForm } from "./verification-form";

export const metadata: Metadata = { title: "Identity verification" };

export default async function VerificationPage() {
  const data = (await apiGet<{ status: "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED"; history: Verification[] }>("/verification"))!;
  const latest = data.history[0];
  return (
    <div className="space-y-6">
      <PageHeader title="Identity verification" subtitle="Required only for controlled medicines and for doctors or pharmacists buying for practice." />

      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className={`grid h-11 w-11 place-items-center rounded-xl ${data.status === "APPROVED" ? "bg-care-50 text-care-600" : "bg-slate-100 text-ink-soft"}`}>
            {data.status === "PENDING" ? <Clock className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
          </span>
          <div>
            <p className="font-semibold">Status</p>
            <p className="text-sm text-ink-muted">
              {latest ? `Last submitted ${formatDate(latest.createdAt)} · ${idTypeLabel[latest.idType] ?? latest.idType}` : "You haven't submitted documents yet."}
            </p>
          </div>
        </div>
        <ReviewPill status={data.status} />
      </div>

      {data.status === "APPROVED" && (
        <Alert tone="success" title="You're verified">
          You can order controlled medicines with a valid prescription. Nothing else to do here.
        </Alert>
      )}
      {data.status === "PENDING" && (
        <Alert tone="info" title="We're reviewing your documents">
          This usually takes less than one working day. We'll email you as soon as it's done.
        </Alert>
      )}
      {data.status === "REJECTED" && latest?.reviewerNote && (
        <Alert tone="error" title="We couldn't verify your account">
          {latest.reviewerNote} Please submit new documents below.
        </Alert>
      )}

      {(data.status === "UNVERIFIED" || data.status === "REJECTED") && <VerificationForm />}

      <section className="card p-5 text-sm leading-relaxed text-ink-soft sm:p-6">
        <h2 className="text-base font-semibold text-ink">Why we ask</h2>
        <p className="mt-2">
          Nigerian law requires pharmacies to confirm who they supply controlled medicines to. Your ID is checked by a pharmacist, stored
          privately, and never shared except where the law requires it (PCN, NAFDAC or NDLEA). Most customers never need to verify:
          everyday and prescription-only medicines only need a valid prescription.
        </p>
      </section>
    </div>
  );
}
