import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ah, HttpError } from "../lib/errors";
import { clearSession, publicUser, requireAuth, setSession } from "../lib/auth";

export const authRouter = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false });

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

// Accepts the ways people actually type numbers ("0803 123 4567", "+234-803-…") and stores E.164.
const phone = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[\s().-]/g, "") : v),
  z
    .string()
    .regex(/^(\+234|234|0)[789][01]\d{8}$/, "Enter a valid Nigerian mobile number, e.g. 0803 123 4567")
    .transform((v) => v.replace(/^(\+234|234|0)/, "+234")),
);

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(60),
  lastName: z.string().trim().min(1, "Required").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone,
  password,
  marketingOptIn: z.boolean().optional().default(false),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms to continue" }) }),
});

authRouter.post(
  "/register",
  authLimiter,
  ah(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new HttpError(409, "An account with this email already exists. Try signing in instead.");
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        marketingOptIn: data.marketingOptIn,
        passwordHash: await bcrypt.hash(data.password, 12),
      },
    });
    const token = setSession(res, user, req);
    res.status(201).json({ user: publicUser(user), token });
  }),
);

// `email` may also be a Nigerian mobile number ("0803 123 4567"); the field name is kept for existing clients.
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(3, "Enter your email or phone number").max(254),
  password: z.string().min(1),
});

async function findLoginUser(identifier: string) {
  if (identifier.includes("@")) return prisma.user.findUnique({ where: { email: identifier } });
  const parsed = phone.safeParse(identifier);
  if (!parsed.success) return null;
  // Phone numbers aren't unique, so only sign in when exactly one account uses it.
  const matches = await prisma.user.findMany({ where: { phone: parsed.data }, take: 2 });
  return matches.length === 1 ? matches[0] : null;
}

authRouter.post(
  "/login",
  authLimiter,
  ah(async (req, res) => {
    const { email: identifier, password: pw } = loginSchema.parse(req.body);
    const user = await findLoginUser(identifier);
    const ok = user && (await bcrypt.compare(pw, user.passwordHash));
    if (!user || !ok) throw new HttpError(401, "Those sign-in details didn't match our records. Check your email or phone number and password.");
    if (!user.active) throw new HttpError(403, "This account has been deactivated. Please contact the pharmacy if you think this is a mistake.");
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = setSession(res, user, req);
    res.json({ user: publicUser(user), token });
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  res.json({ user: req.user ?? null });
});

authRouter.post(
  "/change-password",
  requireAuth,
  ah(async (req, res) => {
    const { currentPassword, newPassword } = z.object({ currentPassword: z.string(), newPassword: password }).parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new HttpError(400, "Your current password is incorrect.");
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) throw new HttpError(400, "Choose a password different from your current one.");
    // New password: sign out every other device and clear any "must change password" flag.
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12), mustChangePassword: false, sessionVersion: { increment: 1 } },
    });
    const token = setSession(res, updated, req);
    res.json({ ok: true, user: publicUser(updated), token });
  }),
);

export { phone as phoneSchema, password as passwordSchema };
