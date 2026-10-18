import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { Check, Minus } from "lucide-react";
import { apiGet, requirePermission } from "@/lib/server-api";
import type { Permission, Role } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { ROLE_TONE } from "@/lib/roles";
import { StaffManager, type StaffUser } from "./staff-manager";

export const metadata: Metadata = { title: "Staff & roles" };

type RoleInfo = { role: Role; label: string; description: string; permissions: Permission[]; activeUsers: number };
type AuditEntry = { id: string; actorName: string; action: string; summary: string; createdAt: string };

const PERMISSION_LABEL: Record<Permission, string> = {
  "dashboard.view": "Staff dashboard",
  "orders.view": "View orders",
  "orders.manage": "Manage orders, payments & dispatch",
  "prescriptions.review": "Review prescriptions",
  "verifications.review": "Review ID verifications",
  "products.manage": "Manage products",
  "inventory.manage": "Manage stock & expiry",
  "customers.view": "View customers",
  "messages.view": "Read contact messages",
  "staff.manage": "Manage staff & roles",
  "deliveries.ride": "Rider app",
};

const TABS = [
  ["team", "People"],
  ["roles", "Roles & permissions"],
  ["activity", "Activity log"],
] as const;

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; role?: string; status?: string; page?: string }> }) {
  const [me, sp] = await Promise.all([requirePermission("staff.manage"), searchParams]);
  const tab = sp.tab ?? "team";
  const roles = (await apiGet<{ roles: RoleInfo[] }>("/admin/roles"))!.roles;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff & roles</h1>
        <p className="text-sm text-ink-muted">Add team members, choose what each person can do, and see who changed what.</p>
      </div>
      <nav className="flex gap-1.5 overflow-x-auto scrollbar-none" aria-label="Staff sections">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/admin/staff?tab=${key}`} className={clsx("whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium", tab === key ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-slate-200")}>
            {label}
          </Link>
        ))}
      </nav>

      {tab === "team" && <TeamTab me={me.id} roles={roles} sp={sp} />}
      {tab === "roles" && <RolesTab roles={roles} />}
      {tab === "activity" && <ActivityTab />}
    </div>
  );
}

async function TeamTab({ me, roles, sp }: { me: string; roles: RoleInfo[]; sp: { q?: string; role?: string; status?: string; page?: string } }) {
  const qs = new URLSearchParams({ role: sp.role ?? "STAFF", page: sp.page ?? "1" });
  if (sp.q) qs.set("q", sp.q);
  if (sp.status) qs.set("status", sp.status);
  const data = (await apiGet<{ users: StaffUser[]; total: number; page: number; pageCount: number }>(`/admin/users?${qs}`))!;
  return <StaffManager me={me} roles={roles.map(({ role, label, description }) => ({ role, label, description }))} data={data} filters={{ q: sp.q ?? "", role: sp.role ?? "STAFF", status: sp.status ?? "" }} />;
}

function RolesTab({ roles }: { roles: RoleInfo[] }) {
  const perms = Object.keys(PERMISSION_LABEL) as Permission[];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <div key={r.role} className="card p-4">
            <div className="flex items-center justify-between">
              <span className={clsx("chip", ROLE_TONE[r.role])}>{r.label}</span>
              <span className="text-xs text-ink-muted">{r.activeUsers} active</span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">{r.description}</p>
          </div>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Permission</th>
              {roles.map((r) => <th key={r.role} className="px-3 py-3 text-center font-semibold">{r.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {perms.map((p) => (
              <tr key={p}>
                <td className="px-4 py-2.5 font-medium">{PERMISSION_LABEL[p]}</td>
                {roles.map((r) => (
                  <td key={r.role} className="px-3 py-2.5 text-center">
                    {r.permissions.includes(p) ? <Check className="mx-auto h-4 w-4 text-care-600" aria-label="Allowed" /> : <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="Not allowed" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-muted">Permissions are enforced by the server for every request, not just hidden in the menu.</p>
    </div>
  );
}

async function ActivityTab() {
  const { entries } = (await apiGet<{ entries: AuditEntry[] }>("/admin/audit"))!;
  return (
    <div className="card overflow-hidden">
      {entries.length === 0 ? (
        <p className="p-6 text-sm text-ink-muted">No staff changes recorded yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3 text-sm">
              <span>
                <span className="font-medium">{e.summary}</span>
                <span className="block text-xs text-ink-muted">by {e.actorName}</span>
              </span>
              <span className="text-xs text-ink-muted">{formatDateTime(e.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
