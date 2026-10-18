import crypto from "crypto";
import { Router, type Request } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ah, badRequest, HttpError, notFound } from "../lib/errors";
import { env } from "../lib/env";
import { sendMail } from "../lib/mailer";
import { permissionsFor, ROLE_INFO, ROLES, type Role } from "../lib/constants";
import { phoneSchema } from "./auth";

/** Staff & role management. Mounted inside the admin router, which already requires the "staff.manage" permission. */
export const staffRouter = Router();

const SAFE_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Readable one-time password such as "k7Rp-2mXq-9vTw" (always contains letters and digits). */
function temporaryPassword() {
  const group = () => Array.from({ length: 4 }, () => SAFE_CHARS[crypto.randomInt(SAFE_CHARS.length)]).join("");
  let pw = "";
  do pw = `${group()}-${group()}-${group()}`;
  while (!/[a-z]/i.test(pw) || !/\d/.test(pw));
  return pw;
}

const actorName = (req: Request) => `${req.user!.firstName} ${req.user!.lastName}`;

async function audit(req: Request, action: string, summary: string, targetId?: string) {
  await prisma.auditLog.create({ data: { actorId: req.user!.id, actorName: actorName(req), action, summary, targetId } });
}

const serializeUser = (u: Prisma.UserGetPayload<object>) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  phone: u.phone,
  role: u.role,
  active: u.active,
  mustChangePassword: u.mustChangePassword,
  lastLoginAt: u.lastLoginAt,
  createdAt: u.createdAt,
});

/** Guards against locking everyone out: there must always be at least one other active administrator. */
async function assertAnotherActiveAdmin(excludingId: string) {
  const others = await prisma.user.count({ where: { role: "ADMIN", active: true, id: { not: excludingId } } });
  if (others === 0) throw badRequest("This is the last active administrator. Make someone else an administrator first.");
}

staffRouter.get(
  "/roles",
  ah(async (_req, res) => {
    const counts = await prisma.user.groupBy({ by: ["role"], where: { active: true }, _count: true });
    res.json({
      roles: ROLES.map((r) => ({
        role: r,
        ...ROLE_INFO[r],
        permissions: permissionsFor(r),
        activeUsers: counts.find((c) => c.role === r)?._count ?? 0,
      })),
    });
  }),
);

staffRouter.get(
  "/users",
  ah(async (req, res) => {
    const f = z
      .object({
        q: z.string().trim().optional(),
        // "" means everyone (including customers); "STAFF" means every non-customer role.
        role: z.enum(ROLES).or(z.literal("STAFF")).or(z.literal("")).optional(),
        status: z.enum(["active", "inactive"]).or(z.literal("")).optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
      .parse(req.query);
    const where: Prisma.UserWhereInput = {
      ...(f.role === "STAFF" ? { role: { not: "CUSTOMER" } } : f.role ? { role: f.role } : {}),
      ...(f.status ? { active: f.status === "active" } : {}),
      ...(f.q ? { OR: [{ email: { contains: f.q, mode: "insensitive" } }, { firstName: { contains: f.q, mode: "insensitive" } }, { lastName: { contains: f.q, mode: "insensitive" } }, { phone: { contains: f.q, mode: "insensitive" } }] } : {}),
    };
    const pageSize = 30;
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, orderBy: [{ active: "desc" }, { role: "asc" }, { firstName: "asc" }], skip: (f.page - 1) * pageSize, take: pageSize }),
    ]);
    res.json({ users: users.map(serializeUser), total, page: f.page, pageCount: Math.max(1, Math.ceil(total / pageSize)) });
  }),
);

const createSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(60),
  lastName: z.string().trim().min(1, "Required").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: phoneSchema,
  role: z.enum(ROLES),
});

staffRouter.post(
  "/users",
  ah(async (req, res) => {
    const data = createSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new HttpError(409, `${existing.firstName} ${existing.lastName} already has an account with this email (${ROLE_INFO[existing.role as Role].label}). Change their role from the list instead.`, { existingId: existing.id });
    }
    const tempPassword = temporaryPassword();
    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash: await bcrypt.hash(tempPassword, 12),
        mustChangePassword: true,
        verificationStatus: data.role === "CUSTOMER" ? "UNVERIFIED" : "APPROVED",
      },
    });
    await audit(req, "USER_CREATED", `Created ${data.firstName} ${data.lastName} (${data.email}) as ${ROLE_INFO[data.role].label}`, user.id);
    // The temporary password is shown once to the admin, who passes it on in person; it is never emailed.
    await sendMail({
      to: user.email,
      subject: "Your MGK Pharmacy account",
      text: `Hi ${user.firstName},\n\n${actorName(req)} has created a ${ROLE_INFO[data.role].label} account for you.\nSign in at ${env.webOrigin}/login with this email and the temporary password they give you. You'll be asked to choose your own password straight away.\n\nMGK Pharmacy`,
    });
    res.status(201).json({ user: serializeUser(user), tempPassword });
  }),
);

staffRouter.patch(
  "/users/:id",
  ah(async (req, res) => {
    const body = z.object({ role: z.enum(ROLES).optional(), active: z.boolean().optional() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw notFound("User");
    const isSelf = user.id === req.user!.id;
    const roleChanging = body.role !== undefined && body.role !== user.role;
    const deactivating = body.active === false && user.active;

    if (isSelf && (roleChanging || deactivating)) throw badRequest("You can't change your own role or deactivate yourself. Ask another administrator.");
    if (user.role === "ADMIN" && user.active && ((roleChanging && body.role !== "ADMIN") || deactivating)) await assertAnotherActiveAdmin(user.id);
    if (user.role === "RIDER" && (roleChanging || deactivating)) {
      const onTheRoad = await prisma.order.count({ where: { riderId: user.id, status: "DISPATCHED" } });
      if (onTheRoad) throw badRequest(`${user.firstName} has ${onTheRoad} delivery(ies) in progress. Wait until they're delivered.`);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(roleChanging ? { role: body.role } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(roleChanging && body.role !== "CUSTOMER" ? { verificationStatus: "APPROVED" } : {}),
        // Any change in access signs the user out so it takes effect immediately.
        ...(roleChanging || deactivating ? { sessionVersion: { increment: 1 } } : {}),
      },
    });
    const name = `${user.firstName} ${user.lastName}`;
    if (roleChanging) await audit(req, "ROLE_CHANGED", `Changed ${name} from ${ROLE_INFO[user.role as Role].label} to ${ROLE_INFO[body.role!].label}`, user.id);
    if (body.active !== undefined && body.active !== user.active) {
      await audit(req, body.active ? "USER_REACTIVATED" : "USER_DEACTIVATED", `${body.active ? "Reactivated" : "Deactivated"} ${name}`, user.id);
    }
    res.json({ user: serializeUser(updated) });
  }),
);

staffRouter.post(
  "/users/:id/reset-password",
  ah(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw notFound("User");
    if (user.id === req.user!.id) throw badRequest("Change your own password from your profile page.");
    const tempPassword = temporaryPassword();
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(tempPassword, 12), mustChangePassword: true, sessionVersion: { increment: 1 } },
    });
    await audit(req, "PASSWORD_RESET", `Reset the password for ${user.firstName} ${user.lastName}`, user.id);
    res.json({ tempPassword });
  }),
);

staffRouter.get(
  "/audit",
  ah(async (_req, res) => {
    res.json({ entries: await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }) });
  }),
);
