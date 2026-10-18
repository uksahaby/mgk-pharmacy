"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";
import { SelectField, SubmitButton, TextArea, TextField, useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";
import type { Category } from "@/lib/types";

export type ProductInput = {
  id?: string;
  name: string;
  genericName: string;
  brand: string;
  manufacturer: string;
  strength: string;
  dosageForm: string;
  packSize: string;
  price: string;
  compareAt: string;
  categorySlug: string;
  rxStatus: "OTC" | "POM" | "CONTROLLED";
  coldChain: boolean;
  description: string;
  usage: string;
  warnings: string;
  storage: string;
  featured: boolean;
  active: boolean;
};

export function ProductForm({ initial, categories }: { initial: ProductInput; categories: Category[] }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [saved, setSaved] = useState(false);
  const { pending, error, fields, run } = useSubmit();
  const set = (k: keyof ProductInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setP({ ...p, [k]: e.target.value });
  const check = (k: "coldChain" | "featured" | "active") => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.checked });

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setSaved(false);
        const body = {
          ...p,
          priceKobo: Math.round(Number(p.price) * 100),
          compareAtKobo: p.compareAt ? Math.round(Number(p.compareAt) * 100) : null,
          manufacturer: p.manufacturer || null,
          strength: p.strength || null,
          storage: p.storage || undefined,
        };
        const res = await run(() =>
          p.id ? api(`/admin/products/${p.id}`, { method: "PUT", json: body }) : api<{ product: { id: string } }>("/admin/products", { json: body }),
        );
        if (res) {
          setSaved(true);
          if (!p.id && "product" in (res as object)) router.push(`/admin/products/${(res as { product: { id: string } }).product.id}`);
          else router.refresh();
        }
      }}
    >
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">Saved.</Alert>}
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <TextField label="Product name" value={p.name} onChange={set("name")} error={fields.name} />
        <TextField label="Generic name / active ingredient" value={p.genericName} onChange={set("genericName")} error={fields.genericName} hint="Customers search by this, so include every ingredient." />
        <TextField label="Brand" value={p.brand} onChange={set("brand")} error={fields.brand} />
        <TextField label="Manufacturer" optional value={p.manufacturer} onChange={set("manufacturer")} />
        <TextField label="Strength" optional placeholder="500mg" value={p.strength} onChange={set("strength")} />
        <TextField label="Dosage form" placeholder="Tablet, Syrup…" value={p.dosageForm} onChange={set("dosageForm")} error={fields.dosageForm} />
        <TextField label="Pack size" placeholder="Pack of 30 tablets" value={p.packSize} onChange={set("packSize")} error={fields.packSize} hint="Always state the unit so prices are clear." />
        <SelectField label="Category" value={p.categorySlug} onChange={set("categorySlug")}>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </SelectField>
        <TextField label="Price (₦)" type="number" min="1" step="0.01" value={p.price} onChange={set("price")} error={fields.priceKobo} />
        <TextField label="Was price (₦)" optional type="number" min="1" step="0.01" value={p.compareAt} onChange={set("compareAt")} hint="Shows a strikethrough discount." />
      </section>
      <section className="card space-y-4 p-5">
        <SelectField label="Dispensing class" value={p.rxStatus} onChange={set("rxStatus")} hint="Antibiotics, antihypertensives, antidiabetics etc. must be POM. Opioids and benzodiazepines must be Controlled.">
          <option value="OTC">OTC: no prescription needed</option>
          <option value="POM">POM: prescription only</option>
          <option value="CONTROLLED">Controlled: prescription + verified ID</option>
        </SelectField>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={p.coldChain} onChange={check("coldChain")} /> Cold chain (2–8°C)</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={p.featured} onChange={check("featured")} /> Featured on homepage</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={p.active} onChange={check("active")} /> Visible in store</label>
        </div>
      </section>
      <section className="card space-y-4 p-5">
        <TextArea label="Description" rows={4} value={p.description} onChange={set("description")} error={fields.description} />
        <TextArea label="How to use" rows={3} value={p.usage} onChange={set("usage")} error={fields.usage} />
        <TextArea label="Warnings & side effects" rows={3} value={p.warnings} onChange={set("warnings")} error={fields.warnings} />
        <TextArea label="Storage" optional rows={2} value={p.storage} onChange={set("storage")} />
      </section>
      <SubmitButton pending={pending}>{p.id ? "Save changes" : "Create product"}</SubmitButton>
    </form>
  );
}
