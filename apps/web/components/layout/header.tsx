"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  BadgeCheck,
  ChevronDown,
  FileUp,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Search,
  ShoppingBag,
  Truck,
  User as UserIcon,
  X,
} from "lucide-react";
import { can, type Category, type User } from "@/lib/types";
import { site } from "@/lib/site";
import { useCart } from "@/components/cart/cart-provider";
import { CategoryIcon } from "@/components/category-icon";
import { api } from "@/lib/client-api";
import { Logo } from "./logo";

export function Header({ user, categories }: { user: User | null; categories: Category[] }) {
  const { count, ready } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>

      <div className="hidden bg-ink text-[13px] text-slate-300 md:block">
        <div className="container flex h-9 items-center justify-between">
          <p className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-care-500" aria-hidden />
            Free delivery on orders over ₦50,000 · Same-day delivery in Kano
          </p>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-care-500" aria-hidden /> PCN-licensed pharmacy
            </span>
            <a href={site.whatsapp} className="flex items-center gap-1.5 font-medium text-white hover:underline" target="_blank" rel="noreferrer">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden /> Chat with a pharmacist
            </a>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="container flex h-16 items-center gap-3 md:h-[72px] md:gap-6">
          <button className="-ml-2 rounded-full p-2 text-ink lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
          <Logo />
          <SearchBar className="hidden flex-1 md:flex" />
          <nav className="ml-auto flex items-center gap-1 sm:gap-2" aria-label="Account and cart">
            <Link href="/account/prescriptions" className="btn-ghost hidden xl:inline-flex">
              <FileUp className="h-4 w-4" aria-hidden /> Upload prescription
            </Link>
            <AccountMenu user={user} />
            <Link href="/cart" className="relative rounded-full p-2.5 text-ink hover:bg-slate-100" aria-label={`Cart, ${count} items`}>
              <ShoppingBag className="h-6 w-6" />
              {ready && count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white ring-2 ring-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          </nav>
        </div>
        <div className="container pb-3 md:hidden">
          <SearchBar />
        </div>
        <nav className="hidden border-t border-slate-100 lg:block" aria-label="Categories">
          <div className="container flex h-12 items-center gap-1 overflow-x-auto scrollbar-none">
            <Link href="/shop" className={clsx("whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold", pathname === "/shop" ? "bg-ink text-white" : "text-ink hover:bg-slate-100")}>
              All products
            </Link>
            {categories.slice(0, 6).map((c) => {
              const href = `/category/${c.slug}`;
              return (
                <Link
                  key={c.slug}
                  href={href}
                  className={clsx(
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium",
                    pathname === href ? "bg-ink text-white" : "text-ink-soft hover:bg-slate-100 hover:text-ink",
                  )}
                >
                  {c.name}
                </Link>
              );
            })}
            <Link href="/shop" className="ml-auto whitespace-nowrap px-3 py-1.5 text-sm font-semibold text-brand-700 hover:underline">
              More categories
            </Link>
          </div>
        </nav>
      </div>

      {mobileOpen && <MobileMenu user={user} categories={categories} onClose={() => setMobileOpen(false)} />}
    </header>
  );
}

function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={clsx("relative w-full max-w-2xl", className)}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
      }}
    >
      <label htmlFor="site-search" className="sr-only">
        Search medicines and health products
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        id="site-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by brand or generic name, e.g. Coartem, metformin"
        className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 pl-12 pr-28 text-sm text-ink placeholder:text-slate-400 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
      />
      <button type="submit" className="btn-primary btn-sm absolute right-1.5 top-1/2 h-9 -translate-y-1/2 px-4">
        Search
      </button>
    </form>
  );
}

function AccountMenu({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  if (!user) {
    return (
      <Link href="/login" className="btn-ghost px-3" aria-label="Sign in">
        <UserIcon className="h-5 w-5" aria-hidden /> <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }
  const staff = can(user, "dashboard.view");
  return (
    <div className="relative">
      <button className="btn-ghost px-3" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
          {user.firstName[0]}
          {user.lastName[0]}
        </span>
        <span className="hidden max-w-[8rem] truncate sm:inline">{user.firstName}</span>
        <ChevronDown className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" aria-hidden tabIndex={-1} onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 z-20 mt-2 w-60 animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-ink-muted">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-slate-100" />
            {staff && <MenuLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />}>Pharmacy dashboard</MenuLink>}
            {can(user, "deliveries.ride") && <MenuLink href="/rider" icon={<Truck className="h-4 w-4" />}>Rider app</MenuLink>}
            <MenuLink href="/account" icon={<UserIcon className="h-4 w-4" />}>My account</MenuLink>
            <MenuLink href="/account/orders" icon={<Package className="h-4 w-4" />}>Orders</MenuLink>
            <MenuLink href="/account/prescriptions" icon={<FileUp className="h-4 w-4" />}>Prescriptions</MenuLink>
            <div className="my-1 h-px bg-slate-100" />
            <SignOutButton />
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} role="menuitem" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-slate-50 hover:text-ink">
      {icon}
      {children}
    </Link>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      role="menuitem"
      className={clsx("flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-ink-soft hover:bg-slate-50 hover:text-ink", className)}
      onClick={async () => {
        await api("/auth/logout", { method: "POST" }).catch(() => null);
        window.location.href = "/";
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden /> Sign out
    </button>
  );
}

function MobileMenu({ user, categories, onClose }: { user: User | null; categories: Category[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-label="Close menu" />
      <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-fade-up flex-col overflow-y-auto bg-white shadow-lift">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <Logo />
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-1 p-3">
          <Link href={user ? "/account" : "/login"} className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold hover:bg-slate-50">
            <UserIcon className="h-5 w-5" /> {user ? `Hi, ${user.firstName}` : "Sign in or create account"}
          </Link>
          <Link href="/account/prescriptions" className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold hover:bg-slate-50">
            <FileUp className="h-5 w-5" /> Upload a prescription
          </Link>
          <Link href="/track" className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold hover:bg-slate-50">
            <Truck className="h-5 w-5" /> Track an order
          </Link>
        </div>
        <p className="px-6 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Shop by category</p>
        <div className="space-y-0.5 px-3 pb-6">
          {categories.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-slate-50 hover:text-ink">
              <CategoryIcon icon={c.icon} className="h-4 w-4" /> {c.name}
            </Link>
          ))}
        </div>
        <div className="mt-auto border-t border-slate-100 p-4">
          <a href={site.whatsapp} target="_blank" rel="noreferrer" className="btn-care w-full">
            <MessageCircle className="h-4 w-4" /> Chat with a pharmacist
          </a>
        </div>
      </div>
    </div>
  );
}
