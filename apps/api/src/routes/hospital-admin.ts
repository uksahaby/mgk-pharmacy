import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ah, badRequest, notFound } from "../lib/errors";
import { stockOf } from "../lib/catalog";
import { addEvent, allocateStock, generateOrderNumber, newAccessKey } from "../lib/orders";
import { hospitalInclude, isOpen, NEEDS_ACTION, serializeForStaff, serializePickable, suggestProducts } from "../lib/hospital";

/**
 * Prescriptions from MGK Care, for pharmacists. Mounted inside the admin router, which requires the
 * "prescriptions.review" permission for every /hospital-prescriptions path.
 */
export const hospitalAdminRouter = Router();

const DAY = 86_400_000;

hospitalAdminRouter.get(
  "/hospital-prescriptions",
  ah(async (req, res) => {
    const f = z.object({ view: z.enum(["open", "done"]).default("open"), q: z.string().trim().max(80).optional() }).parse(req.query);
    const where: Prisma.HospitalPrescriptionWhereInput =
      f.view === "open" ? { ...NEEDS_ACTION } : { NOT: NEEDS_ACTION, prescribedAt: { gte: new Date(Date.now() - 30 * DAY) } };
    if (f.q) {
      where.AND = [
        {
          OR: [
            { firstName: { contains: f.q, mode: "insensitive" } },
            { lastName: { contains: f.q, mode: "insensitive" } },
            { patientMrn: { contains: f.q, mode: "insensitive" } },
          ],
        },
      ];
    }
    const list = await prisma.hospitalPrescription.findMany({
      where,
      include: hospitalInclude,
      // Waiting patients oldest first; finished ones newest first.
      orderBy: { prescribedAt: f.view === "open" ? "asc" : "desc" },
      take: 100,
    });
    res.json({ prescriptions: list.map(serializeForStaff) });
  }),
);

/** Products to pick from when supplying, searched by name, ingredient or brand. */
hospitalAdminRouter.get(
  "/hospital-prescriptions/products",
  ah(async (req, res) => {
    const q = z.string().trim().min(2).max(80).parse(req.query.q);
    const products = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { genericName: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { batches: { where: { status: "ACTIVE" } } },
      orderBy: { name: "asc" },
      take: 30,
    });
    const pickable = products.map(serializePickable).sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
    res.json({ products: pickable.slice(0, 10) });
  }),
);

hospitalAdminRouter.get(
  "/hospital-prescriptions/:id",
  ah(async (req, res) => {
    const rx = await prisma.hospitalPrescription.findUnique({ where: { id: req.params.id }, include: hospitalInclude });
    if (!rx) throw notFound("Prescription");
    const suggestions = Object.fromEntries(
      await Promise.all(rx.items.filter(isOpen).map(async (i) => [i.id, await suggestProducts(i.medicine)] as const)),
    );
    res.json({ prescription: serializeForStaff(rx), suggestions });
  }),
);

const supplySchema = z
  .object({
    supply: z.array(z.object({ itemId: z.string(), productId: z.string(), quantity: z.number().int().min(1).max(50) })).max(60).default([]),
    notSupplied: z.array(z.object({ itemId: z.string(), reason: z.string().trim().min(2, "Give a reason").max(200) })).max(60).default([]),
  })
  .refine((v) => v.supply.length + v.notSupplied.length > 0, { message: "Choose a product, or a reason, for at least one medicine." });

/**
 * Supplies medicines through one pickup order (paid at collection, like any pickup order) and records the
 * medicines that will not be supplied. Medicines left out stay waiting.
 */
hospitalAdminRouter.post(
  "/hospital-prescriptions/:id/supply",
  ah(async (req, res) => {
    const body = supplySchema.parse(req.body);
    const staff = `${req.user!.firstName} ${req.user!.lastName}`;

    const orderNumber = await prisma.$transaction(async (tx) => {
      const rx = await tx.hospitalPrescription.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!rx) throw notFound("Prescription");
      const ids = [...body.supply.map((s) => s.itemId), ...body.notSupplied.map((n) => n.itemId)];
      if (new Set(ids).size !== ids.length) throw badRequest("Each medicine can only be supplied or declined once.");
      for (const id of ids) {
        const item = rx.items.find((i) => i.id === id);
        if (!item) throw badRequest("That medicine is not on this prescription.");
        if (!isOpen(item)) throw badRequest(`${item.medicine} has already been handled or was cancelled by the doctor. Reload the page.`);
      }

      const now = new Date();
      for (const n of body.notSupplied) {
        await tx.hospitalPrescriptionItem.update({
          where: { id: n.itemId },
          data: { notSuppliedReason: n.reason, handledBy: staff, handledAt: now },
        });
      }
      if (!body.supply.length) return null;

      // One order line per product, even if two prescribed medicines are supplied with the same product.
      const perProduct = new Map<string, number>();
      for (const s of body.supply) perProduct.set(s.productId, (perProduct.get(s.productId) ?? 0) + s.quantity);
      const products = await tx.product.findMany({
        where: { id: { in: [...perProduct.keys()] }, active: true },
        include: { batches: { where: { status: "ACTIVE" } } },
      });
      for (const [productId, quantity] of perProduct) {
        const p = products.find((x) => x.id === productId);
        if (!p) throw badRequest("One of the chosen products is no longer available.");
        const stock = stockOf(p);
        if (stock < quantity) throw badRequest(`${p.name}: only ${stock} in stock, ${quantity} needed.`);
      }

      const subtotalKobo = products.reduce((sum, p) => sum + p.priceKobo * perProduct.get(p.id)!, 0);
      const order = await tx.order.create({
        data: {
          number: generateOrderNumber(),
          accessKey: newAccessKey(),
          email: "",
          phone: rx.phone ?? "",
          firstName: rx.firstName,
          lastName: rx.lastName,
          status: "PROCESSING",
          paymentMethod: "PAY_ON_PICKUP",
          fulfilment: "PICKUP",
          subtotalKobo,
          shippingKobo: 0,
          totalKobo: subtotalKobo,
          notes: [`MGK Care prescription (MRN ${rx.patientMrn})`, rx.prescriberName, rx.clinic, rx.hmo && `HMO: ${rx.hmo}`].filter(Boolean).join(" · "),
          requiresRx: products.some((p) => p.rxStatus !== "OTC"),
        },
      });
      for (const p of products) {
        const quantity = perProduct.get(p.id)!;
        const allocations = await allocateStock(tx, p.id, quantity, p.name);
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: p.id,
            name: p.name,
            packSize: p.packSize,
            rxStatus: p.rxStatus,
            priceKobo: p.priceKobo,
            quantity,
            allocations: JSON.stringify(allocations),
          },
        });
        await tx.product.update({ where: { id: p.id }, data: { soldCount: { increment: quantity } } });
      }
      for (const s of body.supply) {
        await tx.hospitalPrescriptionItem.update({
          where: { id: s.itemId },
          data: { orderId: order.id, productId: s.productId, supplyQuantity: s.quantity, handledBy: staff, handledAt: now },
        });
      }
      await addEvent(tx, order.id, "PLACED", `Prepared from an MGK Care prescription by ${rx.prescriberName}. Pay at collection.`, `staff:${req.user!.firstName}`);
      return order.number;
    });

    res.json({ ok: true, orderNumber });
  }),
);
