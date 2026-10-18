import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView, type CatalogParams } from "@/components/catalog/catalog-view";

export async function generateMetadata({ searchParams }: { searchParams: Promise<CatalogParams> }): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q}` : "Shop all medicines & health products",
    description: "Browse genuine medicines, vitamins, devices and health products with delivery across Nigeria.",
    robots: q ? { index: false } : undefined,
  };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const params = await searchParams;
  return (
    <Suspense>
      <CatalogView params={params} />
    </Suspense>
  );
}
