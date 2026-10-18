import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server-api";
import { AccountNav } from "./account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  if (user.role === "RIDER") redirect("/rider"); // riders have no customer area
  return (
    <div className="container py-8">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <AccountNav user={user} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
