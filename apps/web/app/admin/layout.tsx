import type { Metadata } from "next";
import { requireStaff } from "@/lib/server-api";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "Pharmacy dashboard", template: "%s · MGK Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[248px_1fr]">
      <AdminNav user={user} />
      <main id="main" className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
