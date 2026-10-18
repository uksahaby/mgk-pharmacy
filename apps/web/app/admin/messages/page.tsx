import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { MarkHandled } from "./mark-handled";

export const metadata: Metadata = { title: "Messages" };

type Message = { id: string; name: string; email: string; phone: string | null; topic: string; message: string; handled: boolean; createdAt: string };

const TOPICS: Record<string, string> = { ORDER: "Order", PRESCRIPTION: "Prescription", PRODUCT: "Product", FEEDBACK: "Feedback", OTHER: "Other" };

export default async function MessagesPage() {
  const data = await apiGet<{ messages: Message[] }>("/admin/messages");
  const list = data?.messages ?? [];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Messages</h1>
      {list.length === 0 ? (
        <EmptyState icon={<Inbox className="h-7 w-7" />} title="No messages" />
      ) : (
        <ul className="space-y-3">
          {list.map((m) => (
            <li key={m.id} className={`card p-5 ${m.handled ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{m.name} <span className="chip ml-1 bg-slate-100 text-ink-soft">{TOPICS[m.topic] ?? m.topic}</span></p>
                  <p className="text-xs text-ink-muted">
                    <a href={`mailto:${m.email}`} className="hover:underline">{m.email}</a>
                    {m.phone && ` · ${m.phone}`} · {formatDateTime(m.createdAt)}
                  </p>
                </div>
                {!m.handled ? <MarkHandled id={m.id} /> : <span className="chip bg-care-100 text-care-700">Handled</span>}
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
