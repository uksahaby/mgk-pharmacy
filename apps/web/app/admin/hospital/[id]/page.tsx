import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { HospitalPrescription, PickableProduct } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/format";
import { HospitalItemPill } from "@/components/badges";
import { Alert } from "@/components/ui";
import { hasAllergies, patientLine, pregnancyText, prescribedQuantity, weightText } from "../patient";
import { SupplyForm } from "./supply-form";

export const metadata: Metadata = { title: "Hospital prescription" };

export default async function HospitalPrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiGet<{ prescription: HospitalPrescription; suggestions: Record<string, PickableProduct[]> }>(
    `/admin/hospital-prescriptions/${encodeURIComponent(id)}`,
  );
  if (!data) notFound();
  const p = data.prescription;
  const open = p.items.filter((i) => i.open);
  const handled = p.items.filter((i) => !i.open);

  return (
    <div className="space-y-6">
      <Link href="/admin/hospital" className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Hospital prescriptions
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{p.patient.firstName} {p.patient.lastName}</h1>
          <p className="text-sm text-ink-muted">{patientLine(p)}</p>
          {p.weight && <p className="text-sm text-ink-muted">Weight {weightText(p.weight)}</p>}
        </div>
        <div className="text-right text-sm text-ink-muted">
          <p className="font-medium text-ink-soft">{p.prescriberName}{p.clinic ? ` · ${p.clinic}` : ""}</p>
          <p>{formatDateTime(p.prescribedAt)}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {hasAllergies(p.allergies) ? (
          <Alert tone="error" title="Allergies">{p.allergies}</Alert>
        ) : p.allergies ? (
          <Alert tone="success" title="Allergies">{p.allergies}</Alert>
        ) : (
          <Alert tone="warning" title="Allergies">None recorded at the hospital. Ask the patient.</Alert>
        )}
        {p.pregnancy?.status === "PREGNANT" && (
          <Alert tone="warning" title={pregnancyText(p.pregnancy)}>
            {[p.pregnancy.basis, p.pregnancy.recordedAt && formatDate(p.pregnancy.recordedAt)].filter(Boolean).join(", ")}. Check each medicine is safe in pregnancy.
          </Alert>
        )}
        {p.pregnancy?.status === "NOT_PREGNANT" && (
          <Alert tone="info" title="Not pregnant">
            {[p.pregnancy.basis, p.pregnancy.recordedAt && formatDate(p.pregnancy.recordedAt)].filter(Boolean).join(", ")}.
          </Alert>
        )}
        {p.hmo && (
          <Alert tone="info" title={`HMO: ${p.hmo}`}>
            The hospital bills this patient&apos;s visit to their HMO. Check the HMO&apos;s cover for medicines before taking payment.
          </Alert>
        )}
      </div>
      {p.alerts.map((a) => (
        <Alert key={a} tone="error" title="Prescription changed">{a}</Alert>
      ))}

      {open.length > 0 && <SupplyForm prescriptionId={p.id} items={open} suggestions={data.suggestions} />}

      {handled.length > 0 && (
        <section className="card overflow-hidden">
          <h2 className="border-b border-slate-100 px-5 py-4 font-semibold">{open.length ? "Already handled" : "Medicines"}</h2>
          <ul className="divide-y divide-slate-100">
            {handled.map((i) => (
              <li key={i.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm">
                <div className={i.cancelled && !i.orderNumber ? "text-ink-muted line-through" : undefined}>
                  <p className="font-medium">{i.medicine}</p>
                  <p className="text-xs text-ink-muted">{[i.dosage, prescribedQuantity(i) && `prescribed ${prescribedQuantity(i)}`].filter(Boolean).join(" · ")}</p>
                  {i.supplied && (
                    <p className="mt-1 text-xs text-ink-soft">
                      Supplied: {i.supplied.quantity} × {i.supplied.name} ({i.supplied.packSize})
                    </p>
                  )}
                  {i.reason && <p className="mt-1 text-xs text-ink-soft">{i.reason}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {i.orderNumber && (
                    <Link href={`/admin/orders/${i.orderNumber}`} className="text-xs font-semibold text-brand-700 hover:underline">{i.orderNumber}</Link>
                  )}
                  <HospitalItemPill state={i.state} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
