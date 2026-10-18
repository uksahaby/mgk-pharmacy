import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { apiGet } from "@/lib/server-api";
import type { Category } from "@/lib/types";
import { CatalogView, type CatalogParams } from "@/components/catalog/catalog-view";

async function findCategory(slug: string) {
  const data = await apiGet<{ categories: Category[] }>("/categories");
  return data?.categories.find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const category = await findCategory((await params).slug);
  if (!category) return { title: "Category not found" };
  return { title: `${category.name}: buy online`, description: category.description };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogParams>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await findCategory(slug);
  if (!category) notFound();
  return (
    <Suspense>
      <CatalogView params={sp} category={category} />
    </Suspense>
  );
}
