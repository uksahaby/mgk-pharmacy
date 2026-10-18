import type { OrderStatus, PaymentStatus, RxStatus } from "./types";

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const nairaExact = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 });

/** Formats an amount held in kobo. Whole-naira amounts drop the decimals. */
export function formatNaira(kobo: number) {
  return kobo % 100 === 0 ? naira.format(kobo / 100) : nairaExact.format(kobo / 100);
}

export function formatDate(iso: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", ...opts }).format(new Date(iso));
}

export function formatDateTime(iso: string | Date) {
  return formatDate(iso, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatPhone(e164: string | null | undefined) {
  if (!e164) return "";
  const local = e164.replace(/^\+234/, "0");
  return local.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3");
}

export const rxLabel: Record<RxStatus, string> = {
  OTC: "Over the counter",
  POM: "Prescription only",
  CONTROLLED: "Controlled medicine",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  AWAITING_RX_REVIEW: "Prescription review",
  AWAITING_PAYMENT: "Awaiting payment",
  PROCESSING: "Being prepared",
  READY_FOR_PICKUP: "Ready for pickup",
  DISPATCHED: "On its way",
  DELIVERED: "Delivered",
  COMPLETED: "Collected",
  CANCELLED: "Cancelled",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PROOF_SUBMITTED: "Receipt submitted",
  PAID: "Paid",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
};

export const paymentMethodLabel = {
  PAYSTACK: "Card / USSD (Paystack)",
  BANK_TRANSFER: "Bank transfer",
  PAY_ON_PICKUP: "Pay at pickup",
} as const;

export const idTypeLabel: Record<string, string> = {
  NIN: "National ID (NIN slip or card)",
  DRIVERS_LICENCE: "Driver's licence",
  PASSPORT: "International passport",
  VOTERS_CARD: "Voter's card",
};

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
