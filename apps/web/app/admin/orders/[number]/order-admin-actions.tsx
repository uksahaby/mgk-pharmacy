"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";
import { orderStatusLabel } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

export function OrderAdminActions({ order, allowed }: { order: Order; allowed: OrderStatus[] }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [riders, setRiders] = useState<{ id: string; name: string; activeDeliveries: number }[]>([]);
  const [riderId, setRiderId] = useState("");
  const { pending, error, run } = useSubmit();

  useEffect(() => {
    if (!allowed.includes("DISPATCHED")) return;
    api<{ riders: { id: string; name: string; activeDeliveries: number }[] }>("/admin/riders")
      .then((r) => setRiders(r.riders))
      .catch(() => setRiders([]));
  }, [allowed]);

  const act = async (fn: () => Promise<unknown>) => {
    const ok = await run(fn);
    if (ok) {
      setNote("");
      router.refresh();
    }
  };

  const canMarkPaid = order.status === "AWAITING_PAYMENT" && order.paymentStatus !== "PAID";
  // Unpaid orders move forward via "Confirm payment received", not a manual status change.
  const forward = allowed.filter((s) => s !== "CANCELLED" && !(order.status === "AWAITING_PAYMENT" && s === "PROCESSING"));

  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-semibold">Actions</h2>
      {error && <Alert tone="error">{error}</Alert>}

      {canMarkPaid && (
        <div className="space-y-2 rounded-xl bg-orange-50 p-3">
          <p className="text-sm font-medium">
            {order.paymentStatus === "PROOF_SUBMITTED" ? "Customer uploaded a transfer receipt. Check it against the bank statement." : "Waiting for payment."}
          </p>
          <input className="input" placeholder="Bank reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
          <button className="btn-care w-full" disabled={pending} onClick={() => act(() => api(`/admin/orders/${order.number}/mark-paid`, { json: { reference: reference || undefined } }))}>
            Confirm payment received
          </button>
        </div>
      )}

      {order.paymentStatus === "REFUND_PENDING" && (
        <button className="btn-dark w-full" disabled={pending} onClick={() => act(() => api(`/admin/orders/${order.number}/refunded`, { method: "POST" }))}>
          Mark refund as completed
        </button>
      )}

      {forward.length > 0 && (
        <div className="space-y-2">
          {forward.includes("DISPATCHED") && (
            <>
              <label className="label" htmlFor="rider">Rider</label>
              <select id="rider" className="input" value={riderId} onChange={(e) => setRiderId(e.target.value)}>
                <option value="">Choose a rider…</option>
                {riders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.activeDeliveries ? ` (${r.activeDeliveries} on the road)` : " (available)"}
                  </option>
                ))}
              </select>
              {riders.length === 0 && <p className="hint">No rider accounts yet. Create a user with the RIDER role.</p>}
            </>
          )}
          <label className="label" htmlFor="status-note">Note to customer (optional)</label>
          <input id="status-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please keep your phone on" />
          {forward.map((s) => (
            <button
              key={s}
              className="btn-primary w-full"
              disabled={pending || (s === "DISPATCHED" && !riderId)}
              onClick={() => act(() => api(`/admin/orders/${order.number}/status`, { json: { status: s, note: note || undefined, riderId: s === "DISPATCHED" ? riderId : undefined } }))}
            >
              {s === "DISPATCHED" ? "Send out for delivery" : `Move to “${orderStatusLabel[s]}”`}
            </button>
          ))}
        </div>
      )}

      {allowed.includes("CANCELLED") && (
        <button
          className="btn-outline w-full text-brand-700"
          disabled={pending}
          onClick={() => {
            const reason = window.prompt("Reason for cancelling (sent to the customer):");
            if (reason) act(() => api(`/admin/orders/${order.number}/status`, { json: { status: "CANCELLED", note: reason } }));
          }}
        >
          Cancel order
        </button>
      )}

      {!canMarkPaid && forward.length === 0 && !allowed.includes("CANCELLED") && order.paymentStatus !== "REFUND_PENDING" && (
        <p className="text-sm text-ink-muted">No further actions for this order.</p>
      )}
      {order.status === "AWAITING_RX_REVIEW" && <p className="text-xs text-ink-muted">Approve or reject the prescription to move this order forward.</p>}
    </section>
  );
}
