/**
 * Downloads MGK Pharmacy's public product catalogue (WooCommerce Store API) into prisma/data/mgk-products.json.
 * Used with the pharmacy's permission. Requests are sequential with a pause between pages.
 *
 *   npm run fetch:mgk -w apps/api
 */
import fs from "fs";
import path from "path";

const BASE = "https://mgkpharmacy.com/wp-json/wc/store/v1/products";
const PER_PAGE = 100;
const PAUSE_MS = 600;
const OUT = path.resolve(__dirname, "..", "prisma", "data", "mgk-products.json");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getPage(page: number, attempt = 1): Promise<{ items: unknown[]; totalPages: number }> {
  try {
    const res = await fetch(`${BASE}?per_page=${PER_PAGE}&page=${page}&orderby=id&order=asc`, {
      headers: { "User-Agent": "MGK-catalogue-import (authorised by MGK Pharmacy)", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { items: (await res.json()) as unknown[], totalPages: Number(res.headers.get("x-wp-totalpages") ?? 1) };
  } catch (e) {
    if (attempt >= 4) throw e;
    console.warn(`page ${page} failed (${(e as Error).message}), retrying…`);
    await sleep(2000 * attempt);
    return getPage(page, attempt + 1);
  }
}

async function main() {
  const all: unknown[] = [];
  const first = await getPage(1);
  all.push(...first.items);
  console.log(`page 1/${first.totalPages}`);
  for (let page = 2; page <= first.totalPages; page++) {
    await sleep(PAUSE_MS);
    const { items } = await getPage(page);
    all.push(...items);
    if (page % 10 === 0 || page === first.totalPages) console.log(`page ${page}/${first.totalPages} · ${all.length} products`);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), source: BASE, products: all }));
  console.log(`Saved ${all.length} products to ${path.relative(process.cwd(), OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
