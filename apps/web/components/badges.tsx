import { FileText, ShieldAlert, Snowflake } from "lucide-react";
import clsx from "clsx";
import type { OrderStatus, PaymentStatus, RxStatus } from "@/lib/types";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/format";

export function RxBadge({ status, className }: { status: RxStatus; className?: string }) {
  if (status === "OTC") return null;
  return status === "CONTROLLED" ? (
    <span className={clsx("chip bg-violet-100 text-violet-800", className)} title="Controlled medicine: verified account and prescription required">
      <ShieldAlert className="h-3 w-3" aria-hidden /> Controlled
    </span>
  ) : (
    <span className={clsx("chip bg-amber-100 text-amber-800", className)} title="Prescription required">
      <FileText className="h-3 w-3" aria-hidden /> Rx only
    </span>
  );
}

export function ColdChainBadge({ className }: { className?: string }) {
  return (
    <span className={clsx("chip bg-sky-100 text-sky-800", className)} title="Shipped refrigerated">
      <Snowflake className="h-3 w-3" aria-hidden /> Keep cold
    </span>
  );
}

const ORDER_TONE: Record<OrderStatus, string> = {
  AWAITING_RX_REVIEW: "bg-amber-100 text-amber-800",
  AWAITING_PAYMENT: "bg-orange-100 text-orange-800",
  PROCESSING: "bg-sky-100 text-sky-800",
  READY_FOR_PICKUP: "bg-indigo-100 text-indigo-800",
  DISPATCHED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-care-100 text-care-700",
  COMPLETED: "bg-care-100 text-care-700",
  CANCELLED: "bg-slate-200 text-slate-700",
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <span className={clsx("chip", ORDER_TONE[status])}>{orderStatusLabel[status]}</span>;
}

const PAY_TONE: Record<PaymentStatus, string> = {
  UNPAID: "bg-orange-100 text-orange-800",
  PROOF_SUBMITTED: "bg-amber-100 text-amber-800",
  PAID: "bg-care-100 text-care-700",
  REFUND_PENDING: "bg-sky-100 text-sky-800",
  REFUNDED: "bg-slate-200 text-slate-700",
};

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return <span className={clsx("chip", PAY_TONE[status])}>{paymentStatusLabel[status]}</span>;
}

const REVIEW_TONE = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-care-100 text-care-700",
  REJECTED: "bg-brand-100 text-brand-800",
  UNVERIFIED: "bg-slate-200 text-slate-700",
} as const;

const REVIEW_LABEL = { PENDING: "In review", APPROVED: "Approved", REJECTED: "Not accepted", UNVERIFIED: "Not verified" } as const;

export function ReviewPill({ status, expired }: { status: keyof typeof REVIEW_TONE; expired?: boolean }) {
  if (expired) return <span className="chip bg-slate-200 text-slate-700">Expired</span>;
  return <span className={clsx("chip", REVIEW_TONE[status])}>{REVIEW_LABEL[status]}</span>;
}
