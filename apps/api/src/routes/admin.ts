import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ah, badRequest, forbidden, HttpError, notFound } from "../lib/errors";
import { hasEverStocked, isLowStock, LOW_STOCK_THRESHOLD, serializeProduct, stockOf } from "../lib/catalog";
import { addEvent, cancelOrder, markOrderPaid, newDeliveryCode, notifyOrder, orderInclude, serializeOrder } from "../lib/orders";
import { sendPrivateFile } from "../lib/uploads";
import { sendMail } from "../lib/mailer";
import { startOfNigerianDay } from "../lib/time";
import { can, ORDER_STATUS, STAFF_TRANSITIONS, type OrderStatus, type Permission } from "../lib/constants";
import { serializePrescription, serializeVerification } from "./account";
import { staffRouter } from "./staff";

export const adminRouter = Router();
/**
 * Every admin endpoint needs a permission. Rules are matched in order on the path below /admin;
 * anything not listed here is denied, so new routes can't be exposed by accident.
 */
const ACCESS_RULES: [RegExp, Permission | { read: Permission; write: Permission }][] = [
  [/^\/summary$/, "dashboard.view"],
  [/^\/riders$/, "orders.manage"],
  [/^\/orders(\/|$)/, { read: "orders.view", write: "orders.manage" }],
  [/^\/prescriptions(\/|$)/, "prescriptions.review"],
  [/^\/verifications(\/|$)/, "verifications.review"],
  [/^\/(products|batches)(\/|$)/, "products.manage"],
  [/^\/inventory$/, "inventory.manage"],
  [/^\/customers$/, "customers.view"],
  [/^\/messages(\/|$)/, "messages.view"],
  [/^\/(users|audit|roles)(\/|$)/, "staff.manage"],
];

adminRouter.use((req, _res, next) => {
  if (!req.user) return next(new HttpError(401, "Please sign in to continue."));
  const rule = ACCESS_RULES.find(([re]) => re.test(req.path));
  if (!rule) return next(forbidden());
  const need = typeof rule[1] === "string" ? rule[1] : req.method === "GET" ? rule[1].read : rule[1].write;
  if (!can(req.user.role, need)) return next(forbidden("Your role doesn't allow this. Ask an administrator if you need access."));
  next();
});

const actorOf = (req: { user?: { id: string; firstName: string } }) => `staff:${req.user!.firstName}`;
const DAY = 86_400_000;

/* ---------- Dashboard ---------- */

adminRouter.get(
  "/summary",
  ah(async (req, res) => {
    const startOfDay = startOfNigerianDay(); // not the server clock, which is usually UTC in production
    const thirtyDaysAgo = new Date(Date.now() - 30 * DAY);
    const [byStatus, todayPaid, monthPaid, rxPending, verifPending, proofPending, products, messages] = await Promise.all([
      prisma.order.groupBy({ by: ["status"], _count: true }),
      prisma.order.aggregate({ where: { paidAt: { gte: startOfDay } }, _sum: { totalKobo: true }, _count: true }),
      prisma.order.aggregate({ where: { paidAt: { gte: thirtyDaysAgo } }, _sum: { totalKobo: true }, _count: true }),
      prisma.prescription.count({ where: { status: "PENDING" } }),
      prisma.verification.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { paymentStatus: "PROOF_SUBMITTED", status: "AWAITING_PAYMENT" } }),
      prisma.product.findMany({ where: { active: true }, include: { batches: true } }),
      prisma.contactMessage.count({ where: { handled: false } }),
    ]);
    const lowStock = products.filter(isLowStock).length;
    const neverStocked = products.filter((p) => !hasEverStocked(p)).length;
    const soon = Date.now() + 90 * DAY;
    const expiringBatches = products.flatMap((p) => p.batches).filter(
      (b) => b.status === "ACTIVE" && b.quantity > 0 && b.expiresAt.getTime() < soon,
    ).length;

    // Each role only sees the figures and queues it can act on.
    const role = req.user!.role;
    const seeOrders = can(role, "orders.view");
    const recent = seeOrders ? await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: orderInclude }) : [];
    res.json({
      ordersByStatus: seeOrders ? Object.fromEntries(byStatus.map((s) => [s.status, s._count])) : {},
      today: seeOrders ? { revenueKobo: todayPaid._sum.totalKobo ?? 0, orders: todayPaid._count } : null,
      last30: seeOrders ? { revenueKobo: monthPaid._sum.totalKobo ?? 0, orders: monthPaid._count } : null,
      queues: {
        rxPending: can(role, "prescriptions.review") ? rxPending : null,
        verifPending: can(role, "verifications.review") ? verifPending : null,
        proofPending: can(role, "orders.manage") ? proofPending : null,
        lowStock: can(role, "inventory.manage") ? lowStock : null,
        neverStocked: can(role, "products.manage") ? neverStocked : null,
        expiringBatches: can(role, "inventory.manage") ? expiringBatches : null,
        messages: can(role, "messages.view") ? messages : null,
      },
      recentOrders: recent.map((o) => serializeOrder(o, { staff: true })),
    });
  }),
);

/* ---------- Orders ---------- */

adminRouter.get(
  "/orders",
  ah(async (req, res) => {
    const f = z
      .object({
        status: z.enum(ORDER_STATUS).optional(),
        q: z.string().trim().optional(),
        queue: z.enum(["proof"]).optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
      .parse(req.query);
    const where: Prisma.OrderWhereInput = {};
    if (f.status) where.status = f.status;
    if (f.queue === "proof") Object.assign(where, { paymentStatus: "PROOF_SUBMITTED", status: "AWAITING_PAYMENT" });
    if (f.q) where.OR = [{ number: { contains: f.q, mode: "insensitive" } }, { email: { contains: f.q, mode: "insensitive" } }, { lastName: { contains: f.q, mode: "insensitive" } }, { phone: { contains: f.q, mode: "insensitive" } }];
    const pageSize = 25;
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" }, skip: (f.page - 1) * pageSize, take: pageSize }),
    ]);
    res.json({ orders: orders.map((o) => serializeOrder(o, { staff: true })), total, page: f.page, pageCount: Math.max(1, Math.ceil(total / pageSize)) });
  }),
);

adminRouter.get(
  "/orders/:number",
  ah(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { number: req.params.number }, include: orderInclude });
    if (!order) throw notFound("Order");
    res.json({
      order: serializeOrder(order, { staff: true }),
      allowedTransitions: (STAFF_TRANSITIONS[order.status as OrderStatus] ?? []).filter((s) =>
        order.fulfilment === "PICKUP" ? s !== "DISPATCHED" : s !== "READY_FOR_PICKUP",
      ),
    });
  }),
);

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  PROCESSING: "Your order is being prepared by our pharmacists.",
  READY_FOR_PICKUP: "Your order is ready for collection at our Kano pharmacy. Please bring your order number.",
  DISPATCHED: "Your order is on its way.",
  DELIVERED: "Your order has been delivered. Thank you for choosing us.",
  COMPLETED: "Your order has been collected. Thank you for choosing us.",
};

adminRouter.get(
  "/riders",
  ah(async (_req, res) => {
    const riders = await prisma.user.findMany({
      where: { role: "RIDER" },
      orderBy: { firstName: "asc" },
      include: { _count: { select: { deliveries: { where: { status: "DISPATCHED" } } } } },
    });
    res.json({ riders: riders.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}`, phone: r.phone, activeDeliveries: r._count.deliveries })) });
  }),
);

adminRouter.post(
  "/orders/:number/status",
  ah(async (req, res) => {
    const { status, note, riderId } = z
      .object({ status: z.enum(ORDER_STATUS), note: z.string().trim().max(300).optional(), riderId: z.string().optional() })
      .parse(req.body);
    const order = await prisma.order.findUnique({ where: { number: req.params.number } });
    if (!order) throw notFound("Order");
    const allowed = STAFF_TRANSITIONS[order.status as OrderStatus] ?? [];
    if (!allowed.includes(status)) throw badRequest(`Can't move an order from ${order.status} to ${status}.`);
    if (status === "CANCELLED") {
      await cancelOrder(order.id, `Cancelled by pharmacy${note ? `: ${note}` : "."}`, actorOf(req));
      await notifyOrder(order, "Order cancelled", note ? `Your order was cancelled: ${note}` : "Your order was cancelled. Please contact us if you have questions.");
      return res.json({ ok: true });
    }
    if (status === "PROCESSING" && order.paymentMethod !== "PAY_ON_PICKUP" && order.paymentStatus !== "PAID") {
      throw badRequest("Confirm payment before moving this order to processing.");
    }
    if (status === "READY_FOR_PICKUP" && order.fulfilment !== "PICKUP") throw badRequest("This is a delivery order.");
    if (status === "DISPATCHED" && order.fulfilment !== "DELIVERY") throw badRequest("This is a pickup order.");

    if (status === "DISPATCHED") {
      if (!riderId) throw badRequest("Choose the rider taking this delivery.");
      const rider = await prisma.user.findFirst({ where: { id: riderId, role: "RIDER" } });
      if (!rider) throw badRequest("That rider wasn't found.");
      const code = newDeliveryCode();
      await prisma.order.update({ where: { id: order.id }, data: { status, riderId: rider.id, dispatchedAt: new Date(), deliveryCode: code } });
      await addEvent(prisma, order.id, status, `Your order is on its way with ${rider.firstName}. Track the rider live on this page.${note ? ` ${note}` : ""}`, actorOf(req));
      await notifyOrder(
        order,
        "Your order is on its way",
        `${rider.firstName} is bringing your order now and you can follow them live on the map. Your delivery code is ${code}. Give it to the rider only when you receive your package.`,
      );
      return res.json({ ok: true });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status,
        ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
        ...(status === "COMPLETED" && order.paymentMethod === "PAY_ON_PICKUP" ? { paymentStatus: "PAID", paidAt: new Date() } : {}),
      },
    });
    if (status === "DELIVERED") await prisma.riderLocation.deleteMany({ where: { orderId: order.id } });
    await addEvent(prisma, order.id, status, note ? `${STATUS_MESSAGES[status]} ${note}` : STATUS_MESSAGES[status] ?? status, actorOf(req));
    if (STATUS_MESSAGES[status]) await notifyOrder(order, "Order update", STATUS_MESSAGES[status]!);
    res.json({ ok: true });
  }),
);

adminRouter.post(
  "/orders/:number/mark-paid",
  ah(async (req, res) => {
    const { reference } = z.object({ reference: z.string().trim().max(80).optional() }).parse(req.body ?? {});
    const order = await prisma.order.findUnique({ where: { number: req.params.number } });
    if (!order) throw notFound("Order");
    if (order.status !== "AWAITING_PAYMENT") throw badRequest("Only orders awaiting payment can be marked as paid.");
    await markOrderPaid(order.id, reference ?? null, actorOf(req));
    res.json({ ok: true });
  }),
);

adminRouter.post(
  "/orders/:number/refunded",
  ah(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { number: req.params.number } });
    if (!order || order.paymentStatus !== "REFUND_PENDING") throw badRequest("No pending refund on this order.");
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "REFUNDED" } });
    await addEvent(prisma, order.id, "REFUNDED", "Refund completed.", actorOf(req));
    await notifyOrder(order, "Refund completed", "Your refund has been processed. It may take 2–5 working days to reflect in your account.");
    res.json({ ok: true });
  }),
);

adminRouter.get(
  "/orders/:number/payment-proof",
  ah(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { number: req.params.number } });
    await sendPrivateFile(res, order?.proofFilePath, `receipt-${req.params.number}`);
  }),
);

/* ---------- Prescriptions ---------- */

adminRouter.get(
  "/prescriptions",
  ah(async (req, res) => {
    const status = z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING").parse(req.query.status ?? "PENDING");
    const list = await prisma.prescription.findMany({
      where: { status },
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      take: 100,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        orders: { include: { items: true } },
      },
    });
    res.json({
      prescriptions: list.map((p) => ({
        ...serializePrescription(p),
        customer: p.user,
        orders: p.orders.map((o) => ({
          number: o.number,
          status: o.status,
          items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, rxStatus: i.rxStatus })),
        })),
      })),
    });
  }),
);

adminRouter.post(
  "/prescriptions/:id/review",
  ah(async (req, res) => {
    const body = z
      .object({
        decision: z.enum(["APPROVED", "REJECTED"]),
        note: z.string().trim().max(500).optional(),
        validDays: z.coerce.number().int().min(1).max(365).default(180),
      })
      .parse(req.body);
    if (body.decision === "REJECTED" && !body.note) throw badRequest("Please tell the customer why the prescription was rejected.");
    const rx = await prisma.prescription.findUnique({ where: { id: req.params.id }, include: { orders: true, user: true } });
    if (!rx) throw notFound("Prescription");
    if (rx.status !== "PENDING") throw badRequest("This prescription has already been reviewed.");

    await prisma.prescription.update({
      where: { id: rx.id },
      data: {
        status: body.decision,
        reviewerNote: body.note || null,
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
        validUntil: body.decision === "APPROVED" ? new Date(Date.now() + body.validDays * DAY) : null,
      },
    });

    for (const order of rx.orders.filter((o) => o.status === "AWAITING_RX_REVIEW")) {
      if (body.decision === "APPROVED") {
        const next = order.paymentMethod === "PAY_ON_PICKUP" ? "PROCESSING" : "AWAITING_PAYMENT";
        await prisma.order.update({ where: { id: order.id }, data: { status: next } });
        await addEvent(prisma, order.id, "RX_APPROVED", "Prescription approved by our pharmacist.", actorOf(req));
        await notifyOrder(
          order,
          "Prescription approved",
          next === "AWAITING_PAYMENT"
            ? "Good news: your prescription has been approved. Please complete payment so we can prepare your order."
            : "Good news: your prescription has been approved and your order is being prepared.",
        );
      } else {
        await cancelOrder(order.id, `Prescription not accepted: ${body.note}`, actorOf(req));
        await notifyOrder(order, "Prescription not accepted", `We couldn't accept your prescription: ${body.note}. Your order has been cancelled and no payment was taken.`);
      }
    }
    if (!rx.orders.length) {
      await sendMail({
        to: rx.user.email,
        subject: `Your prescription has been ${body.decision === "APPROVED" ? "approved" : "reviewed"}`,
        text: body.decision === "APPROVED" ? "Your prescription is approved and saved to your account for future orders." : `We couldn't accept your prescription: ${body.note}`,
      });
    }
    res.json({ ok: true });
  }),
);

adminRouter.get(
  "/prescriptions/:id/file",
  ah(async (req, res) => {
    const p = await prisma.prescription.findUnique({ where: { id: req.params.id } });
    await sendPrivateFile(res, p?.filePath, p?.originalName);
  }),
);

/* ---------- Verifications ---------- */

adminRouter.get(
  "/verifications",
  ah(async (req, res) => {
    const status = z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING").parse(req.query.status ?? "PENDING");
    const list = await prisma.verification.findMany({
      where: { status },
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      take: 100,
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
    });
    res.json({ verifications: list.map((v) => ({ ...serializeVerification(v), customer: v.user, hasLicense: !!v.licensePath })) });
  }),
);

adminRouter.post(
  "/verifications/:id/review",
  ah(async (req, res) => {
    const body = z.object({ decision: z.enum(["APPROVED", "REJECTED"]), note: z.string().trim().max(500).optional() }).parse(req.body);
    if (body.decision === "REJECTED" && !body.note) throw badRequest("Please give the customer a reason.");
    const v = await prisma.verification.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!v) throw notFound("Verification");
    if (v.status !== "PENDING") throw badRequest("Already reviewed.");
    await prisma.$transaction([
      prisma.verification.update({
        where: { id: v.id },
        data: { status: body.decision, reviewerNote: body.note || null, reviewedById: req.user!.id, reviewedAt: new Date() },
      }),
      prisma.user.update({ where: { id: v.userId }, data: { verificationStatus: body.decision } }),
    ]);
    await sendMail({
      to: v.user.email,
      subject: body.decision === "APPROVED" ? "Your account is verified" : "Action needed on your verification",
      text: body.decision === "APPROVED"
        ? "Your identity has been verified. You can now order controlled medicines with a valid prescription."
        : `We couldn't verify your account: ${body.note}. You can submit new documents from your account.`,
    });
    res.json({ ok: true });
  }),
);

adminRouter.get(
  "/verifications/:id/:doc(id|license)",
  ah(async (req, res) => {
    const v = await prisma.verification.findUnique({ where: { id: req.params.id } });
    await sendPrivateFile(res, req.params.doc === "id" ? v?.idFilePath : v?.licensePath);
  }),
);

/* ---------- Products & inventory ---------- */

adminRouter.get(
  "/products",
  ah(async (req, res) => {
    const f = z
      .object({
        q: z.string().trim().optional(),
        category: z.string().optional(),
        rx: z.enum(["OTC", "POM", "CONTROLLED"]).optional(),
        stock: z.enum(["never"]).optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
      .parse(req.query);
    const where: Prisma.ProductWhereInput = {
      ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { genericName: { contains: f.q, mode: "insensitive" } }, { brand: { contains: f.q, mode: "insensitive" } }] } : {}),
      ...(f.category ? { category: { slug: f.category } } : {}),
      ...(f.rx ? { rxStatus: f.rx } : {}),
      ...(f.stock === "never" ? { batches: { none: {} }, soldCount: 0 } : {}),
    };
    const pageSize = 30;
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({ where, include: { category: true, batches: true }, orderBy: { name: "asc" }, skip: (f.page - 1) * pageSize, take: pageSize }),
    ]);
    res.json({
      products: products.map((p) => ({ ...serializeProduct(p), active: p.active, stock: stockOf(p) })),
      total,
      page: f.page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    });
  }),
);

adminRouter.get(
  "/products/:id",
  ah(async (req, res) => {
    const p = await prisma.product.findUnique({ where: { id: req.params.id }, include: { category: true, batches: { orderBy: { expiresAt: "asc" } } } });
    if (!p) throw notFound("Product");
    res.json({ product: { ...p, stock: stockOf(p) } });
  }),
);

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  genericName: z.string().trim().min(2).max(120),
  brand: z.string().trim().min(1).max(80),
  manufacturer: z.string().trim().max(120).optional().nullable(),
  strength: z.string().trim().max(60).optional().nullable(),
  dosageForm: z.string().trim().min(2).max(40),
  packSize: z.string().trim().min(2).max(60),
  priceKobo: z.coerce.number().int().positive(),
  compareAtKobo: z.coerce.number().int().positive().optional().nullable(),
  categorySlug: z.string(),
  rxStatus: z.enum(["OTC", "POM", "CONTROLLED"]),
  coldChain: z.boolean().default(false),
  description: z.string().trim().min(10).max(4000),
  usage: z.string().trim().min(5).max(2000),
  warnings: z.string().trim().min(5).max(2000),
  storage: z.string().trim().max(300).optional(),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

adminRouter.post(
  "/products",
  ah(async (req, res) => {
    const { categorySlug, ...data } = productSchema.parse(req.body);
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) throw badRequest("Unknown category");
    let slug = slugify(`${data.name} ${data.strength ?? ""}`);
    if (await prisma.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const product = await prisma.product.create({ data: { ...data, slug, categoryId: category.id } });
    res.status(201).json({ product });
  }),
);

adminRouter.put(
  "/products/:id",
  ah(async (req, res) => {
    const { categorySlug, ...data } = productSchema.parse(req.body);
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) throw badRequest("Unknown category");
    const product = await prisma.product.update({ where: { id: req.params.id }, data: { ...data, categoryId: category.id } });
    res.json({ product });
  }),
);

adminRouter.post(
  "/products/:id/batches",
  ah(async (req, res) => {
    const data = z
      .object({ batchNumber: z.string().trim().min(1).max(40), expiresAt: z.coerce.date(), quantity: z.coerce.number().int().min(1).max(100000) })
      .parse(req.body);
    if (data.expiresAt.getTime() < Date.now() + 30 * DAY) throw badRequest("Batches must have at least 30 days of shelf life remaining.");
    const batch = await prisma.batch.create({ data: { ...data, productId: req.params.id } });
    res.status(201).json({ batch });
  }),
);

adminRouter.post(
  "/batches/:id/status",
  ah(async (req, res) => {
    const { status } = z.object({ status: z.enum(["ACTIVE", "QUARANTINED", "RECALLED"]) }).parse(req.body);
    const batch = await prisma.batch.update({ where: { id: req.params.id }, data: { status } });
    res.json({ batch });
  }),
);

adminRouter.get(
  "/inventory",
  ah(async (_req, res) => {
    const products = await prisma.product.findMany({ where: { active: true }, include: { category: true, batches: true } });
    const soon = Date.now() + 90 * DAY;
    // Fast sellers first among equal stock, so the most urgent reorders top the list.
    const lowStock = products
      .filter(isLowStock)
      .map((p) => ({ id: p.id, name: p.name, packSize: p.packSize, stock: stockOf(p), soldCount: p.soldCount }))
      .sort((a, b) => a.stock - b.stock || b.soldCount - a.soldCount);
    const neverStocked = products.filter((p) => !hasEverStocked(p)).length;
    const expiring = products
      .flatMap((p) => p.batches.map((b) => ({ ...b, productName: p.name, productId: p.id })))
      .filter((b) => b.status === "ACTIVE" && b.quantity > 0 && b.expiresAt.getTime() < soon)
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())
      .map((b) => ({ id: b.id, productId: b.productId, productName: b.productName, batchNumber: b.batchNumber, quantity: b.quantity, expiresAt: b.expiresAt, expired: b.expiresAt.getTime() < Date.now() }));
    res.json({ lowStock, neverStocked, threshold: LOW_STOCK_THRESHOLD, expiring });
  }),
);

/* ---------- Customers & messages ---------- */

adminRouter.get(
  "/customers",
  ah(async (req, res) => {
    const q = z.string().trim().optional().parse(req.query.q);
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER", ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }] } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { orders: { select: { totalKobo: true, paymentStatus: true } } },
    });
    res.json({
      customers: customers.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        phone: c.phone,
        verificationStatus: c.verificationStatus,
        orders: c.orders.length,
        spentKobo: c.orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.totalKobo, 0),
        createdAt: c.createdAt,
      })),
    });
  }),
);

adminRouter.get(
  "/messages",
  ah(async (_req, res) => {
    res.json({ messages: await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 }) });
  }),
);

adminRouter.post(
  "/messages/:id/handled",
  ah(async (req, res) => {
    await prisma.contactMessage.update({ where: { id: req.params.id }, data: { handled: true } });
    res.json({ ok: true });
  }),
);

/* ---------- Staff & roles (permission: staff.manage, enforced by ACCESS_RULES above) ---------- */
adminRouter.use(staffRouter);
