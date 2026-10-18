import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ah, badRequest, forbidden, HttpError, notFound } from "../lib/errors";
import { isStaff, requireAuth } from "../lib/auth";
import { buildQuote, zoneForState } from "../lib/pricing";
import {
  addEvent,
  allocateStock,
  cancelOrder,
  generateOrderNumber,
  markOrderPaid,
  newAccessKey,
  notifyOrder,
  orderInclude,
  serializeOrder,
} from "../lib/orders";
import { initializePayment, isValidWebhook, verifyPayment } from "../lib/paystack";
import { sendPrivateFile, upload } from "../lib/uploads";
import { env } from "../lib/env";
import { NIGERIAN_STATES } from "../lib/constants";
import { phoneSchema } from "./auth";
import { etaMinutes, geocode, storeLocation } from "../lib/geo";

export const ordersRouter = Router();

const checkoutSchema = z
  .object({
    items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(50) })).min(1).max(60),
    fulfilment: z.enum(["DELIVERY", "PICKUP"]),
    contact: z.object({
      firstName: z.string().trim().min(1, "Required").max(60),
      lastName: z.string().trim().min(1, "Required").max(60),
      email: z.string().trim().toLowerCase().email("Enter a valid email"),
      phone: phoneSchema,
    }),
    address: z
      .object({
        line1: z.string().trim().min(3, "Enter your street address").max(160),
        line2: z.string().trim().max(160).optional().or(z.literal("")),
        city: z.string().trim().min(2, "Enter your town or city").max(80),
        state: z.enum(NIGERIAN_STATES, { errorMap: () => ({ message: "Choose a state" }) }),
        landmark: z.string().trim().max(160).optional().or(z.literal("")),
        // Optional pin dropped by the customer on the checkout map.
        lat: z.number().min(4).max(14.1).optional(),
        lng: z.number().min(2.6).max(14.7).optional(),
      })
      .optional(),
    paymentMethod: z.enum(["PAYSTACK", "BANK_TRANSFER", "PAY_ON_PICKUP"]),
    prescriptionId: z.string().optional(),
    notes: z.string().trim().max(500).optional(),
    saveAddress: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.fulfilment === "DELIVERY" && !v.address) ctx.addIssue({ code: "custom", path: ["address"], message: "Delivery address is required" });
    if (v.paymentMethod === "PAY_ON_PICKUP" && v.fulfilment !== "PICKUP")
      ctx.addIssue({ code: "custom", path: ["paymentMethod"], message: "Pay on pickup is only available for store pickup" });
  });

ordersRouter.post(
  "/orders",
  ah(async (req, res) => {
    const body = checkoutSchema.parse(req.body);
    const user = req.user;
    if (body.paymentMethod === "PAYSTACK" && !env.paystackSecret) throw badRequest("Card payment is not available right now. Please choose another method.");

    const quote = await buildQuote(body.items, { fulfilment: body.fulfilment, state: body.address?.state, user });
    if (!quote.lines.length) throw badRequest("Your cart is empty.");
    const blocked = quote.lines.find((l) => l.issue);
    if (blocked) throw badRequest(`${blocked.name}: ${blocked.issue}. Please update your cart.`);

    let prescription = null;
    if (quote.requiresRx) {
      if (!user) throw new HttpError(401, "Please sign in to order prescription medicines.");
      if (quote.requiresVerification && user.verificationStatus !== "APPROVED") {
        throw forbidden("Controlled medicines require a verified account. Please complete identity verification first.");
      }
      if (!body.prescriptionId) throw badRequest("Please attach a prescription for the prescription-only items in your cart.");
      prescription = await prisma.prescription.findFirst({ where: { id: body.prescriptionId, userId: user.id } });
      if (!prescription || prescription.status === "REJECTED") throw badRequest("Please attach a valid prescription.");
      if (prescription.validUntil && prescription.validUntil < new Date()) throw badRequest("That prescription has expired. Please upload a current one.");
    }

    const rxApproved = prescription?.status === "APPROVED";
    const status = quote.requiresRx && !rxApproved
      ? "AWAITING_RX_REVIEW"
      : body.paymentMethod === "PAY_ON_PICKUP"
        ? "PROCESSING"
        : "AWAITING_PAYMENT";
    const zone = body.fulfilment === "DELIVERY" ? await zoneForState(body.address?.state) : null;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          number: generateOrderNumber(),
          accessKey: newAccessKey(),
          userId: user?.id,
          email: body.contact.email,
          phone: body.contact.phone,
          firstName: body.contact.firstName,
          lastName: body.contact.lastName,
          status,
          paymentMethod: body.paymentMethod,
          fulfilment: body.fulfilment,
          zoneId: zone?.id,
          addressLine1: body.address?.line1,
          addressLine2: body.address?.line2 || null,
          city: body.address?.city,
          state: body.address?.state,
          landmark: body.address?.landmark || null,
          deliveryLat: body.address?.lat ?? null,
          deliveryLng: body.address?.lng ?? null,
          locationSource: body.address?.lat != null ? "PIN" : null,
          subtotalKobo: quote.subtotalKobo,
          shippingKobo: quote.shippingKobo,
          totalKobo: quote.totalKobo,
          notes: body.notes || null,
          prescriptionId: prescription?.id,
          requiresRx: quote.requiresRx,
        },
      });
      for (const line of quote.lines) {
        const allocations = await allocateStock(tx, line.productId, line.quantity, line.name);
        await tx.orderItem.create({
          data: {
            orderId: created.id,
            productId: line.productId,
            name: line.name,
            packSize: line.packSize,
            rxStatus: line.rxStatus,
            priceKobo: line.priceKobo,
            quantity: line.quantity,
            allocations: JSON.stringify(allocations),
          },
        });
        await tx.product.update({ where: { id: line.productId }, data: { soldCount: { increment: line.quantity } } });
      }
      await addEvent(tx, created.id, "PLACED", "Order placed.", user ? `customer:${user.id}` : "guest");
      if (status === "AWAITING_RX_REVIEW") {
        await addEvent(tx, created.id, "RX_REVIEW", "Your prescription is with our pharmacist for review (usually within 2 working hours).");
      }
      if (body.saveAddress && user && body.address) {
        const hasDefault = await tx.address.count({ where: { userId: user.id, isDefault: true } });
        await tx.address.create({
          data: {
            userId: user.id,
            fullName: `${body.contact.firstName} ${body.contact.lastName}`,
            phone: body.contact.phone,
            line1: body.address.line1,
            line2: body.address.line2 || null,
            city: body.address.city,
            state: body.address.state,
            landmark: body.address.landmark || null,
            isDefault: hasDefault === 0,
          },
        });
      }
      return created;
    });

    const next =
      status === "AWAITING_RX_REVIEW"
        ? "We'll review your prescription and email you as soon as it's approved, usually within 2 working hours. You'll pay after approval."
        : body.paymentMethod === "BANK_TRANSFER"
          ? `Please transfer ₦${(order.totalKobo / 100).toLocaleString("en-NG")} to ${env.bank.accountName}, ${env.bank.name}, account ${env.bank.accountNumber}, using ${order.number} as the reference, then upload your receipt on the order page.`
          : body.paymentMethod === "PAY_ON_PICKUP"
            ? "Your order is being prepared. We'll let you know when it's ready to collect."
            : "Complete your card payment to confirm the order.";
    await notifyOrder(order, "We've received your order", next);

    // No pin dropped: look the address up in the background so the rider map has a destination.
    if (order.fulfilment === "DELIVERY" && order.deliveryLat == null) {
      void geocode({ line1: order.addressLine1, city: order.city, state: order.state })
        .then((hit) => hit && prisma.order.update({ where: { id: order.id }, data: { deliveryLat: hit.point.lat, deliveryLng: hit.point.lng, locationSource: hit.source } }))
        .catch((e) => console.warn("[geocode] failed", e));
    }

    // The order exists at this point, so a Paystack hiccup must not surface as a failed checkout (the customer
    // would retry and create duplicates). They land on the order page instead, where "Pay now" retries.
    let paymentUrl: string | null = null;
    let paymentError: string | null = null;
    if (body.paymentMethod === "PAYSTACK" && status === "AWAITING_PAYMENT") {
      try {
        paymentUrl = (await initializePayment(order)).authorization_url;
      } catch (e) {
        console.warn("[paystack] initialize failed", e);
        paymentError = "We couldn't open the payment page just now. Your order is saved: tap “Pay now” to try again.";
      }
    }
    res.status(201).json({ number: order.number, accessKey: order.accessKey, paymentUrl, paymentError });
  }),
);

/** Loads an order the caller may see: the owner, staff, or anyone holding the order's access key. */
async function loadAccessibleOrder(req: Request) {
  const order = await prisma.order.findUnique({ where: { number: req.params.number }, include: orderInclude });
  if (!order) throw notFound("Order");
  const key = (req.query.key as string | undefined) ?? (req.body?.key as string | undefined);
  const allowed = (req.user && order.userId === req.user.id) || isStaff(req.user) || (key && key === order.accessKey);
  if (!allowed) throw notFound("Order");
  return order;
}

ordersRouter.get(
  "/orders",
  requireAuth,
  ah(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders: orders.map((o) => serializeOrder(o)) });
  }),
);

ordersRouter.get(
  "/orders/:number",
  ah(async (req, res) => {
    let order = await loadAccessibleOrder(req);
    // Returning from Paystack: confirm the payment server-side before showing the result.
    const reference = req.query.reference as string | undefined;
    if (req.query.verify && reference && order.paymentStatus !== "PAID" && env.paystackSecret) {
      try {
        const tx = await verifyPayment(reference);
        if (tx.status === "success" && tx.amount === order.totalKobo && tx.metadata?.orderNumber === order.number) {
          await markOrderPaid(order.id, tx.reference, "paystack");
          order = await loadAccessibleOrder(req);
        }
      } catch (e) {
        console.warn("[paystack] verify failed", e);
      }
    }
    res.json({ order: serializeOrder(order) });
  }),
);

/** Live delivery position for the order page map. Polled every few seconds while the order is on its way. */
ordersRouter.get(
  "/orders/:number/tracking",
  ah(async (req, res) => {
    const order = await loadAccessibleOrder(req);
    if (order.fulfilment !== "DELIVERY") throw badRequest("This is a pickup order.");
    const destination = order.deliveryLat != null && order.deliveryLng != null ? { lat: order.deliveryLat, lng: order.deliveryLng } : null;
    const live = order.status === "DISPATCHED" && !!order.riderId;
    const points = live
      ? await prisma.riderLocation.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "desc" }, take: 120 })
      : [];
    const latest = points[0];
    const position = latest ? { lat: latest.lat, lng: latest.lng, heading: latest.heading, at: latest.createdAt } : null;
    res.setHeader("Cache-Control", "no-store");
    res.json({
      status: order.status,
      live,
      origin: storeLocation(),
      destination,
      destinationSource: order.locationSource,
      rider: live && order.rider ? { firstName: order.rider.firstName, phone: order.rider.phone } : null,
      position,
      trail: points.reverse().map((p) => [p.lat, p.lng]),
      etaMinutes: position && destination ? etaMinutes(position, destination, latest?.speed) : null,
      stale: position ? Date.now() - new Date(position.at).getTime() > 90_000 : false,
      dispatchedAt: order.dispatchedAt,
      deliveredAt: order.deliveredAt,
    });
  }),
);

ordersRouter.post(
  "/orders/track",
  ah(async (req, res) => {
    const { number, email } = z
      .object({ number: z.string().trim().toUpperCase(), email: z.string().trim().toLowerCase().email() })
      .parse(req.body);
    const order = await prisma.order.findUnique({ where: { number } });
    if (!order || order.email !== email) throw notFound("We couldn't find an order with that number and email. Order");
    res.json({ number: order.number, accessKey: order.accessKey });
  }),
);

ordersRouter.post(
  "/orders/:number/cancel",
  ah(async (req, res) => {
    const order = await loadAccessibleOrder(req);
    const { reason } = z.object({ reason: z.string().trim().max(300).optional() }).parse(req.body ?? {});
    const result = await cancelOrder(order.id, `Cancelled by customer${reason ? `: ${reason}` : "."}`, "customer", { byCustomer: true });
    await notifyOrder(
      order,
      "Order cancelled",
      result.refundQueued
        ? "Your order has been cancelled. A full refund is on its way to your original payment method (2–5 working days)."
        : "Your order has been cancelled. No payment was taken.",
    );
    res.json({ ok: true, ...result });
  }),
);

ordersRouter.post(
  "/orders/:number/payment-proof",
  upload.single("file"),
  ah(async (req, res) => {
    const order = await loadAccessibleOrder(req);
    if (!req.file) throw badRequest("Please choose a file to upload.");
    if (order.paymentMethod !== "BANK_TRANSFER" || !["AWAITING_PAYMENT"].includes(order.status)) {
      throw badRequest("This order isn't waiting for a bank transfer.");
    }
    await prisma.order.update({ where: { id: order.id }, data: { proofFilePath: req.file.filename, paymentStatus: "PROOF_SUBMITTED" } });
    await addEvent(prisma, order.id, "PROOF", "Payment receipt uploaded. We'll confirm it shortly (usually within 1 working hour).", "customer");
    res.json({ ok: true });
  }),
);

ordersRouter.post(
  "/orders/:number/pay",
  ah(async (req, res) => {
    const order = await loadAccessibleOrder(req);
    if (order.status !== "AWAITING_PAYMENT" || order.paymentStatus === "PAID") throw badRequest("This order isn't awaiting payment.");
    if (order.paymentMethod !== "PAYSTACK") {
      await prisma.order.update({ where: { id: order.id }, data: { paymentMethod: "PAYSTACK" } });
    }
    const { authorization_url } = await initializePayment(order);
    res.json({ paymentUrl: authorization_url });
  }),
);

ordersRouter.get(
  "/orders/:number/payment-proof",
  ah(async (req, res) => {
    const order = await loadAccessibleOrder(req);
    await sendPrivateFile(res, order.proofFilePath, `receipt-${order.number}`);
  }),
);

/** Paystack webhook. Mounted with a raw body parser in app.ts so the signature can be checked. */
export const paystackWebhook = ah(async (req, res) => {
  const raw = req.body as Buffer;
  if (!isValidWebhook(raw, req.header("x-paystack-signature"))) return res.sendStatus(401);
  const event = JSON.parse(raw.toString("utf8")) as {
    event: string;
    data: { reference: string; amount: number; status: string; metadata?: { orderNumber?: string } };
  };
  if (event.event === "charge.success" && event.data.metadata?.orderNumber) {
    const order = await prisma.order.findUnique({ where: { number: event.data.metadata.orderNumber } });
    if (order && event.data.amount === order.totalKobo) await markOrderPaid(order.id, event.data.reference, "paystack-webhook");
  }
  res.sendStatus(200);
});
