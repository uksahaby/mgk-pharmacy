import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet } from "@/lib/server-api";
import type { Order } from "@/lib/types";
import { OrderDetail } from "@/components/order/order-detail";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ key?: string; new?: string; verify?: string; reference?: string; payfail?: string }>;
}) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const qs = new URLSearchParams();
  if (sp.key) qs.set("key", sp.key);
  if (sp.verify && sp.reference) {
    qs.set("verify", "1");
    qs.set("reference", sp.reference);
  }
  const data = await apiGet<{ order: Order }>(`/orders/${encodeURIComponent(number)}?${qs}`);
  if (!data) notFound();
  return (
    <div className="container max-w-5xl py-8">
      <nav className="mb-4 text-sm text-ink-muted">
        <Link href="/account/orders" className="hover:text-ink">My orders</Link> / <span className="text-ink-soft">{number}</span>
      </nav>
      {sp.payfail && data.order.paymentStatus !== "PAID" && (
        <Alert tone="warning" className="mb-6" title="Your order is saved, but the payment page didn't open">
          This can happen if the connection to Paystack drops. Use “Pay now” below to try again. You won't be charged twice.
        </Alert>
      )}
      <OrderDetail order={data.order} accessKey={sp.key} justPlaced={sp.new === "1" || !!sp.verify} />
    </div>
  );
}
