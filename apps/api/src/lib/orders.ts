import crypto from "crypto";
import type { Order, OrderEvent, OrderItem, Prisma, Prescription, ShippingZone } from "@prisma/client";
import { prisma } from "./prisma";
import { env } from "./env";
import { badRequest } from "./errors";
import { sendMail } from "./mailer";
import { CUSTOMER_CANCELLABLE, type OrderStatus } from "./constants";

type Tx = Prisma.TransactionClient;

export const orderInclude = {
  items: { include: { product: { include: { category: true } } } },
  events: { orderBy: { createdAt: "asc" } },
  zone: true,
  prescription: true,
  rider: { select: { id: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.OrderInclude;

type FullOrder = Order & {
  items: (OrderItem & { product?: { slug: string; category?: { icon: string } } })[];
  events: OrderEvent[];
  zone: ShippingZone | null;
  prescription: Prescription | null;
  rider?: { id: string; firstName: string; lastName: string; phone: string | null } | null;
};

/** 4-digit code the customer gives the rider at the door, confirming the right person received the order. */
export const newDeliveryCode = () => String(crypto.randomInt(1000, 10000));

export function generateOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `MGK-${ymd}-${crypto.randomInt(1000, 9999)}${crypto.randomInt(10, 99)}`;
}

export const newAccessKey = () => crypto.randomBytes(18).toString("base64url");

export async function addEvent(tx: Tx | typeof prisma, orderId: string, type: string, message: string, actor = "system") {
  await tx.orderEvent.create({ data: { orderId, type, message, actor } });
}

/** Allocates stock first-expiry-first-out. Throws if there is not enough sellable stock. */
export async function allocateStock(tx: Tx, productId: string, quantity: number, productName: string) {
  const batches = await tx.batch.findMany({
    where: { productId, status: "ACTIVE", quantity: { gt: 0 }, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "asc" },
  });
  let remaining = quantity;
  const allocations: { batchId: string; quantity: number }[] = [];
  for (const b of batches) {
    if (remaining <= 0) break;
    const take = Math.min(b.quantity, remaining);
    await tx.batch.update({ where: { id: b.id }, data: { quantity: { decrement: take } } });
    allocations.push({ batchId: b.id, quantity: take });
    remaining -= take;
  }
  if (remaining > 0) throw badRequest(`Sorry, ${productName} no longer has enough stock. Please update your cart.`);
  return allocations;
}

async function restock(tx: Tx, items: OrderItem[]) {
  for (const item of items) {
    const allocations = JSON.parse(item.allocations) as { batchId: string; quantity: number }[];
    for (const a of allocations) {
      await tx.batch.update({ where: { id: a.batchId }, data: { quantity: { increment: a.quantity } } });
    }
    await tx.product.update({ where: { id: item.productId }, data: { soldCount: { decrement: item.quantity } } });
  }
}

export async function cancelOrder(orderId: string, reason: string, actor: string, opts: { byCustomer?: boolean } = {}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (order.status === "CANCELLED") throw badRequest("This order is already cancelled.");
    if (opts.byCustomer && !CUSTOMER_CANCELLABLE.includes(order.status as OrderStatus)) {
      throw badRequest("This order has already left the pharmacy and can no longer be cancelled online. Please contact us.");
    }
    await restock(tx, order.items);
    const paid = order.paymentStatus === "PAID";
    await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", cancelledAt: new Date(), paymentStatus: paid ? "REFUND_PENDING" : order.paymentStatus },
    });
    await addEvent(tx, orderId, "CANCELLED", reason, actor);
    if (paid) await addEvent(tx, orderId, "REFUND", "A full refund has been queued to your original payment method.", "system");
    return { refundQueued: paid };
  });
}

export function serializeOrder(o: FullOrder, opts: { staff?: boolean } = {}) {
  const canCancel = CUSTOMER_CANCELLABLE.includes(o.status as OrderStatus);
  const showBankDetails =
    o.paymentMethod === "BANK_TRANSFER" && o.status !== "CANCELLED" && ["UNPAID", "PROOF_SUBMITTED"].includes(o.paymentStatus);
  return {
    number: o.number,
    accessKey: o.accessKey,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    paymentRef: o.paymentRef,
    hasProof: !!o.proofFilePath,
    fulfilment: o.fulfilment,
    customer: { firstName: o.firstName, lastName: o.lastName, email: o.email, phone: o.phone },
    address:
      o.fulfilment === "DELIVERY"
        ? { line1: o.addressLine1, line2: o.addressLine2, city: o.city, state: o.state, landmark: o.landmark }
        : null,
    zone: o.zone ? { name: o.zone.name, etaLabel: o.zone.etaLabel } : null,
    items: o.items.map((i) => ({
      productId: i.productId,
      slug: i.product?.slug,
      icon: i.product?.category?.icon ?? "pill",
      name: i.name,
      packSize: i.packSize,
      rxStatus: i.rxStatus,
      priceKobo: i.priceKobo,
      quantity: i.quantity,
    })),
    subtotalKobo: o.subtotalKobo,
    shippingKobo: o.shippingKobo,
    totalKobo: o.totalKobo,
    notes: o.notes,
    requiresRx: o.requiresRx,
    prescription: o.prescription
      ? {
          id: o.prescription.id,
          status: o.prescription.status,
          reviewerNote: o.prescription.reviewerNote,
          originalName: o.prescription.originalName,
        }
      : null,
    events: o.events.map((e) => ({ type: e.type, message: e.message, createdAt: e.createdAt, ...(opts.staff ? { actor: e.actor } : {}) })),
    canCancel,
    canPayOnline: o.status === "AWAITING_PAYMENT" && o.paymentStatus !== "PAID" && !!env.paystackSecret,
    bankDetails: showBankDetails ? env.bank : null,
    payBy:
      o.paymentMethod === "BANK_TRANSFER" && o.status === "AWAITING_PAYMENT"
        ? new Date(o.updatedAt.getTime() + env.unpaidOrderTtlHours * 3600_000)
        : null,
    delivery:
      o.fulfilment === "DELIVERY"
        ? {
            destination: o.deliveryLat != null && o.deliveryLng != null ? { lat: o.deliveryLat, lng: o.deliveryLng, source: o.locationSource } : null,
            rider: o.rider && ["DISPATCHED", "DELIVERED"].includes(o.status) ? { firstName: o.rider.firstName, phone: o.rider.phone, ...(opts.staff ? { id: o.rider.id, lastName: o.rider.lastName } : {}) } : null,
            // The code is shown to the customer (and staff) while the order is on its way; never to the rider.
            code: o.status === "DISPATCHED" ? o.deliveryCode : null,
            dispatchedAt: o.dispatchedAt,
            deliveredAt: o.deliveredAt,
            live: o.status === "DISPATCHED" && !!o.riderId,
          }
        : null,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    cancelledAt: o.cancelledAt,
  };
}

export async function notifyOrder(order: Order, subject: string, body: string) {
  await sendMail({
    to: order.email,
    subject: `${subject} · Order ${order.number}`,
    text: `Hi ${order.firstName},\n\n${body}\n\nView your order: ${env.webOrigin}/order/${order.number}?key=${order.accessKey}\n\nMGK Pharmacy`,
  });
}

/** Marks an order paid exactly once and moves it into processing. Safe to call repeatedly. */
export async function markOrderPaid(orderId: string, reference: string | null, actor: string) {
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.paymentStatus === "PAID" || order.status === "CANCELLED") return null;
    const next = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        paymentRef: reference ?? order.paymentRef,
        status: order.status === "AWAITING_PAYMENT" ? "PROCESSING" : order.status,
      },
    });
    await addEvent(tx, orderId, "PAID", "Payment confirmed. Our pharmacists are preparing your order.", actor);
    return next;
  });
  if (updated) await notifyOrder(updated, "Payment received", "We've received your payment and our pharmacists are now preparing your order.");
  return updated;
}

/** Cancels bank-transfer orders that stayed unpaid past the configured window. */
export async function expireUnpaidOrders() {
  const cutoff = new Date(Date.now() - env.unpaidOrderTtlHours * 3600_000);
  const stale = await prisma.order.findMany({
    where: { status: "AWAITING_PAYMENT", paymentMethod: "BANK_TRANSFER", paymentStatus: "UNPAID", updatedAt: { lt: cutoff } },
  });
  for (const o of stale) {
    await cancelOrder(o.id, `Automatically cancelled: no payment received within ${env.unpaidOrderTtlHours} hours.`, "system");
    await notifyOrder(o, "Order cancelled", "We didn't receive payment in time, so your order was cancelled and the items returned to stock. You're welcome to order again any time.");
  }
  if (stale.length) console.log(`[jobs] expired ${stale.length} unpaid order(s)`);
}
