/**
 * Loads the delivery zones onto a fresh database (e.g. production). Safe to run again: existing zones are updated
 * by code, nothing else is touched. Change fees afterwards in prisma/shipping-zones.ts and re-run.
 *
 *   npm run init:store -w apps/api
 */
import { PrismaClient } from "@prisma/client";
import { SHIPPING_ZONES } from "../prisma/shipping-zones";

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const z of SHIPPING_ZONES) {
      await prisma.shippingZone.upsert({ where: { code: z.code }, create: z, update: z });
    }
    console.log(`Delivery zones ready: ${SHIPPING_ZONES.map((z) => z.code).join(", ")}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
