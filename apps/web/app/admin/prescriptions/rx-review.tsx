"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { api } from "@/lib/client-api";
import { useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";

const REJECT_REASONS = [
  "The prescription is unclear or unreadable",
  "The prescription is older than 6 months",
  "The patient's name doesn't match",
  "The prescriber's signature or details are missing",
  "The prescribed medicine or dose doesn't match the order",
];

/** Approve/reject controls used for both prescriptions and identity verifications. */
export function ReviewControls({ endpoint, withValidity }: { endpoint: string; withValidity?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [note, setNote] = useState("");
  const [validDays, setValidDays] = useState(180);
  const { pending, error, run } = useSubmit();

  const submit = async (decision: "APPROVED" | "REJECTED") => {
    const ok = await run(() => api(endpoint, { json: { decision, note: note || undefined, ...(withValidity ? { validDays } : {}) } }));
    if (ok) router.refresh();
  };

  return (
    <div className="space-y-3 border-t border-slate-100 pt-4">
      {error && <Alert tone="error">{error}</Alert>}
      {mode === "idle" ? (
        <>
          {withValidity && (
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Valid for repeat orders</span>
              <select className="input w-auto" value={validDays} onChange={(e) => setValidDays(Number(e.target.value))}>
                <option value={30}>30 days</option>
                <option value={90}>3 months</option>
                <option value={180}>6 months</option>
                <option value={365}>12 months</option>
              </select>
            </label>
          )}
          <input className="input" placeholder="Note to customer (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-care flex-1" disabled={pending} onClick={() => submit("APPROVED")}>
              <Check className="h-4 w-4" aria-hidden /> Approve
            </button>
            <button className="btn-outline flex-1 text-brand-700" disabled={pending} onClick={() => setMode("reject")}>
              <X className="h-4 w-4" aria-hidden /> Reject
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="label" htmlFor="reject-reason">Reason (sent to the customer)</label>
          <select id="reject-reason" className="input" value={REJECT_REASONS.includes(note) ? note : ""} onChange={(e) => setNote(e.target.value)}>
            <option value="">Choose a common reason…</option>
            {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Or write your own" />
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={pending || !note} onClick={() => submit("REJECTED")}>Confirm rejection</button>
            <button className="btn-outline flex-1" onClick={() => setMode("idle")}>Back</button>
          </div>
        </>
      )}
    </div>
  );
}

export function RxReview({ id }: { id: string }) {
  return <ReviewControls endpoint={`/admin/prescriptions/${id}/review`} withValidity />;
}
