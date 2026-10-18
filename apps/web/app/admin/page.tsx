import Link from "next/link";
import { AlertTriangle, BadgeCheck, Banknote, Boxes, CalendarClock, FileText, Inbox, PackageOpen, Receipt } from "lucide-react";
import { apiGet, requireStaff } from "@/lib/server-api";
import { can, type Order, type OrderStatus } from "@/lib/types";
import { formatNaira, orderStatusLabel, pluralize } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/roles";
import { OrdersTable } from "@/components/admin/orders-table";
import { Alert } from "@/components/ui";

type QueueKey = "rxPending" | "verifPending" | "proofPending" | "lowStock" | "neverStocked" | "expiringBatches" | "messages";
type Summary = {
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  today: { revenueKobo: number; orders: number } | null;
  last30: { revenueKobo: number; orders: number } | null;
  /** null means this role can't act on that queue, so it isn't shown. */
  queues: Record<QueueKey, number | null>;
  recentOrders: Order[];
};

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const [user, { denied }] = await Promise.all([requireStaff(), searchParams]);
  const s = (await apiGet<Summary>("/admin/summary"))!;
  const allQueues: { href: string; label: string; key: QueueKey; icon: typeof FileText; alert: boolean }[] = [
    { href: "/admin/prescriptions", label: "Prescriptions to review", key: "rxPending", icon: FileText, alert: true },
    { href: "/admin/orders?queue=proof", label: "Transfer receipts to confirm", key: "proofPending", icon: Receipt, alert: true },
    { href: "/admin/verifications", label: "ID verifications", key: "verifPending", icon: BadgeCheck, alert: true },
    { href: "/admin/inventory", label: "Running low (10 or fewer)", key: "lowStock", icon: Boxes, alert: true },
    { href: "/admin/products?stock=never", label: "Listed but never stocked", key: "neverStocked", icon: PackageOpen, alert: false },
    { href: "/admin/inventory", label: "Batches expiring ≤ 90 days", key: "expiringBatches", icon: CalendarClock, alert: false },
    { href: "/admin/messages", label: "Unread messages", key: "messages", icon: Inbox, alert: true },
  ];
  // Only the queues this role can act on; shown in red only when something is waiting.
  const queues = allQueues
    .filter((q) => s.queues[q.key] !== null)
    .map((q) => ({ ...q, value: s.queues[q.key] as number, urgent: q.alert && (s.queues[q.key] as number) > 0 }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-ink-muted">
          Welcome, {user.firstName}. Signed in as {ROLE_LABEL[user.role].toLowerCase()}.
        </p>
      </div>

      {denied && (
        <Alert tone="warning" title="That page isn't available for your role">
          Ask an administrator if you need access.
        </Alert>
      )}

      {s.today && s.last30 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Revenue today" value={formatNaira(s.today.revenueKobo)} sub={pluralize(s.today.orders, "paid order")} icon={<Banknote className="h-5 w-5" />} />
          <Kpi label="Revenue, last 30 days" value={formatNaira(s.last30.revenueKobo)} sub={pluralize(s.last30.orders, "paid order")} icon={<Banknote className="h-5 w-5" />} />
          <Kpi label="Being prepared" value={String(s.ordersByStatus.PROCESSING ?? 0)} sub="Paid, ready to pack" icon={<Boxes className="h-5 w-5" />} />
          <Kpi label="Awaiting payment" value={String(s.ordersByStatus.AWAITING_PAYMENT ?? 0)} sub="Auto-cancel after 48h" icon={<AlertTriangle className="h-5 w-5" />} />
        </div>
      )}

      {queues.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted">Work queues</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {queues.map(({ href, label, value, icon: Icon, urgent }) => (
              <Link key={label} href={href} className="card flex items-center gap-4 p-4 transition hover:shadow-lift">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${urgent ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-ink-soft"}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="flex-1 text-sm font-medium">{label}</span>
                <span className={`font-display text-2xl font-bold ${urgent ? "text-brand-600" : "text-ink"}`}>{value.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {can(user, "orders.view") && (
        <>
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold">Latest orders</h2>
              <Link href="/admin/orders" className="text-sm font-semibold text-brand-700 hover:underline">All orders</Link>
            </div>
            <OrdersTable orders={s.recentOrders} />
          </section>
          <section className="flex flex-wrap gap-2 text-xs text-ink-muted">
            {Object.entries(s.ordersByStatus).map(([k, v]) => (
              <Link key={k} href={`/admin/orders?status=${k}`} className="chip bg-white px-3 py-1 ring-1 ring-slate-200 hover:ring-slate-300">
                {orderStatusLabel[k as OrderStatus]}: <strong className="text-ink">{v}</strong>
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between text-ink-muted">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-ink-muted">{sub}</p>
    </div>
  );
}
