import type { Batch, Category, Product } from "@prisma/client";
import { hasEverStocked, isLowStock, stockOf } from "./catalog";

/** Stock spreadsheets for the Inventory page. One flat table per file, so they can be sorted and filtered in Excel. */

type ProductWithStock = Product & { category: Category; batches: Batch[] };
type Cell = string | number;

const DAY = 86_400_000;
const lagosDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" });

export const stockReportDate = (d = new Date()) => lagosDate.format(d);

/** Text starting with = + - or @ would run as a formula when opened in Excel, so it gets a leading apostrophe. */
function csvCell(value: Cell): string {
  if (typeof value === "number") return String(value);
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Starts with a byte order mark, or Excel misreads characters outside plain English. */
export function toCsv(rows: Cell[][]): string {
  return `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function stockStatus(p: ProductWithStock): string {
  const stock = stockOf(p);
  if (stock === 0) return "Out of stock";
  return isLowStock(p) ? "Low" : "OK";
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

/**
 * One row per product the pharmacy has ever stocked, including products taken off sale, because their stock is still
 * on the shelf. Products imported but never stocked are left out; the Inventory page lists those separately.
 */
export function stockRows(products: ProductWithStock[], now = new Date()): Cell[][] {
  const header = ["Product", "Generic name", "Brand", "Strength", "Form", "Pack size", "Category", "On sale", "Status", "Sellable units", "Expired or held units", "Earliest sellable expiry", "Units sold", "Price (NGN)", "Stock value at selling price (NGN)"];
  const rows = products
    .filter(hasEverStocked)
    .sort(byName)
    .map((p): Cell[] => {
      const sellable = stockOf(p);
      const onHand = p.batches.reduce((sum, b) => sum + b.quantity, 0);
      const expiries = p.batches.filter((b) => b.status === "ACTIVE" && b.quantity > 0 && b.expiresAt.getTime() > now.getTime()).map((b) => b.expiresAt.getTime());
      return [
        p.name,
        p.genericName,
        p.brand,
        p.strength ?? "",
        p.dosageForm,
        p.packSize,
        p.category.name,
        p.active ? "Yes" : "No",
        stockStatus(p),
        sellable,
        onHand - sellable,
        expiries.length ? stockReportDate(new Date(Math.min(...expiries))) : "",
        p.soldCount,
        p.priceKobo / 100,
        (p.priceKobo * sellable) / 100,
      ];
    });
  return [header, ...rows];
}

/** One row per batch still holding stock, soonest expiry first. */
export function batchRows(products: ProductWithStock[], now = new Date()): Cell[][] {
  const header = ["Product", "Pack size", "Batch number", "Units", "Batch status", "Expires", "Days to expiry", "Received", "Sellable"];
  const rows = products
    .flatMap((p) => p.batches.filter((b) => b.quantity > 0).map((b) => ({ p, b })))
    .sort((x, y) => x.b.expiresAt.getTime() - y.b.expiresAt.getTime() || byName(x.p, y.p))
    .map(({ p, b }): Cell[] => {
      const expired = b.expiresAt.getTime() <= now.getTime();
      return [
        p.name,
        p.packSize,
        b.batchNumber,
        b.quantity,
        b.status,
        stockReportDate(b.expiresAt),
        Math.ceil((b.expiresAt.getTime() - now.getTime()) / DAY),
        stockReportDate(b.receivedAt),
        b.status === "ACTIVE" && !expired ? "Yes" : expired ? "No, expired" : "No, held",
      ];
    });
  return [header, ...rows];
}
