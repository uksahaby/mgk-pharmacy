import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import type { Category } from "@/lib/types";
import { ProductForm } from "../product-form";
import { Batches, type Batch } from "./batches";

export const metadata: Metadata = { title: "Edit product" };

type AdminProduct = {
  id: string; slug: string; name: string; genericName: string; brand: string; manufacturer: string | null; strength: string | null;
  dosageForm: string; packSize: string; priceKobo: number; compareAtKobo: number | null; rxStatus: "OTC" | "POM" | "CONTROLLED";
  coldChain: boolean; description: string; usage: string; warnings: string; storage: string; featured: boolean; active: boolean;
  category: { slug: string }; batches: Batch[]; stock: number;
};

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, cats] = await Promise.all([apiGet<{ product: AdminProduct }>(`/admin/products/${id}`), apiGet<{ categories: Category[] }>("/categories")]);
  if (!data) notFound();
  const p = data.product;
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-ink"><ChevronLeft className="h-4 w-4" /> Products</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{p.name} {p.strength}</h1>
          <p className="text-sm text-ink-muted">{p.stock} sellable units in stock</p>
        </div>
        <Link href={`/product/${p.slug}`} target="_blank" className="btn-outline btn-sm">View in store <ExternalLink className="h-3.5 w-3.5" /></Link>
      </div>
      <Batches productId={p.id} batches={p.batches} />
      <ProductForm
        categories={cats?.categories ?? []}
        initial={{
          id: p.id, name: p.name, genericName: p.genericName, brand: p.brand, manufacturer: p.manufacturer ?? "", strength: p.strength ?? "",
          dosageForm: p.dosageForm, packSize: p.packSize, price: String(p.priceKobo / 100), compareAt: p.compareAtKobo ? String(p.compareAtKobo / 100) : "",
          categorySlug: p.category.slug, rxStatus: p.rxStatus, coldChain: p.coldChain, description: p.description, usage: p.usage, warnings: p.warnings,
          storage: p.storage, featured: p.featured, active: p.active,
        }}
      />
    </div>
  );
}
