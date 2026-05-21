import React from "react";
import Link from "next/link";
import { getAdminDB } from "@/services/db";
import { cn, relativeTime } from "@/lib/utils";
import {
  Webhook, CheckCircle2, XCircle, Clock, Search,
} from "lucide-react";
import {
  StatusPill, ProviderLogo,
  PageHeader, EmptyState, FilterChip, RowArrow,
} from "@/components/ui/admin";

export const dynamic = "force-dynamic";

type StatusFilter = "all" | "received" | "processing" | "completed" | "failed";

export default async function WebhookEventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: StatusFilter;
    provider?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "all";
  const provider = params.provider ?? "all";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 50;

  const admin = getAdminDB();

  let query = admin
    .from("webhook_events")
    .select(
      "id, provider, idempotency_key, status, error, order_id, created_at, updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status !== "all") query = query.eq("status", status);
  if (provider !== "all") query = query.eq("provider", provider);

  // Stats over last 24h
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const [{ data: events, count }, { data: statsData }] = await Promise.all([
    query,
    admin.from("webhook_events").select("status, provider").gte("created_at", dayAgo),
  ]);

  const list = (events ?? []) as any[];
  const stats = (statsData ?? []) as any[];

  const total24h = stats.length;
  const success24h = stats.filter((e) => e.status === "completed").length;
  const failed24h = stats.filter((e) => e.status === "failed").length;
  const successRate = total24h > 0 ? (success24h / total24h) * 100 : 0;

  const providers = ["all", "flutterwave", "pesapal", "paypal", "nowpayments", "pawapay"];
  const statuses: StatusFilter[] = ["all", "received", "processing", "completed", "failed"];

  const qs = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    if (status !== "all") u.set("status", status);
    if (provider !== "all") u.set("provider", provider);
    Object.entries(over).forEach(([k, v]) => {
      if (v === "all" || v === "") u.delete(k);
      else u.set(k, v);
    });
    const s = u.toString();
    return s ? `?${s}` : "";
  };

  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/payments"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        ← Back to payments
      </Link>

      <PageHeader
        eyebrow="Admin · Payments"
        title="Webhook events"
        subtitle={`${count?.toLocaleString() ?? 0} events · ${successRate.toFixed(0)}% success rate (24h)`}
      />

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="24h events" value={total24h.toLocaleString()} icon={Webhook} />
        <StatTile label="Successful" value={success24h.toLocaleString()} icon={CheckCircle2} tone="success" />
        <StatTile label="Failed" value={failed24h.toLocaleString()} icon={XCircle} tone={failed24h > 0 ? "danger" : "default"} />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mr-1">Status</span>
          {statuses.map((s) => (
            <FilterChip
              key={s}
              label={s === "all" ? "All" : s}
              href={`/admin/payments/webhooks${qs({ status: s, page: "1" })}`}
              active={status === s}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mr-1">Provider</span>
          {providers.map((p) => (
            <FilterChip
              key={p}
              label={p === "all" ? "All" : p}
              href={`/admin/payments/webhooks${qs({ provider: p, page: "1" })}`}
              active={provider === p}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            icon={<Webhook className="w-6 h-6 text-[var(--color-text-muted)]" />}
            title="No webhook events"
            message="Events will appear here as providers call back."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="bg-[var(--color-surface-secondary)]/50">
                  <tr>
                    <Th>When</Th>
                    <Th>Provider</Th>
                    <Th>Idempotency key</Th>
                    <Th>Status</Th>
                    <Th>Order</Th>
                    <Th>Error</Th>
                    <Th>{""}</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((e: any) => (
                    <tr key={e.id} className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-secondary)]/40 transition-colors">
                      <td className="px-3 py-3 pl-5 text-[var(--color-text-muted)] whitespace-nowrap" title={e.created_at}>
                        {relativeTime(e.created_at)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <ProviderLogo provider={e.provider} size="sm" />
                          <span className="text-[var(--color-text-secondary)] capitalize hidden sm:inline">
                            {e.provider}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-[var(--color-text-muted)] truncate max-w-[280px]" title={e.idempotency_key}>
                        {e.idempotency_key ?? e.id.slice(0, 18)}
                      </td>
                      <td className="px-3 py-3"><StatusPill status={e.status} /></td>
                      <td className="px-3 py-3">
                        {e.order_id ? (
                          <Link
                            href={`/admin/orders/${e.order_id}`}
                            className="font-mono text-[11px] text-orange-500 hover:underline"
                          >
                            {e.order_id.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-rose-600 truncate max-w-[200px]" title={e.error ?? ""}>
                        {e.error ?? "—"}
                      </td>
                      <td className="px-3 py-3 pr-5 text-right">
                        <details>
                          <summary className="cursor-pointer text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                            View payload
                          </summary>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
                <p className="text-[11.5px] text-[var(--color-text-muted)] tabular-nums">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  {page > 1 && (
                    <Link
                      href={`/admin/payments/webhooks${qs({ page: String(page - 1) })}`}
                      className="h-8 px-3 rounded-md text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                    >
                      Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/admin/payments/webhooks${qs({ page: String(page + 1) })}`}
                      className="h-8 px-3 rounded-md text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label, value, icon: Icon, tone = "default",
}: {
  label: string; value: string; icon: React.ElementType;
  tone?: "default" | "success" | "danger";
}) {
  const iconTone = {
    default: "text-[var(--color-text-muted)]",
    success: "text-emerald-600",
    danger: "text-rose-600",
  }[tone];
  return (
    <div className="p-4 rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">{label}</p>
        <Icon className={cn("h-3.5 w-3.5", iconTone)} />
      </div>
      <p className="text-xl font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)] mt-1.5">{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="font-medium text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] px-3 py-3 text-left">
      {children}
    </th>
  );
}