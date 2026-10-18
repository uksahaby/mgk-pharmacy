import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/server-api";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getUser()) redirect("/account");
  return (
    <AuthShell title="Create your account" subtitle="It takes under a minute. You'll need an account to order prescription medicines.">
      <RegisterForm next={next} />
    </AuthShell>
  );
}
