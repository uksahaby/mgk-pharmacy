import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import type { Category, ProductList } from "@/lib/types";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function get<T>(path: string): Promise<T | null> {
  try {
    // Time limit: on Render's free plan the API may be asleep and take ~1 minute to wake.
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(20_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = ["", "/shop", "/about", "/prescriptions", "/delivery", "/returns", "/faq", "/contact", "/privacy", "/terms", "/track"];
  const cats = await get<{ categories: Category[] }>("/categories");
  const products: ProductList["products"] = [];
  for (let page = 1; page <= 50; page++) {
    const list = await get<ProductList>(`/products?pageSize=48&page=${page}`);
    if (!list) break;
    products.push(...list.products);
    if (page >= list.pageCount) break;
  }
  return [
    ...statics.map((p) => ({ url: `${site.url}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...(cats?.categories ?? []).map((c) => ({ url: `${site.url}/category/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${site.url}/product/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
