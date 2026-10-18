import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { Order } from "@/lib/types";
import { OrderDetail } from "@/components/order/order-detail";

export const metadata: Metadata = { title: "Order details" };

export default async function AccountOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const data = await apiGet<{ order: Order }>(`/orders/${encodeURIComponent(number)}`);
  if (!data) notFound();
  return (
    <div>
      <Link href="/account/orders" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden /> All orders
      </Link>
      <OrderDetail order={data.order} />
    </div>
  );
}
