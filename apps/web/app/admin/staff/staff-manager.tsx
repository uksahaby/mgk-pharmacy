"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { KeyRound, Search, UserPlus, X } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatDate, formatDateTime, formatPhone } from "@/lib/format";
import { ROLE_LABEL, ROLE_TONE } from "@/lib/roles";
import type { Role } from "@/lib/types";
import { SelectField, SubmitButton, TextField, useSubmit } from "@/components/form";
import { Alert, Pagination } from "@/components/ui";
import { CopyButton } from "@/components/order/order-actions";

export type StaffUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
type RoleOption = { role: Role; label: string; description: string };

export function StaffManager({
  me,
  roles,
  data,
  filters,
}: {
  me: string;
  roles: RoleOption[];
  data: { users: StaffUser[]; total: number; page: number; pageCount: number };
  filters: { q: string; role: string; status: string };
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [credential, setCredential] = useState<{ name: string; email: string; password: string; reason: "created" | "reset" } | null>(null);
  const { pending, error, run, setError } = useSubmit();

  const href = (patch: Partial<typeof filters & { page: string }>) => {
    const p = new URLSearchParams({ tab: "team" });
    for (const [k, v] of Object.entries({ ...filters, ...patch })) if (v) p.set(k, String(v));
    return `/admin/staff?${p}`;
  };

  const update = async (u: StaffUser, body: { role?: Role; active?: boolean }, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    const ok = await run(() => api(`/admin/users/${u.id}`, { method: "PATCH", json: body }));
    if (ok) router.refresh();
  };

  const resetPassword = async (u: StaffUser) => {
    if (!window.confirm(`Reset ${u.firstName}'s password? They'll be signed out everywhere and must set a new one.`)) return;
    const res = await run(() => api<{ tempPassword: string }>(`/admin/users/${u.id}/reset-password`, { method: "POST" }));
    if (res) setCredential({ name: `${u.firstName} ${u.lastName}`, email: u.email, password: res.tempPassword, reason: "reset" });
  };

  return (
    <div className="space-y-4">
      {credential && <CredentialCard credential={credential} onClose={() => setCredential(null)} />}
      {error && (
        <Alert tone="error">
          {error}{" "}
          <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </Alert>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap items-end gap-2" action="/admin/staff">
          <input type="hidden" name="tab" value="team" />
          <label className="relative">
            <span className="sr-only">Search people</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input name="q" defaultValue={filters.q} placeholder="Name, email or phone" className="input w-60 pl-9" />
          </label>
          <select name="role" defaultValue={filters.role} className="input w-48" aria-label="Role">
            <option value="STAFF">All staff</option>
            {roles.map((r) => <option key={r.role} value={r.role}>{r.label}s</option>)}
            <option value="">Everyone (incl. customers)</option>
          </select>
          <select name="status" defaultValue={filters.status} className="input w-36" aria-label="Status">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </select>
          <button className="btn-dark">Filter</button>
        </form>
        <button className="btn-primary" onClick={() => setAdding((a) => !a)}>
          {adding ? <X className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />} {adding ? "Close" : "Add person"}
        </button>
      </div>

      {adding && (
        <AddPerson
          roles={roles}
          onCreated={(c) => {
            setAdding(false);
            setCredential(c);
            router.refresh();
          }}
        />
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Person</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Last sign-in</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.users.map((u) => {
              const self = u.id === me;
              return (
                <tr key={u.id} className={clsx(!u.active && "bg-slate-50 text-ink-muted")}>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink">
                      {u.firstName} {u.lastName} {self && <span className="chip ml-1 bg-slate-100 text-ink-soft">You</span>}
                    </p>
                    <p className="text-xs text-ink-muted">{u.email}{u.phone ? ` · ${formatPhone(u.phone)}` : ""}</p>
                  </td>
                  <td className="px-5 py-3">
                    {self ? (
                      <span className={clsx("chip", ROLE_TONE[u.role])}>{ROLE_LABEL[u.role]}</span>
                    ) : (
                      <select
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                        value={u.role}
                        disabled={pending || !u.active}
                        aria-label={`Role for ${u.firstName} ${u.lastName}`}
                        onChange={(e) => {
                          const role = e.target.value as Role;
                          void update(u, { role }, `Change ${u.firstName}'s role from ${ROLE_LABEL[u.role]} to ${ROLE_LABEL[role]}? They'll be signed out so the change takes effect.`);
                        }}
                      >
                        {roles.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {!u.active ? (
                      <span className="chip bg-slate-200 text-slate-700">Deactivated</span>
                    ) : u.mustChangePassword ? (
                      <span className="chip bg-amber-100 text-amber-800" title="Hasn't set their own password yet">Invited</span>
                    ) : (
                      <span className="chip bg-care-100 text-care-700">Active</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : <span className="text-ink-muted">Never · added {formatDate(u.createdAt)}</span>}</td>
                  <td className="px-5 py-3">
                    {!self && (
                      <div className="flex justify-end gap-1.5">
                        {u.active && (
                          <button className="btn-ghost btn-sm" disabled={pending} onClick={() => resetPassword(u)}>
                            <KeyRound className="h-3.5 w-3.5" aria-hidden /> Reset password
                          </button>
                        )}
                        {u.active ? (
                          <button className="btn-outline btn-sm text-brand-700" disabled={pending} onClick={() => update(u, { active: false }, `Deactivate ${u.firstName} ${u.lastName}? They'll be signed out immediately and won't be able to sign in.`)}>
                            Deactivate
                          </button>
                        ) : (
                          <button className="btn-outline btn-sm" disabled={pending} onClick={() => update(u, { active: true })}>
                            Reactivate
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {data.users.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-ink-muted">Nobody matches these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={data.page} pageCount={data.pageCount} hrefFor={(p) => href({ page: String(p) })} />
    </div>
  );
}

function AddPerson({ roles, onCreated }: { roles: RoleOption[]; onCreated: (c: { name: string; email: string; password: string; reason: "created" }) => void }) {
  const staffRoles = roles.filter((r) => r.role !== "CUSTOMER");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "PHARMACIST" as Role });
  const { pending, error, fields, run } = useSubmit();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const chosen = roles.find((r) => r.role === form.role);
  return (
    <form
      className="card space-y-4 p-5"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await run(() => api<{ tempPassword: string }>("/admin/users", { json: form }));
        if (res) onCreated({ name: `${form.firstName} ${form.lastName}`, email: form.email, password: res.tempPassword, reason: "created" });
      }}
    >
      <h2 className="text-lg font-semibold">Add a team member</h2>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" value={form.firstName} onChange={set("firstName")} error={fields.firstName} />
        <TextField label="Last name" value={form.lastName} onChange={set("lastName")} error={fields.lastName} />
        <TextField label="Work email" type="email" value={form.email} onChange={set("email")} error={fields.email} hint="They'll sign in with this." />
        <TextField label="Mobile number" type="tel" value={form.phone} onChange={set("phone")} error={fields.phone} placeholder="0803 123 4567" />
        <SelectField label="Role" value={form.role} onChange={set("role")} className="sm:col-span-2" hint={chosen?.description}>
          {staffRoles.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
        </SelectField>
      </div>
      <SubmitButton pending={pending}>
        <UserPlus className="h-4 w-4" aria-hidden /> Create account
      </SubmitButton>
      <p className="text-xs text-ink-muted">A one-time password is generated for you to hand over in person. They must choose their own password at first sign-in.</p>
    </form>
  );
}

function CredentialCard({ credential, onClose }: { credential: { name: string; email: string; password: string; reason: "created" | "reset" }; onClose: () => void }) {
  return (
    <div className="card border-care-100 bg-care-50/60 p-5" role="status">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {credential.reason === "created" ? `Account created for ${credential.name}` : `New temporary password for ${credential.name}`}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Give them these details in person or by phone. <strong>This password is shown only once</strong> and they must change it when they sign in.
          </p>
        </div>
        <button onClick={onClose} className="rounded-full p-1 text-ink-muted hover:bg-white" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
          <div><dt className="text-xs text-ink-muted">Email</dt><dd className="font-medium">{credential.email}</dd></div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
          <div><dt className="text-xs text-ink-muted">Temporary password</dt><dd className="font-mono text-lg font-semibold tracking-wide">{credential.password}</dd></div>
          <CopyButton value={credential.password} label="temporary password" />
        </div>
      </dl>
    </div>
  );
}
