"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, CreditCard, RefreshCcw, Upload, XCircle } from "lucide-react";
import { api } from "@/lib/client-api";
import { FileField, SubmitButton, useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";
import { useCart } from "@/components/cart/cart-provider";
import type { Order } from "@/lib/types";

const q = (key?: string) => (key ? `?key=${encodeURIComponent(key)}` : "");

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // clipboard unavailable; the value is visible on screen anyway
        }
      }}
      className="btn-outline btn-sm"
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-care-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function UploadProof({ number, accessKey }: { number: string; accessKey?: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const { pending, error, run } = useSubmit();
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) return;
        const fd = new FormData();
        fd.set("file", file);
        const ok = await run(() => api(`/orders/${number}/payment-proof${q(accessKey)}`, { form: fd }));
        if (ok) router.refresh();
      }}
    >
      <FileField label="Upload your transfer receipt" file={file} onFile={setFile} hint="A screenshot from your banking app is fine." />
      {error && <p className="field-error">{error}</p>}
      <SubmitButton pending={pending} disabled={!file} className="btn-dark w-full sm:w-auto">
        <Upload className="h-4 w-4" aria-hidden /> Send receipt
      </SubmitButton>
    </form>
  );
}

export function PayOnlineButton({ number, accessKey, label = "Pay now with card, bank or USSD" }: { number: string; accessKey?: string; label?: string }) {
  const { pending, error, run } = useSubmit();
  return (
    <div>
      <button
        className="btn-primary btn-lg w-full sm:w-auto"
        disabled={pending}
        onClick={async () => {
          const res = await run(() => api<{ paymentUrl: string }>(`/orders/${number}/pay${q(accessKey)}`, { method: "POST" }));
          if (res) window.location.href = res.paymentUrl;
        }}
      >
        <CreditCard className="h-5 w-5" aria-hidden /> {pending ? "Redirecting to Paystack…" : label}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function CancelOrder({ number, accessKey, paid }: { number: string; accessKey?: string; paid: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, error, run } = useSubmit();
  if (!open) {
    return (
      <button className="btn-outline w-full text-brand-700" onClick={() => setOpen(true)}>
        <XCircle className="h-4 w-4" aria-hidden /> Cancel order
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4" role="dialog" aria-label="Cancel order">
      <p className="font-semibold">Cancel this order?</p>
      <p className="text-sm text-ink-soft">
        {paid ? "You'll get a full refund to your original payment method within 2–5 working days." : "No payment has been taken, so there's nothing to refund."}
      </p>
      <label className="label" htmlFor="cancel-reason">Reason (optional)</label>
      <select id="cancel-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="">Choose a reason</option>
        <option>I ordered the wrong item</option>
        <option>I found it cheaper elsewhere</option>
        <option>Delivery takes too long</option>
        <option>I no longer need it</option>
        <option>Other</option>
      </select>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex gap-2">
        <button
          className="btn-primary flex-1"
          disabled={pending}
          onClick={async () => {
            const ok = await run(() => api(`/orders/${number}/cancel${q(accessKey)}`, { json: { reason: reason || undefined } }));
            if (ok) router.refresh();
          }}
        >
          {pending ? "Cancelling…" : "Yes, cancel order"}
        </button>
        <button className="btn-outline flex-1" onClick={() => setOpen(false)}>
          Keep order
        </button>
      </div>
    </div>
  );
}

export function BuyAgain({ order }: { order: Order }) {
  const { add } = useCart();
  const router = useRouter();
  return (
    <button
      className="btn-outline w-full"
      onClick={() => {
        for (const i of order.items) {
          if (!i.slug) continue;
          add(i.productId, { slug: i.slug, name: i.name, packSize: i.packSize, priceKobo: i.priceKobo, rxStatus: i.rxStatus, icon: i.icon }, i.quantity);
        }
        router.push("/cart");
      }}
    >
      <RefreshCcw className="h-4 w-4" aria-hidden /> Buy again
    </button>
  );
}
