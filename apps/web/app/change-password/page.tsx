import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getUser, homeFor } from "@/lib/server-api";
import { Logo } from "@/components/layout/logo";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Set your password", robots: { index: false } };

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [user, { next }] = await Promise.all([getUser(), searchParams]);
  if (!user) redirect("/login");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : homeFor(user);
  if (!user.mustChangePassword) redirect(safeNext);
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-6 sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-bold">Welcome, {user.firstName}. Choose your password</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            You signed in with a temporary password from an administrator. Set your own private password to continue. Nobody else will know it.
          </p>
          <SetPasswordForm next={safeNext} />
        </div>
      </div>
    </main>
  );
}
