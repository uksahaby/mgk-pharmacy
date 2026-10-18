import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { Category } from "@/lib/types";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New product" };

export default async function NewProduct() {
  const cats = (await apiGet<{ categories: Category[] }>("/categories"))?.categories ?? [];
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-ink"><ChevronLeft className="h-4 w-4" /> Products</Link>
      <h1 className="text-2xl font-bold">New product</h1>
      <p className="text-sm text-ink-muted">After creating it, add a stock batch with its expiry date so it can be sold.</p>
      <ProductForm
        categories={cats}
        initial={{
          name: "", genericName: "", brand: "", manufacturer: "", strength: "", dosageForm: "Tablet", packSize: "", price: "", compareAt: "",
          categorySlug: cats[0]?.slug ?? "", rxStatus: "OTC", coldChain: false, description: "", usage: "", warnings: "", storage: "", featured: false, active: true,
        }}
      />
    </div>
  );
}
