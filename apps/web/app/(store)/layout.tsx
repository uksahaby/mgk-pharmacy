import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { redirect } from "next/navigation";
import { apiGet, getUser } from "@/lib/server-api";
import type { Category } from "@/lib/types";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [user, cats] = await Promise.all([getUser(), apiGet<{ categories: Category[] }>("/categories").catch(() => null)]);
  // Accounts created or reset by an admin must set their own password first.
  if (user?.mustChangePassword) redirect("/change-password");
  return (
    <>
      <Header user={user} categories={cats?.categories ?? []} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
    </>
  );
}
