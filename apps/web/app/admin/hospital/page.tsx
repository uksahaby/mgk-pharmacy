import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, Search, Stethoscope } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { HospitalPrescription } from "@/lib/types";
import { formatDateTime, pluralize } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { patientLine } from "./patient";

export const metadata: Metadata = { title: "Hospital prescriptions" };

export default async function HospitalPrescriptions({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "done" ? "done" : "open";
  const qs = new URLSearchParams({ view });
  if (sp.q) qs.set("q", sp.q);
  const data = await apiGet<{ prescriptions: HospitalPrescription[] }>(`/admin/hospital-prescriptions?${qs}`);
  const list = data?.prescriptions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hospital prescriptions</h1>
          <p className="text-sm text-ink-muted">Sent by doctors at MGK Health Care. Patients pay when they collect.</p>
        </div>
        <form className="relative w-full max-w-xs" action="/admin/hospital">
          <input type="hidden" name="view" value={view} />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input name="q" defaultValue={sp.q} placeholder="Patient name or hospital number" className="input pl-9" aria-label="Search hospital prescriptions" />
        </form>
      </div>
      <nav className="flex gap-1.5" aria-label="Filter">
        {(["open", "done"] as const).map((v) => (
          <Link
            key={v}
            href={`/admin/hospital?view=${v}`}
            className={clsx("rounded-full px-3.5 py-1.5 text-sm font-medium", view === v ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-slate-200")}
          >
            {v === "open" ? "To supply" : "Handled (30 days)"}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <EmptyState icon={<Stethoscope className="h-7 w-7" />} title={sp.q ? "No matching prescriptions" : view === "open" ? "All caught up" : "Nothing here yet"}>
          {view === "open" && !sp.q ? "No hospital prescriptions are waiting." : null}
        </EmptyState>
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {list.map((p) => {
            const active = p.items.filter((i) => !i.cancelled);
            return (
              <Link key={p.id} href={`/admin/hospital/${p.id}`} className="flex flex-wrap items-start gap-x-6 gap-y-2 px-5 py-4 transition hover:bg-slate-50">
                <div className="min-w-[220px] flex-1">
                  <p className="font-semibold">{p.patient.firstName} {p.patient.lastName}</p>
                  <p className="text-xs text-ink-muted">{patientLine(p)}</p>
                  <p className="mt-1 text-sm text-ink-soft">{active.map((i) => i.medicine).join(", ") || "All medicines cancelled"}</p>
                </div>
                <div className="text-sm text-ink-muted">
                  <p>{p.prescriberName}{p.clinic ? ` · ${p.clinic}` : ""}</p>
                  <p className="text-xs">{formatDateTime(p.prescribedAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {p.pregnancy?.status === "PREGNANT" && <span className="chip bg-pink-100 text-pink-800">Pregnant</span>}
                  {p.hmo && <span className="chip bg-violet-100 text-violet-800">HMO</span>}
                  {p.alerts.length > 0 && (
                    <span className="chip bg-brand-100 text-brand-800"><AlertTriangle className="h-3 w-3" aria-hidden /> Changed</span>
                  )}
                  {p.openCount > 0 ? (
                    <span className="chip bg-amber-100 text-amber-800">{pluralize(p.openCount, "to supply", "to supply")}</span>
                  ) : (
                    p.alerts.length === 0 && <span className="chip bg-slate-100 text-slate-700">Handled</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
