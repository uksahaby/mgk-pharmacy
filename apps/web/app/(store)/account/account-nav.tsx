"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BadgeCheck, FileText, Home, LayoutDashboard, MapPin, Package, UserCog } from "lucide-react";
import { can, type User } from "@/lib/types";
import { SignOutButton } from "@/components/layout/header";

const LINKS = [
  { href: "/account", label: "Overview", icon: Home },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/account/verification", label: "Identity verification", icon: BadgeCheck },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile & security", icon: UserCog },
];

export function AccountNav({ user }: { user: User }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/account" ? pathname === href : pathname.startsWith(href));
  return (
    <aside className="lg:sticky lg:top-40 lg:self-start">
      <div className="mb-4 hidden items-center gap-3 lg:flex">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-100 font-bold text-brand-800">
          {user.firstName[0]}
          {user.lastName[0]}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-xs text-ink-muted">{user.email}</p>
        </div>
      </div>
      <nav aria-label="Account" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-none lg:mx-0 lg:flex-col lg:px-0">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={clsx(
              "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition",
              isActive(href) ? "bg-ink text-white" : "text-ink-soft hover:bg-white hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </Link>
        ))}
        {can(user, "dashboard.view") && (
          <Link href="/admin" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-white">
            <LayoutDashboard className="h-4 w-4" aria-hidden /> Pharmacy dashboard
          </Link>
        )}
        <div className="hidden lg:block">
          <SignOutButton className="!py-2.5 font-medium" />
        </div>
      </nav>
    </aside>
  );
}
