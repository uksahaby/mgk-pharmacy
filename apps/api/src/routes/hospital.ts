import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ah, HttpError, notFound } from "../lib/errors";
import { env } from "../lib/env";
import { safeEqual } from "../lib/auth";
import { hospitalInclude, serializeForHospital } from "../lib/hospital";

/**
 * Called by MGK Care's pharmacy link service (mgk-care/apps/worker), never by browsers.
 * Authenticated with the shared HOSPITAL_API_KEY; switched off (404) when that is not set.
 */
export const hospitalRouter = Router();

hospitalRouter.use((req, _res, next) => {
  if (!env.hospitalApiKey) return next(notFound());
  const header = req.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!key || !safeEqual(key, env.hospitalApiKey)) return next(new HttpError(401, "Invalid hospital API key."));
  next();
});

const optionalText = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);

const prescriptionSchema = z.object({
  patient: z.object({
    mrn: z.string().trim().min(1).max(40),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    phone: optionalText(20),
    sex: optionalText(20),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().transform((v) => v ?? null),
  }),
  prescriber: z.string().trim().min(1).max(120),
  clinic: optionalText(120),
  allergies: optionalText(500),
  hmo: optionalText(120),
  pregnancy: z
    .object({
      status: z.enum(["PREGNANT", "NOT_PREGNANT"]),
      weeks: z.number().int().min(0).max(45).nullish().transform((v) => v ?? null),
      basis: z.string().trim().max(120),
      recordedAt: z.coerce.date(),
    })
    .nullish()
    .transform((v) => v ?? null),
  weight: z
    .object({ kg: z.number().positive().max(400), recordedAt: z.coerce.date() })
    .nullish()
    .transform((v) => v ?? null),
  prescribedAt: z.coerce.date(),
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(64),
        medicine: z.string().trim().min(1).max(200),
        dosage: z.string().trim().max(500).default(""),
        quantity: z.number().positive().max(100_000).nullish().transform((v) => v ?? null),
        quantityUnit: optionalText(40),
        quantityText: optionalText(120),
        prescribedAt: z.coerce.date(),
        cancelled: z.boolean().default(false),
      }),
    )
    .max(60),
});

const same = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);
const changed = (current: Record<string, unknown>, next: Record<string, unknown>) => Object.keys(next).some((k) => !same(current[k], next[k]));

/**
 * Creates or updates the prescription for one hospital visit. The hospital always sends every medicine on the visit,
 * including ones the doctor has since cancelled. Records are only written when something changed, so the
 * updates feed below doesn't report the same prescription again and again.
 */
hospitalRouter.put(
  "/prescriptions/:visitId",
  ah(async (req, res) => {
    const visitId = z.string().trim().min(1).max(64).parse(req.params.visitId);
    const body = prescriptionSchema.parse(req.body);
    const header = {
      patientMrn: body.patient.mrn,
      firstName: body.patient.firstName,
      lastName: body.patient.lastName,
      phone: body.patient.phone,
      sex: body.patient.sex,
      birthDate: body.patient.birthDate,
      prescriberName: body.prescriber,
      clinic: body.clinic,
      allergies: body.allergies,
      hmo: body.hmo,
      pregnancyStatus: body.pregnancy?.status ?? null,
      pregnancyWeeks: body.pregnancy?.weeks ?? null,
      pregnancyBasis: body.pregnancy?.basis ?? null,
      pregnancyRecordedAt: body.pregnancy?.recordedAt ?? null,
      weightKg: body.weight?.kg ?? null,
      weightRecordedAt: body.weight?.recordedAt ?? null,
      prescribedAt: body.prescribedAt,
    };

    await prisma.$transaction(async (tx) => {
      let rx = await tx.hospitalPrescription.findUnique({ where: { visitId }, include: { items: true } });
      if (!rx) rx = await tx.hospitalPrescription.create({ data: { visitId, ...header }, include: { items: true } });
      else if (changed(rx, header)) await tx.hospitalPrescription.update({ where: { id: rx.id }, data: header });

      for (const item of body.items) {
        const data = {
          medicine: item.medicine,
          dosage: item.dosage,
          quantity: item.quantity,
          quantityUnit: item.quantityUnit,
          quantityText: item.quantityText,
          prescribedAt: item.prescribedAt,
          status: item.cancelled ? "CANCELLED" : "ACTIVE",
        };
        const existing = rx.items.find((i) => i.sourceId === item.id);
        if (!existing) {
          const elsewhere = await tx.hospitalPrescriptionItem.findUnique({ where: { sourceId: item.id } });
          if (elsewhere) throw new HttpError(409, `Medicine ${item.id} belongs to another visit.`);
          await tx.hospitalPrescriptionItem.create({ data: { prescriptionId: rx.id, sourceId: item.id, ...data } });
        } else if (changed(existing, data)) {
          await tx.hospitalPrescriptionItem.update({ where: { id: existing.id }, data });
        }
      }
    });

    const saved = await prisma.hospitalPrescription.findUniqueOrThrow({ where: { visitId }, include: hospitalInclude });
    res.json(serializeForHospital(saved));
  }),
);

/** Prescriptions where anything changed since `since`: the prescription, a medicine on it, or the order supplying it. */
hospitalRouter.get(
  "/prescriptions/updates",
  ah(async (req, res) => {
    const since = z.coerce.date().parse(req.query.since);
    const serverTime = new Date();
    const list = await prisma.hospitalPrescription.findMany({
      where: {
        OR: [
          { updatedAt: { gte: since } },
          { items: { some: { updatedAt: { gte: since } } } },
          { items: { some: { order: { updatedAt: { gte: since } } } } },
        ],
      },
      include: hospitalInclude,
      orderBy: { updatedAt: "asc" },
      take: 500,
    });
    res.json({ serverTime, prescriptions: list.map(serializeForHospital) });
  }),
);
