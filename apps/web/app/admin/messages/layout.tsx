import { requirePermission } from "@/lib/server-api";

export default async function Guard({ children }: { children: React.ReactNode }) {
  await requirePermission("messages.view");
  return children;
}
