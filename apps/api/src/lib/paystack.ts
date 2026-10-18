import crypto from "crypto";
import type { Order } from "@prisma/client";
import { env } from "./env";
import { HttpError } from "./errors";

const BASE = "https://api.paystack.co";

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!env.paystackSecret) throw new HttpError(503, "Card payments are not available right now.");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.paystackSecret}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!res.ok || !json.status) throw new HttpError(502, `Payment provider error: ${json.message}`);
  return json.data;
}

export async function initializePayment(order: Order) {
  const reference = `${order.number}-${Date.now().toString(36)}`;
  const data = await call<{ authorization_url: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: order.email,
      amount: order.totalKobo,
      currency: "NGN",
      reference,
      callback_url: `${env.webOrigin}/order/${order.number}?key=${order.accessKey}&verify=1`,
      metadata: { orderNumber: order.number },
    }),
  });
  return data;
}

export async function verifyPayment(reference: string) {
  return call<{ status: string; amount: number; reference: string; metadata?: { orderNumber?: string } }>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}

export function isValidWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!env.paystackSecret || !signature) return false;
  const expected = crypto.createHmac("sha512", env.paystackSecret).update(rawBody).digest("hex");
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
