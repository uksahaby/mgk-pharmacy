import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser, homeFor } from "@/lib/server-api";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getUser();
  if (user) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : homeFor(user));
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to track orders, manage prescriptions and check out faster.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
