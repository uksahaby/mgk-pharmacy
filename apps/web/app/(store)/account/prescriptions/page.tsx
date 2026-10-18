import type { Metadata } from "next";
import { FileText, ExternalLink } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { Prescription } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { ReviewPill } from "@/components/badges";
import { PageHeader } from "@/components/ui";
import { UploadPrescription } from "./upload-prescription";

export const metadata: Metadata = { title: "My prescriptions" };

export default async function PrescriptionsPage() {
  const data = await apiGet<{ prescriptions: Prescription[] }>("/prescriptions");
  const list = data?.prescriptions ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Prescriptions" subtitle="Upload once, reuse for repeat orders until the prescription expires." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section aria-labelledby="rx-list" className="space-y-3">
          <h2 id="rx-list" className="sr-only">Your prescriptions</h2>
          {list.length === 0 ? (
            <div className="card p-8 text-center text-sm text-ink-muted">
              <FileText className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
              <p className="mt-3 font-semibold text-ink">No prescriptions yet</p>
              <p className="mt-1">Upload one now, or attach it at checkout when you order a prescription medicine.</p>
            </div>
          ) : (
            list.map((p) => (
              <article key={p.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-ink-soft">
                      {p.mimeType === "application/pdf" ? "PDF" : "IMG"}
                    </span>
                    <div>
                      <p className="font-semibold">{p.patientName}</p>
                      <p className="text-sm text-ink-muted">
                        {[p.prescriberName, p.facility].filter(Boolean).join(" · ") || "Prescriber not specified"}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        Uploaded {formatDate(p.createdAt)}
                        {p.validUntil && ` · valid until ${formatDate(p.validUntil)}`}
                      </p>
                    </div>
                  </div>
                  <ReviewPill status={p.status} expired={p.expired} />
                </div>
                {p.reviewerNote && (
                  <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${p.status === "REJECTED" ? "bg-brand-50 text-brand-900" : "bg-slate-50 text-ink-soft"}`}>
                    <span className="font-semibold">Pharmacist's note:</span> {p.reviewerNote}
                  </p>
                )}
                <a href={`/api/prescriptions/${p.id}/file`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
                  View file <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </article>
            ))
          )}
        </section>
        <aside>
          <UploadPrescription />
        </aside>
      </div>
    </div>
  );
}
