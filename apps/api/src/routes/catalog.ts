import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ah, notFound } from "../lib/errors";
import { productInclude, sellableBatchWhere, serializeProduct } from "../lib/catalog";
import { buildQuote } from "../lib/pricing";
import { env } from "../lib/env";
import { FREE_DELIVERY_THRESHOLD_KOBO, NIGERIAN_STATES } from "../lib/constants";

export const catalogRouter = Router();

catalogRouter.get(
  "/categories",
  ah(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { active: true } } } } },
    });
    res.json({
      categories: categories.map((c) => ({
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
        productCount: c._count.products,
      })),
    });
  }),
);

const listSchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().optional(),
  rx: z.enum(["OTC", "POM", "CONTROLLED"]).optional(),
  inStock: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  sort: z.enum(["relevance", "price-asc", "price-desc", "name", "popular", "newest"]).default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});

catalogRouter.get(
  "/products",
  ah(async (req, res) => {
    const f = listSchema.parse(req.query);
    const where: Prisma.ProductWhereInput = { active: true };
    if (f.q) {
      where.OR = [
        { name: { contains: f.q, mode: "insensitive" } },
        { genericName: { contains: f.q, mode: "insensitive" } },
        { brand: { contains: f.q, mode: "insensitive" } },
        { category: { name: { contains: f.q, mode: "insensitive" } } },
      ];
    }
    if (f.category) where.category = { slug: f.category };
    if (f.rx) where.rxStatus = f.rx;
    if (f.featured) where.featured = true;
    if (f.inStock) where.batches = { some: sellableBatchWhere() };
    if (f.minPrice !== undefined || f.maxPrice !== undefined) {
      where.priceKobo = {
        ...(f.minPrice !== undefined ? { gte: f.minPrice * 100 } : {}),
        ...(f.maxPrice !== undefined ? { lte: f.maxPrice * 100 } : {}),
      };
    }
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      f.sort === "price-asc"
        ? [{ priceKobo: "asc" }]
        : f.sort === "price-desc"
          ? [{ priceKobo: "desc" }]
          : f.sort === "name"
            ? [{ name: "asc" }]
            : f.sort === "newest"
              ? [{ createdAt: "desc" }]
              : [{ featured: "desc" }, { soldCount: "desc" }, { name: "asc" }];

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({ where, orderBy, include: productInclude, skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
    ]);
    res.json({
      products: products.map((p) => serializeProduct(p)),
      total,
      page: f.page,
      pageSize: f.pageSize,
      pageCount: Math.max(1, Math.ceil(total / f.pageSize)),
    });
  }),
);

catalogRouter.get(
  "/products/:slug",
  ah(async (req, res) => {
    const product = await prisma.product.findFirst({ where: { slug: req.params.slug, active: true }, include: productInclude });
    if (!product) throw notFound("Product");
    const [sameGeneric, sameCategory] = await Promise.all([
      prisma.product.findMany({
        where: { genericName: product.genericName, id: { not: product.id }, active: true },
        include: productInclude,
        take: 4,
      }),
      prisma.product.findMany({
        where: { categoryId: product.categoryId, id: { not: product.id }, active: true },
        include: productInclude,
        orderBy: { soldCount: "desc" },
        take: 8,
      }),
    ]);
    res.json({
      product: serializeProduct(product, { detail: true }),
      alternatives: sameGeneric.map((p) => serializeProduct(p)),
      related: sameCategory.filter((p) => p.genericName !== product.genericName).slice(0, 4).map((p) => serializeProduct(p)),
    });
  }),
);

catalogRouter.get(
  "/store-info",
  ah(async (_req, res) => {
    const zones = await prisma.shippingZone.findMany({ orderBy: { sortOrder: "asc" } });
    res.json({
      states: NIGERIAN_STATES,
      zones: zones.map((z) => ({ code: z.code, name: z.name, description: z.description, feeKobo: z.feeKobo, etaLabel: z.etaLabel })),
      freeDeliveryThresholdKobo: FREE_DELIVERY_THRESHOLD_KOBO,
      paymentMethods: {
        paystack: !!env.paystackSecret,
        bankTransfer: true,
        payOnPickup: true,
      },
      bank: env.bank,
      unpaidOrderTtlHours: env.unpaidOrderTtlHours,
      store: env.store,
    });
  }),
);

const quoteSchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(50) })).max(60),
  fulfilment: z.enum(["DELIVERY", "PICKUP"]).default("DELIVERY"),
  state: z.string().optional().nullable(),
});

catalogRouter.post(
  "/cart/quote",
  ah(async (req, res) => {
    const body = quoteSchema.parse(req.body);
    res.json(await buildQuote(body.items, { fulfilment: body.fulfilment, state: body.state, user: req.user }));
  }),
);
