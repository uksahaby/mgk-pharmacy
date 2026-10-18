"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { api } from "@/lib/client-api";

export function MarkHandled({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      className="btn-outline btn-sm"
      onClick={async () => {
        await api(`/admin/messages/${id}/handled`, { method: "POST" }).catch(() => null);
        router.refresh();
      }}
    >
      <Check className="h-3.5 w-3.5" aria-hidden /> Mark handled
    </button>
  );
}
