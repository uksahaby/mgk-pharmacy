import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ah, badRequest, notFound } from "../lib/errors";
import { publicUser, requireAuth } from "../lib/auth";
import { sendPrivateFile, upload } from "../lib/uploads";
import { can, NIGERIAN_STATES } from "../lib/constants";
import { phoneSchema } from "./auth";

export const accountRouter = Router();
accountRouter.use(["/account", "/prescriptions", "/verification"], requireAuth);

/* ---------- Overview ---------- */

accountRouter.get(
  "/account/overview",
  ah(async (req, res) => {
    const userId = req.user!.id;
    const [orders, prescriptions, verification, addresses] = await Promise.all([
      prisma.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 3, include: { items: true } }),
      prisma.prescription.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 3 }),
      prisma.verification.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.address.count({ where: { userId } }),
    ]);
    const activeOrders = await prisma.order.count({
      where: { userId, status: { notIn: ["DELIVERED", "COMPLETED", "CANCELLED"] } },
    });
    res.json({
      user: req.user,
      activeOrders,
      recentOrders: orders.map((o) => ({
        number: o.number,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalKobo: o.totalKobo,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        createdAt: o.createdAt,
      })),
      prescriptions: prescriptions.map(serializePrescription),
      verification: verification ? serializeVerification(verification) : null,
      addressCount: addresses,
    });
  }),
);

/* ---------- Profile ---------- */

accountRouter.patch(
  "/account/profile",
  ah(async (req, res) => {
    const data = z
      .object({
        firstName: z.string().trim().min(1).max(60),
        lastName: z.string().trim().min(1).max(60),
        phone: phoneSchema,
        marketingOptIn: z.boolean().optional(),
      })
      .parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user!.id }, data });
    res.json({ user: publicUser(user) });
  }),
);

/* ---------- Addresses ---------- */

const addressSchema = z.object({
  label: z.string().trim().max(30).default("Home"),
  fullName: z.string().trim().min(2, "Required").max(120),
  phone: phoneSchema,
  line1: z.string().trim().min(3, "Enter your street address").max(160),
  line2: z.string().trim().max(160).optional().nullable(),
  city: z.string().trim().min(2, "Required").max(80),
  state: z.enum(NIGERIAN_STATES, { errorMap: () => ({ message: "Choose a state" }) }),
  landmark: z.string().trim().max(160).optional().nullable(),
  isDefault: z.boolean().optional(),
});

accountRouter.get(
  "/account/addresses",
  ah(async (req, res) => {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    res.json({ addresses });
  }),
);

accountRouter.post(
  "/account/addresses",
  ah(async (req, res) => {
    const data = addressSchema.parse(req.body);
    const userId = req.user!.id;
    const count = await prisma.address.count({ where: { userId } });
    if (count >= 10) throw badRequest("You can save up to 10 addresses.");
    const isDefault = data.isDefault || count === 0;
    const address = await prisma.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.create({ data: { ...data, userId, isDefault } });
    });
    res.status(201).json({ address });
  }),
);

accountRouter.put(
  "/account/addresses/:id",
  ah(async (req, res) => {
    const data = addressSchema.parse(req.body);
    const userId = req.user!.id;
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound("Address");
    const address = await prisma.$transaction(async (tx) => {
      if (data.isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.update({ where: { id: existing.id }, data: { ...data, isDefault: data.isDefault ?? existing.isDefault } });
    });
    res.json({ address });
  }),
);

accountRouter.delete(
  "/account/addresses/:id",
  ah(async (req, res) => {
    const userId = req.user!.id;
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound("Address");
    await prisma.address.delete({ where: { id: existing.id } });
    if (existing.isDefault) {
      const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
      if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    res.json({ ok: true });
  }),
);

/* ---------- Prescriptions ---------- */

export function serializePrescription(p: {
  id: string; patientName: string; prescriberName: string | null; facility: string | null; issuedOn: Date | null;
  originalName: string; mimeType: string; notes: string | null; status: string; reviewerNote: string | null;
  reviewedAt: Date | null; validUntil: Date | null; createdAt: Date;
}) {
  return {
    id: p.id,
    patientName: p.patientName,
    prescriberName: p.prescriberName,
    facility: p.facility,
    issuedOn: p.issuedOn,
    originalName: p.originalName,
    mimeType: p.mimeType,
    notes: p.notes,
    status: p.status,
    reviewerNote: p.reviewerNote,
    reviewedAt: p.reviewedAt,
    validUntil: p.validUntil,
    expired: !!p.validUntil && p.validUntil < new Date(),
    createdAt: p.createdAt,
  };
}

accountRouter.get(
  "/prescriptions",
  ah(async (req, res) => {
    const list = await prisma.prescription.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } });
    res.json({ prescriptions: list.map(serializePrescription) });
  }),
);

accountRouter.post(
  "/prescriptions",
  upload.single("file"),
  ah(async (req, res) => {
    if (!req.file) throw badRequest("Please attach a photo or PDF of your prescription.");
    const data = z
      .object({
        patientName: z.string().trim().min(2, "Enter the patient's name").max(120),
        prescriberName: z.string().trim().max(120).optional(),
        facility: z.string().trim().max(160).optional(),
        issuedOn: z.coerce.date().optional(),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(req.body);
    const p = await prisma.prescription.create({
      data: {
        userId: req.user!.id,
        patientName: data.patientName,
        prescriberName: data.prescriberName || null,
        facility: data.facility || null,
        issuedOn: data.issuedOn ?? null,
        notes: data.notes || null,
        filePath: req.file.filename,
        originalName: req.file.originalname.slice(0, 120),
        mimeType: req.file.mimetype,
      },
    });
    res.status(201).json({ prescription: serializePrescription(p) });
  }),
);

accountRouter.get(
  "/prescriptions/:id/file",
  ah(async (req, res) => {
    const p = await prisma.prescription.findUnique({ where: { id: req.params.id } });
    if (!p || (p.userId !== req.user!.id && !can(req.user!.role, "prescriptions.review"))) throw notFound("Prescription");
    await sendPrivateFile(res, p.filePath, p.originalName);
  }),
);

/* ---------- Identity verification ---------- */

export function serializeVerification(v: {
  id: string; type: string; idType: string; licenseNumber: string | null; status: string; reviewerNote: string | null;
  reviewedAt: Date | null; createdAt: Date;
}) {
  return {
    id: v.id,
    type: v.type,
    idType: v.idType,
    licenseNumber: v.licenseNumber,
    status: v.status,
    reviewerNote: v.reviewerNote,
    reviewedAt: v.reviewedAt,
    createdAt: v.createdAt,
  };
}

accountRouter.get(
  "/verification",
  ah(async (req, res) => {
    const list = await prisma.verification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } });
    res.json({ status: req.user!.verificationStatus, history: list.map(serializeVerification) });
  }),
);

accountRouter.post(
  "/verification",
  upload.fields([{ name: "idDocument", maxCount: 1 }, { name: "license", maxCount: 1 }]),
  ah(async (req, res) => {
    const user = req.user!;
    if (user.verificationStatus === "PENDING") throw badRequest("Your verification is already being reviewed.");
    if (user.verificationStatus === "APPROVED") throw badRequest("Your account is already verified.");
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const idDoc = files?.idDocument?.[0];
    const license = files?.license?.[0];
    const data = z
      .object({
        type: z.enum(["PATIENT", "DOCTOR", "PHARMACIST"]),
        idType: z.enum(["NIN", "DRIVERS_LICENCE", "PASSPORT", "VOTERS_CARD"]),
        licenseNumber: z.string().trim().max(40).optional(),
        consent: z.literal("true", { errorMap: () => ({ message: "Please confirm the declaration" }) }),
      })
      .parse(req.body);
    if (!idDoc) throw badRequest("Please upload a photo of your government-issued ID.");
    const professional = data.type !== "PATIENT";
    if (professional && (!license || !data.licenseNumber)) {
      throw badRequest(`Please provide your ${data.type === "DOCTOR" ? "MDCN" : "PCN"} licence number and a copy of the licence.`);
    }
    await prisma.$transaction([
      prisma.verification.create({
        data: {
          userId: user.id,
          type: data.type,
          idType: data.idType,
          idFilePath: idDoc.filename,
          licenseNumber: professional ? data.licenseNumber : null,
          licensePath: professional ? license?.filename : null,
        },
      }),
      prisma.user.update({ where: { id: user.id }, data: { verificationStatus: "PENDING" } }),
    ]);
    res.status(201).json({ ok: true, status: "PENDING" });
  }),
);
