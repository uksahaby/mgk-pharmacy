import type { Batch, HospitalPrescription, HospitalPrescriptionItem, Order, Prisma, Product } from "@prisma/client";
import { prisma } from "./prisma";
import { stockOf } from "./catalog";

/**
 * Prescriptions sent by MGK Care, the hospital system. The hospital sends what the doctor prescribed; pharmacists
 * supply each medicine through a normal pickup order (so stock, payment and collection work as for any order) or
 * record why it was not supplied. The hospital reads back what happened to each medicine.
 */

export type HospitalItem = HospitalPrescriptionItem & { order: Order | null; product: Product | null };
export type FullHospitalPrescription = HospitalPrescription & { items: HospitalItem[] };

export const hospitalInclude = {
  items: { include: { order: true, product: true }, orderBy: { prescribedAt: "asc" } },
} satisfies Prisma.HospitalPrescriptionInclude;

/** Items the pharmacy has not acted on yet. */
export const OPEN_ITEM: Prisma.HospitalPrescriptionItemWhereInput = { status: "ACTIVE", orderId: null, notSuppliedReason: null };

export const isOpen = (i: HospitalPrescriptionItem) => i.status === "ACTIVE" && !i.orderId && !i.notSuppliedReason;

/** Medicines the doctor cancelled after they were put on an order that is still to be collected. */
export const CANCELLED_AFTER_SUPPLY: Prisma.HospitalPrescriptionItemWhereInput = {
  status: "CANCELLED",
  order: { status: { notIn: ["CANCELLED", "COMPLETED"] } },
};

/** Prescriptions a pharmacist has to act on: something to supply, or a change to check. */
export const NEEDS_ACTION: Prisma.HospitalPrescriptionWhereInput = { items: { some: { OR: [OPEN_ITEM, CANCELLED_AFTER_SUPPLY] } } };

/**
 * Where a prescribed medicine stands, as reported to the hospital:
 * WAITING (not handled yet), PREPARING (on an order, not collected), READY (ready for collection),
 * DISPENSED (collected), NOT_SUPPLIED (with a reason) or CANCELLED (by the prescriber before anything was supplied).
 */
export function itemState(i: HospitalItem): { state: string; reason?: string; at?: Date } {
  if (i.order) {
    if (i.order.status === "COMPLETED") return { state: "DISPENSED", at: i.order.paidAt ?? i.order.updatedAt };
    if (i.order.status === "CANCELLED") return { state: "NOT_SUPPLIED", reason: "The pharmacy order was cancelled", at: i.order.cancelledAt ?? undefined };
    return { state: i.order.status === "READY_FOR_PICKUP" ? "READY" : "PREPARING" };
  }
  if (i.status === "CANCELLED") return { state: "CANCELLED" };
  if (i.notSuppliedReason) return { state: "NOT_SUPPLIED", reason: i.notSuppliedReason, at: i.handledAt ?? undefined };
  return { state: "WAITING" };
}

/** The doctor cancelled a medicine that is already on a pharmacy order: the pharmacist must check before handing over. */
export const cancelledAfterSupply = (i: HospitalItem) =>
  i.status === "CANCELLED" && !!i.order && !["CANCELLED", "COMPLETED"].includes(i.order.status);

/** What the hospital system reads back. */
export function serializeForHospital(p: FullHospitalPrescription) {
  return {
    visitId: p.visitId,
    items: p.items.map((i) => {
      const s = itemState(i);
      return {
        id: i.sourceId,
        state: s.state,
        reason: s.reason ?? null,
        at: s.at ?? null,
        product: i.product && i.orderId ? { name: i.product.name, strength: i.product.strength, packSize: i.product.packSize } : null,
        quantity: i.orderId ? i.supplyQuantity : null,
        orderNumber: i.order?.number ?? null,
        paid: i.order?.paymentStatus === "PAID",
      };
    }),
  };
}

export function ageOf(birthDate: string | null, now = new Date()) {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

/** What pharmacists see. */
export function serializeForStaff(p: FullHospitalPrescription) {
  return {
    id: p.id,
    patient: {
      firstName: p.firstName,
      lastName: p.lastName,
      mrn: p.patientMrn,
      phone: p.phone,
      sex: p.sex,
      age: ageOf(p.birthDate),
    },
    prescriberName: p.prescriberName,
    clinic: p.clinic,
    allergies: p.allergies,
    hmo: p.hmo,
    prescribedAt: p.prescribedAt,
    openCount: p.items.filter(isOpen).length,
    alerts: p.items
      .filter(cancelledAfterSupply)
      .map((i) => `The doctor cancelled ${i.medicine} after it was added to order ${i.order!.number}. Check with the patient before handing it over.`),
    items: p.items.map((i) => ({
      id: i.id,
      medicine: i.medicine,
      dosage: i.dosage,
      quantity: i.quantity,
      quantityUnit: i.quantityUnit,
      quantityText: i.quantityText,
      cancelled: i.status === "CANCELLED",
      open: isOpen(i),
      ...itemState(i),
      supplied: i.orderId && i.product ? { name: i.product.name, packSize: i.product.packSize, quantity: i.supplyQuantity } : null,
      orderNumber: i.order?.number ?? null,
      handledBy: i.handledBy,
    })),
  };
}

// Words in a prescribed medicine's name that say nothing about which product it is.
const NOT_INGREDIENTS = new Set([
  "tablet", "tablets", "capsule", "capsules", "injection", "syrup", "suspension", "cream", "drops", "ointment", "pessary",
  "inhaler", "mouthwash", "modified", "release", "dispersible", "solution", "oral", "vial", "with", "plus",
]);

/** The first ingredient word of a prescribed medicine, e.g. "artemether" for "Artemether/lumefantrine 80/480 mg tablet". */
export function ingredientKeyword(medicine: string) {
  return medicine
    .toLowerCase()
    .split(/[^a-z]+/)
    .find((w) => w.length > 3 && !NOT_INGREDIENTS.has(w));
}

type ProductWithBatches = Product & { batches: Batch[] };

export function serializePickable(p: ProductWithBatches) {
  return {
    id: p.id,
    name: p.name,
    genericName: p.genericName,
    strength: p.strength,
    dosageForm: p.dosageForm,
    packSize: p.packSize,
    priceKobo: p.priceKobo,
    rxStatus: p.rxStatus,
    stock: stockOf(p),
  };
}

/**
 * Products that probably match a prescribed medicine: same ingredient, in stock first, then matching strength.
 * `strengthMatch` says whether the product's strength appears in the prescription, e.g. "500mg" for "Amoxicillin 500 mg capsule".
 */
export async function suggestProducts(medicine: string) {
  const keyword = ingredientKeyword(medicine);
  if (!keyword) return [];
  const products = await prisma.product.findMany({
    where: {
      active: true,
      OR: [{ genericName: { contains: keyword, mode: "insensitive" } }, { name: { contains: keyword, mode: "insensitive" } }],
    },
    include: { batches: { where: { status: "ACTIVE" } } },
    take: 20,
  });
  const numbers = new Set(medicine.match(/\d+(\.\d+)?/g) ?? []);
  const strengthMatches = (p: Product) => {
    const own = p.strength?.match(/\d+(\.\d+)?/g) ?? [];
    return own.length > 0 && own.every((n) => numbers.has(n));
  };
  return products
    .map((p) => ({ ...serializePickable(p), strengthMatch: strengthMatches(p) }))
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || Number(b.strengthMatch) - Number(a.strengthMatch) || a.name.localeCompare(b.name))
    .slice(0, 5);
}
