"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatPhone } from "@/lib/format";
import type { Address } from "@/lib/types";
import { SelectField, SubmitButton, TextField, useSubmit } from "@/components/form";
import { Alert } from "@/components/ui";

type Draft = Omit<Address, "id" | "isDefault"> & { isDefault: boolean };
const empty: Draft = { label: "Home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "Kano", landmark: "", isDefault: false };

export function AddressBook({ addresses, states }: { addresses: Address[]; states: string[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(addresses.length ? null : "new");
  const [draft, setDraft] = useState<Draft>(empty);
  const { pending, error, fields, run } = useSubmit();

  const startEdit = (a?: Address) => {
    setDraft(a ? { ...a, phone: formatPhone(a.phone), line2: a.line2 ?? "", landmark: a.landmark ?? "" } : empty);
    setEditing(a ? a.id : "new");
  };
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft({ ...draft, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <article key={a.id} className="card flex flex-col p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4 text-brand-600" aria-hidden /> {a.label}
              </p>
              {a.isDefault && <span className="chip bg-care-100 text-care-700">Default</span>}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {a.fullName} · {formatPhone(a.phone)}
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state}
              {a.landmark && <span className="block text-ink-muted">Landmark: {a.landmark}</span>}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <button className="btn-ghost btn-sm" onClick={() => startEdit(a)}>
                <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
              </button>
              {!a.isDefault && (
                <button
                  className="btn-ghost btn-sm"
                  onClick={async () => {
                    await run(() => api(`/account/addresses/${a.id}`, { method: "PUT", json: { ...a, isDefault: true } }));
                    router.refresh();
                  }}
                >
                  <Star className="h-3.5 w-3.5" aria-hidden /> Make default
                </button>
              )}
              <button
                className="btn-ghost btn-sm text-brand-700"
                onClick={async () => {
                  if (!window.confirm(`Delete the "${a.label}" address?`)) return;
                  await run(() => api(`/account/addresses/${a.id}`, { method: "DELETE" }));
                  router.refresh();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
              </button>
            </div>
          </article>
        ))}
        {editing === null && (
          <button onClick={() => startEdit()} className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-ink-soft hover:border-brand-400 hover:text-brand-700">
            <Plus className="h-6 w-6" aria-hidden /> Add a new address
          </button>
        )}
      </div>

      {editing !== null && (
        <form
          className="card space-y-4 p-5 sm:p-6"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(() =>
              editing === "new"
                ? api("/account/addresses", { json: draft })
                : api(`/account/addresses/${editing}`, { method: "PUT", json: draft }),
            );
            if (ok) {
              setEditing(null);
              router.refresh();
            }
          }}
        >
          <h2 className="text-lg font-semibold">{editing === "new" ? "New address" : "Edit address"}</h2>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Label" placeholder="Home, Office…" value={draft.label} onChange={set("label")} />
            <TextField label="Recipient's full name" value={draft.fullName} onChange={set("fullName")} error={fields.fullName} />
            <TextField label="Phone" type="tel" value={draft.phone} onChange={set("phone")} error={fields.phone} />
            <TextField label="Street address" value={draft.line1} onChange={set("line1")} error={fields.line1} />
            <TextField label="Apartment, estate or area" optional value={draft.line2 ?? ""} onChange={set("line2")} />
            <TextField label="Town / city" value={draft.city} onChange={set("city")} error={fields.city} />
            <SelectField label="State" value={draft.state} onChange={set("state")} error={fields.state}>
              {states.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectField>
            <TextField label="Nearest landmark" optional value={draft.landmark ?? ""} onChange={set("landmark")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} /> Use as my default address
          </label>
          <div className="flex gap-2">
            <SubmitButton pending={pending}>Save address</SubmitButton>
            {addresses.length > 0 && (
              <button type="button" className="btn-outline" onClick={() => setEditing(null)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
