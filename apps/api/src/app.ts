import crypto from "crypto";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./lib/env";
import { attachUser, enforcePasswordChange } from "./lib/auth";
import { errorHandler } from "./lib/errors";
import { authRouter } from "./routes/auth";
import { catalogRouter } from "./routes/catalog";
import { ordersRouter, paystackWebhook } from "./routes/orders";
import { accountRouter } from "./routes/account";
import { adminRouter } from "./routes/admin";
import { contactRouter } from "./routes/contact";
import { riderRouter } from "./routes/rider";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Render's load balancer

  // Website traffic reaches us through the Next.js proxy on Vercel, so req.ip would be Vercel's address for every
  // visitor (and all customers would share one sign-in rate limit). The proxy sends the visitor's IP with a shared
  // secret; only then do we trust it. The mobile app talks to us directly and keeps req.ip as-is.
  app.use((req, _res, next) => {
    const secret = req.get("x-mgk-proxy-secret");
    const ip = req.get("x-mgk-client-ip");
    if (env.proxySecret && secret && ip && safeEqual(secret, env.proxySecret)) {
      Object.defineProperty(req, "ip", { value: ip.trim().slice(0, 64), configurable: true });
    }
    next();
  });

  app.use(helmet());
  app.use(cors({ origin: env.webOrigin, credentials: true }));

  // Paystack needs the raw body for signature verification, so it is mounted before express.json().
  app.post("/payments/paystack/webhook", express.raw({ type: "application/json", limit: "1mb" }), paystackWebhook);

  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  app.use(attachUser);
  app.use(enforcePasswordChange);

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/auth", authRouter);
  app.use(catalogRouter);
  app.use(ordersRouter);
  app.use(contactRouter);
  app.use(accountRouter);
  app.use("/admin", adminRouter);
  app.use("/rider", riderRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);
  return app;
}
