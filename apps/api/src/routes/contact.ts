import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ah } from "../lib/errors";

export const contactRouter = Router();

contactRouter.post(
  "/contact",
  rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false }),
  ah(async (req, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2, "Please enter your name").max(120),
        email: z.string().trim().toLowerCase().email("Enter a valid email"),
        phone: z.string().trim().max(20).optional(),
        topic: z.enum(["ORDER", "PRESCRIPTION", "PRODUCT", "FEEDBACK", "OTHER"]),
        message: z.string().trim().min(10, "Please write a little more detail").max(2000),
      })
      .parse(req.body);
    await prisma.contactMessage.create({ data: { ...data, phone: data.phone || null } });
    res.status(201).json({ ok: true });
  }),
);
