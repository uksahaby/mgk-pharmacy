import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ah, badRequest, forbidden, notFound } from "../lib/errors";
import { requirePermission } from "../lib/auth";
import { env } from "../lib/env";
import { addEvent, notifyOrder } from "../lib/orders";
import { distanceMeters, storeLocation, type LatLng } from "../lib/geo";
import { startOfNigerianDay } from "../lib/time";

export const riderRouter = Router();
riderRouter.use(requirePermission("deliveries.ride"));

async function myDelivery(req: Request) {
  const order = await prisma.order.findUnique({ where: { number: req.params.number } });
  if (!order) throw notFound("Delivery");
  if (order.riderId !== req.user!.id && req.user!.role !== "ADMIN") throw forbidden("This delivery isn't assigned to you.");
  return order;
}

riderRouter.get(
  "/deliveries",
  ah(async (req, res) => {
    // "Delivered today" in the rider app means since midnight in Nigeria, not the last 24 hours.
    const since = startOfNigerianDay();
    const found = await prisma.order.findMany({
      where: { riderId: req.user!.id, OR: [{ status: "DISPATCHED" }, { status: "DELIVERED", deliveredAt: { gte: since } }] },
      include: { items: true, locations: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    // Deliveries in progress oldest first (first dispatched, first delivered); finished ones newest first.
    const time = (d: Date | null) => d?.getTime() ?? 0;
    const orders = [
      ...found.filter((o) => o.status === "DISPATCHED").sort((a, b) => time(a.dispatchedAt) - time(b.dispatchedAt)),
      ...found.filter((o) => o.status === "DELIVERED").sort((a, b) => time(b.deliveredAt) - time(a.deliveredAt)),
    ];
    res.json({
      store: storeLocation(),
      deliveries: orders.map((o) => ({
        number: o.number,
        status: o.status,
        customer: { firstName: o.firstName, lastName: o.lastName, phone: o.phone },
        address: { line1: o.addressLine1, line2: o.addressLine2, city: o.city, state: o.state, landmark: o.landmark },
        destination: o.deliveryLat != null && o.deliveryLng != null ? { lat: o.deliveryLat, lng: o.deliveryLng, source: o.locationSource } : null,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        requiresId: o.items.some((i) => i.rxStatus === "CONTROLLED"),
        notes: o.notes,
        dispatchedAt: o.dispatchedAt,
        deliveredAt: o.deliveredAt,
        lastPing: o.locations[0]?.createdAt ?? null,
      })),
      canSimulate: !env.isProd,
    });
  }),
);

const pointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).max(100).nullable().optional(),
  accuracy: z.number().min(0).max(10_000).nullable().optional(),
});

riderRouter.post(
  "/deliveries/:number/location",
  ah(async (req, res) => {
    const order = await myDelivery(req);
    if (order.status !== "DISPATCHED") return res.json({ ok: false, stopSharing: true });
    const p = pointSchema.parse(req.body);
    if (p.accuracy && p.accuracy > 500) return res.json({ ok: false, reason: "low-accuracy" });
    const last = await prisma.riderLocation.findFirst({ where: { orderId: order.id }, orderBy: { createdAt: "desc" } });
    if (last && Date.now() - last.createdAt.getTime() < 2500) return res.json({ ok: true, throttled: true });
    await prisma.riderLocation.create({
      data: { orderId: order.id, riderId: req.user!.id, lat: p.lat, lng: p.lng, heading: p.heading ?? null, speed: p.speed ?? null, accuracy: p.accuracy ?? null },
    });
    res.json({ ok: true });
  }),
);

riderRouter.post(
  "/deliveries/:number/delivered",
  ah(async (req, res) => {
    const order = await myDelivery(req);
    if (order.status !== "DISPATCHED") throw badRequest("This delivery is not in progress.");
    const { code } = z.object({ code: z.string().trim().regex(/^\d{4}$/, "Enter the 4-digit code from the customer") }).parse(req.body);
    if (code !== order.deliveryCode) throw badRequest("That code doesn't match. Ask the customer to check their order page or SMS.");
    stopSimulation(order.id);
    await prisma.order.update({ where: { id: order.id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
    await addEvent(prisma, order.id, "DELIVERED", "Your order has been delivered. Thank you for choosing us.", `rider:${req.user!.firstName}`);
    // Location history is only kept while the delivery is live.
    await prisma.riderLocation.deleteMany({ where: { orderId: order.id } });
    await notifyOrder(order, "Delivered", "Your order has been delivered. If anything is wrong, let us know within 48 hours.");
    res.json({ ok: true });
  }),
);

/* ---------- Development-only drive simulator ---------- */

const simulations = new Map<string, NodeJS.Timeout>();
function stopSimulation(orderId: string) {
  const t = simulations.get(orderId);
  if (t) clearInterval(t);
  simulations.delete(orderId);
}

/** Simulates a rider riding from the pharmacy to the customer over ~90 seconds, with a little wobble. */
riderRouter.post(
  "/deliveries/:number/simulate",
  ah(async (req, res) => {
    if (env.isProd) throw forbidden("Simulation is disabled in production.");
    const order = await myDelivery(req);
    if (order.status !== "DISPATCHED") throw badRequest("Dispatch the order first.");
    if (order.deliveryLat == null || order.deliveryLng == null) throw badRequest("This order has no delivery location yet.");
    stopSimulation(order.id);
    await prisma.riderLocation.deleteMany({ where: { orderId: order.id } });

    const from = storeLocation();
    const to: LatLng = { lat: order.deliveryLat, lng: order.deliveryLng };
    // A two-leg path (along one axis, then the other) looks more like real streets than a straight line.
    const corner: LatLng = { lat: from.lat + (to.lat - from.lat) * 0.15, lng: to.lng - (to.lng - from.lng) * 0.1 };
    const steps = 45;
    const legSplit = Math.round(steps * (distanceMeters(from, corner) / (distanceMeters(from, corner) + distanceMeters(corner, to))));
    let i = 0;
    const tick = async () => {
      i++;
      const [a, b, t] = i <= legSplit ? [from, corner, i / Math.max(1, legSplit)] : [corner, to, (i - legSplit) / Math.max(1, steps - legSplit)];
      const wobble = i < steps ? (Math.random() - 0.5) * 0.00015 : 0;
      const lat = a.lat + (b.lat - a.lat) * t + wobble;
      const lng = a.lng + (b.lng - a.lng) * t + wobble;
      const heading = (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
      await prisma.riderLocation.create({ data: { orderId: order.id, riderId: order.riderId!, lat, lng, heading: (heading + 360) % 360, speed: 7, accuracy: 8 } }).catch(() => null);
      if (i >= steps) stopSimulation(order.id);
    };
    await tick();
    simulations.set(order.id, setInterval(() => void tick(), 2000));
    res.json({ ok: true, seconds: steps * 2 });
  }),
);
