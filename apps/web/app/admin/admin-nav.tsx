"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BadgeCheck, Boxes, ExternalLink, FileText, Gauge, Inbox, Package, Pill, ShieldCheck, Users } from "lucide-react";
import { can, type Permission, type User } from "@/lib/types";
import { SignOutButton } from "@/components/layout/header";
import { ROLE_LABEL } from "@/lib/roles";

const LINKS: { href: string; label: string; icon: typeof Gauge; permission: Permission }[] = [
  { href: "/admin", label: "Overview", icon: Gauge, permission: "dashboard.view" },
  { href: "/admin/orders", label: "Orders", icon: Package, permission: "orders.view" },
  { href: "/admin/prescriptions", label: "Prescriptions", icon: FileText, permission: "prescriptions.review" },
  { href: "/admin/verifications", label: "Verifications", icon: BadgeCheck, permission: "verifications.review" },
  { href: "/admin/products", label: "Products", icon: Pill, permission: "products.manage" },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, permission: "inventory.manage" },
  { href: "/admin/customers", label: "Customers", icon: Users, permission: "customers.view" },
  { href: "/admin/messages", label: "Messages", icon: Inbox, permission: "messages.view" },
  { href: "/admin/staff", label: "Staff & roles", icon: ShieldCheck, permission: "staff.manage" },
];

export function AdminNav({ user }: { user: User }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  return (
    <aside className="bg-ink text-slate-300 lg:sticky lg:top-0 lg:h-screen">
      <div className="flex items-center justify-between gap-3 px-5 py-5">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 font-display text-sm font-extrabold text-white">+</span>
          <span className="leading-none">
            <span className="block font-display text-lg font-extrabold text-white">MGK</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pharmacy admin</span>
          </span>
        </Link>
      </div>
      <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 scrollbar-none lg:flex-col lg:overflow-visible">
        {LINKS.filter((l) => can(user, l.permission)).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={clsx(
              "flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active(href) ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </Link>
        ))}
      </nav>
      <div className="hidden border-t border-white/10 p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
        <p className="truncate text-sm font-semibold text-white">{user.firstName} {user.lastName}</p>
        <p className="text-xs text-slate-500">{ROLE_LABEL[user.role]}</p>
        <Link href="/" className="mt-3 flex items-center gap-2 text-xs text-slate-400 hover:text-white">
          <ExternalLink className="h-3.5 w-3.5" aria-hidden /> View store
        </Link>
        <SignOutButton className="!mt-1 !px-0 !text-xs !text-slate-400 hover:!bg-transparent hover:!text-white" />
      </div>
    </aside>
  );
}
