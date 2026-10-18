import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { requireRider } from "@/lib/server-api";
import { SignOutButton } from "@/components/layout/header";

export const metadata: Metadata = { title: "Rider · MGK Pharmacy", robots: { index: false } };
export const viewport: Viewport = { themeColor: "#0f172a" };

export default async function RiderLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRider();
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <Link href="/rider" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 font-display font-extrabold">+</span>
            <span className="leading-none">
              <span className="block font-display font-extrabold">MGK Rider</span>
              <span className="text-xs text-slate-400">Hi, {user.firstName}</span>
            </span>
          </Link>
          <SignOutButton className="!w-auto !text-slate-300 hover:!bg-white/10 hover:!text-white" />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-xl px-4 py-5">{children}</main>
    </div>
  );
}
